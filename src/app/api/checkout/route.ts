import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/siteConfig";
import { PURCHASABLE } from "@/lib/catalogue";
import ProductModel from "@/models/Product";
import { checkDeliveryPostcode } from "@/lib/delivery";
import { findUsablePromo } from "@/lib/promos";
import { applyPromo } from "@/lib/promoPricing";
import { formatPrice } from "@/lib/money";

const bodySchema = z.object({
  items: z
    .array(z.object({ productId: z.string().refine(isValidObjectId), quantity: z.number().int().min(1).max(20) }))
    .min(1)
    .max(30),
  delivery: z.object({
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    name: z.string().trim().min(2, "Enter the name for delivery").max(80),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a phone number the courier can call"),
    line1: z.string().trim().min(2, "Enter the first line of your address").max(100),
    line2: z.string().trim().max(100).default(""),
    city: z.string().trim().min(2, "Enter your town or city").max(60),
    postcode: z.string().trim().max(10),
  }),
  promoCode: z.string().trim().max(40).optional(),
  /** "buy_now" skips the basket: it's left untouched after payment. */
  mode: z.enum(["basket", "buy_now"]).default("basket"),
});

// Builds the Stripe Checkout session from the database, never from what
// the browser says: prices, names and availability are all re-read here.
// The delivery address is collected on our checkout page (postcode checked
// against mainland UK) and handed to Stripe, which doesn't ask for it again.
// Each line item carries its productId in product metadata; the webhook
// reads the paid lines back from Stripe (no basket in session metadata,
// which Stripe caps at 500 characters per value).
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path[0] === "delivery");
    return NextResponse.json({ error: issue?.message ?? "Your order couldn't be read. Refresh and try again." }, { status: 400 });
  }
  const { delivery: d, mode } = parsed.data;

  const pc = checkDeliveryPostcode(d.postcode);
  if (!pc.ok) {
    const msg = pc.reason === "invalid" ? "Enter a valid UK postcode." : `Sorry, we can't deliver to ${pc.postcode}. We deliver to mainland UK only.`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await connectDB();
  const ids = parsed.data.items.map((i) => i.productId);
  const products = await ProductModel.find({ _id: { $in: ids }, status: "published" }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lineItems = [];
  for (const item of parsed.data.items) {
    const p = byId.get(item.productId);
    if (!p) return NextResponse.json({ error: "Something in your basket is no longer sold. Remove it and try again." }, { status: 400 });
    if (!PURCHASABLE.includes(p.availability as (typeof PURCHASABLE)[number])) {
      return NextResponse.json({ error: `${p.name} is currently out of stock. Remove it to continue.` }, { status: 409 });
    }
    const image = (p.images as { url: string }[] | undefined)?.[0]?.url;
    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: "gbp",
        unit_amount: p.price as number,
        product_data: {
          name: p.name as string,
          images: image?.startsWith("https://") ? [image] : undefined,
          metadata: { productId: String(p._id) },
        },
      },
    });
  }

  // Promo code: re-checked and recalculated here, whatever the browser
  // showed. Stripe gets a single-use coupon for the exact amount off, so its
  // page shows the discount line with the code's name.
  let discounts: { coupon: string }[] | undefined;
  let promo: { code: string; discount: number } | undefined;
  if (parsed.data.promoCode) {
    const found = await findUsablePromo(parsed.data.promoCode, d.email);
    if (!found.ok) return NextResponse.json({ error: found.message, promo: true }, { status: 400 });
    const lines = parsed.data.items.map((i) => {
      const p = byId.get(i.productId)!;
      return { productId: i.productId, category: p.category as string, price: p.price as number, quantity: i.quantity };
    });
    const outcome = applyPromo(found.rule, lines, formatPrice);
    if (!outcome.ok) return NextResponse.json({ error: outcome.message, promo: true }, { status: 400 });
    promo = { code: found.rule.code, discount: outcome.discount };
    try {
      const coupon = await stripe.coupons.create({
        amount_off: outcome.discount,
        currency: "gbp",
        duration: "once",
        max_redemptions: 1,
        redeem_by: Math.floor(Date.now() / 1000) + 25 * 3600,
        name: found.rule.code.slice(0, 40),
        metadata: { promoCode: found.rule.code },
      });
      discounts = [{ coupon: coupon.id }];
    } catch (e) {
      console.error("[checkout] Stripe coupon creation failed:", (e as Error).message);
      return NextResponse.json({ error: "We couldn't apply your code just now. Try again, or remove it to continue." }, { status: 502 });
    }
  }

  // Back from Stripe without paying: return to the same checkout.
  const first = parsed.data.items[0];
  const cancelQuery = mode === "buy_now" && first ? `?buy=${encodeURIComponent(String(byId.get(first.productId)?.slug ?? ""))}&qty=${first.quantity}` : "";

  // Payment methods (card, Klarna, Clearpay...) come from the Stripe
  // Dashboard settings, not from code.
  let session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: d.email,
    discounts,
    payment_intent_data: {
      shipping: {
        name: d.name,
        phone: d.phone,
        address: { line1: d.line1, line2: d.line2 || undefined, city: d.city, postal_code: pc.postcode, country: "GB" },
      },
    },
    // The order is built from these (Stripe caps each value at 500 chars).
    metadata: {
      mode,
      deliveryName: d.name,
      deliveryPhone: d.phone,
      deliveryLine1: d.line1,
      deliveryLine2: d.line2,
      deliveryCity: d.city,
      deliveryPostcode: pc.postcode,
      promoCode: promo?.code ?? "",
      promoDiscount: promo ? String(promo.discount) : "",
    },
    success_url: `${siteConfig.url}/success?session_id={CHECKOUT_SESSION_ID}${mode === "buy_now" ? "&buy_now=1" : ""}`,
    cancel_url: `${siteConfig.url}/checkout${cancelQuery}`,
    });
  } catch (e) {
    // Most likely a Stripe configuration problem (bad key, account not
    // activated). Log it for us; the customer gets a plain message.
    console.error("[checkout] Stripe session creation failed:", (e as Error).message);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again shortly, or contact us." }, { status: 502 });
  }

  if (!session.url) return NextResponse.json({ error: "Checkout couldn't start. Try again in a moment." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
