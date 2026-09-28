import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/siteConfig";
import { packComponentIds, resolveLine, resolvePack } from "@/lib/productLines";
import ProductModel from "@/models/Product";
import { checkDeliveryPostcode, postcodeMessage } from "@/lib/delivery";
import { getShopSettings } from "@/lib/shop/server";
import { findUsablePromo } from "@/lib/promos";
import { applyPromo } from "@/lib/promoPricing";
import { formatPrice } from "@/lib/money";

const bodySchema = z.object({
  items: z
    .array(z.object({
        productId: z.string().refine(isValidObjectId),
        variantId: z.string().max(200).optional(),
        /** A pack: the variant chosen for each piece. */
        choices: z.array(z.string().max(200)).max(12).optional(),
        quantity: z.number().int().min(1).max(20),
      }))
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
// against the shop's delivery area) and handed to Stripe, which doesn't ask for it again.
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

  await connectDB();
  const { delivery: shipping } = await getShopSettings();
  const pc = checkDeliveryPostcode(d.postcode, shipping.area);
  if (!pc.ok) return NextResponse.json({ error: postcodeMessage(pc, shipping.area) }, { status: 400 });

  const ids = parsed.data.items.map((i) => i.productId);
  const products = await ProductModel.find({ _id: { $in: ids }, status: "published" }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const components = new Map((await ProductModel.find({ _id: { $in: packComponentIds(products) } }).lean()).map((p) => [String(p._id), p]));

  const lineItems = [];
  const resolved = [];
  for (const item of parsed.data.items) {
    const p = byId.get(item.productId);
    if (!p) return NextResponse.json({ error: "Something in your basket is no longer sold. Remove it and try again." }, { status: 400 });
    if ((p.packSlots ?? []).length) {
      const pack = resolvePack(p, components, item.choices);
      if (!pack.ok) {
        const error =
          pack.reason === "needs_choice"
            ? `Choose the options for each piece of ${p.name} on its page, then add it again.`
            : `${p.name} has changed since you added it. Remove it and choose again.`;
        return NextResponse.json({ error }, { status: 409 });
      }
      if (!pack.purchasable) return NextResponse.json({ error: `Something in ${p.name} is out of stock. Remove it or choose other options.` }, { status: 409 });
      resolved.push({ item, p, line: { ok: true as const, price: pack.price } });
      const image = (p.images as { url: string }[] | undefined)?.[0]?.url;
      const choices = (item.choices ?? []).join("|");
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: pack.price,
          product_data: {
            name: pack.name.slice(0, 250),
            images: image?.startsWith("https://") ? [image] : undefined,
            // Stripe caps metadata values at 500 characters; variant ids are short.
            metadata: { productId: String(p._id), ...(choices && { packChoices: choices.slice(0, 500) }) },
          },
        },
      });
      continue;
    }
    const line = resolveLine(p, item.variantId);
    if (!line.ok) {
      const error =
        line.reason === "needs_choice"
          ? `Choose the options for ${p.name} on its page, then add it again.`
          : `The options you chose for ${p.name} are no longer sold. Remove it and choose again.`;
      return NextResponse.json({ error }, { status: 409 });
    }
    if (!line.purchasable) return NextResponse.json({ error: `${line.name} is currently out of stock. Remove it to continue.` }, { status: 409 });
    resolved.push({ item, p, line });
    const image = (p.images as { url: string }[] | undefined)?.[0]?.url;
    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: "gbp",
        unit_amount: line.price,
        product_data: {
          name: line.name,
          images: image?.startsWith("https://") ? [image] : undefined,
          metadata: { productId: String(p._id), ...(line.variantId && { variantId: line.variantId }) },
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
    const lines = resolved.map(({ item, p, line }) => ({ productId: item.productId, category: p.category as string, price: line.price, quantity: item.quantity }));
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
  const cancelQuery =
    mode === "buy_now" && first
      ? `?buy=${encodeURIComponent(String(byId.get(first.productId)?.slug ?? ""))}&qty=${first.quantity}${first.variantId ? `&v=${encodeURIComponent(first.variantId)}` : ""}${first.choices?.length ? `&p=${encodeURIComponent(first.choices.join("|"))}` : ""}`
      : "";

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
