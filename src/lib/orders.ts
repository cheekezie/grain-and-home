import "server-only";
import type Stripe from "stripe";
import { connectDB } from "./db";
import { stripe } from "./stripe";
import OrderModel from "@/models/Order";
import ProductModel from "@/models/Product";
import SupplierModel from "@/models/Supplier";
import { nextSequence } from "@/models/Counter";
import PromoCodeModel from "@/models/PromoCode";
import { fetchStripeFee } from "./stripeFees";
import { confirmNewOrder } from "./mail/orderUpdates";

/**
 * Turn a paid Checkout session into an Order. Idempotent: Stripe retries
 * webhooks, and both `completed` and `async_payment_succeeded` can arrive
 * for the same session, so an existing order is left alone.
 */
export async function createOrderFromSession(session: Stripe.Checkout.Session): Promise<"created" | "exists" | "unpaid"> {
  if (session.payment_status !== "paid") return "unpaid";
  await connectDB();
  if (await OrderModel.exists({ stripeCheckoutId: session.id })) return "exists";

  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ["data.price.product"] });
  const productIds = lines.data
    .map((l) => (l.price?.product as Stripe.Product | undefined)?.metadata?.productId)
    .filter((id): id is string => !!id);
  const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const supplierIds = [...new Set(products.map((p) => p.supplier).filter(Boolean).map(String))];
  const suppliers = await SupplierModel.find({ _id: { $in: supplierIds } }).select("name").lean();
  const supplierName = new Map(suppliers.map((s) => [String(s._id), s.name as string]));

  const items = lines.data.map((l) => {
    const stripeProduct = l.price?.product as Stripe.Product | undefined;
    const p = byId.get(stripeProduct?.metadata?.productId ?? "");
    const quantity = l.quantity ?? 1;
    return {
      product: p?._id,
      slug: p?.slug,
      name: p?.name ?? l.description ?? stripeProduct?.name ?? "Item",
      image: (p?.images as { url: string }[] | undefined)?.[0]?.url,
      // What the customer actually paid per unit, from Stripe.
      unitPrice: Math.round((l.amount_total ?? 0) / quantity),
      listUnitPrice: Math.round((l.amount_subtotal ?? l.amount_total ?? 0) / quantity),
      quantity,
      supplier: p?.supplier ?? undefined,
      supplierName: p?.supplier ? supplierName.get(String(p.supplier)) : undefined,
      supplierSku: p?.supplierSku,
      supplierUrl: p?.supplierUrl,
      supplierCost: p?.supplierCost,
    };
  });

  // The address comes from our checkout form (session metadata); older
  // sessions that collected it on Stripe fall back to Stripe's copy.
  const m = session.metadata ?? {};
  const stripeShipping = session.collected_information?.shipping_details;
  const sa = stripeShipping?.address;
  const shippingAddress = m.deliveryLine1
    ? { name: m.deliveryName, line1: m.deliveryLine1, line2: m.deliveryLine2 || undefined, city: m.deliveryCity, postalCode: m.deliveryPostcode, country: "GB" }
    : sa
      ? { name: stripeShipping?.name, line1: sa.line1, line2: sa.line2, city: sa.city, postalCode: sa.postal_code, country: sa.country }
      : undefined;
  try {
    await OrderModel.create({
      number: await nextSequence("order"),
      stripeCheckoutId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      status: "paid",
      customerEmail: session.customer_details?.email ?? "unknown",
      customerName: m.deliveryName || session.customer_details?.name || stripeShipping?.name || undefined,
      customerPhone: m.deliveryPhone || session.customer_details?.phone || undefined,
      shippingAddress,
      items,
      total: session.amount_total ?? 0,
      promoCode: m.promoCode || undefined,
      discount: session.total_details?.amount_discount ?? 0,
      currency: session.currency ?? "gbp",
      events: [{ status: "paid", note: m.promoCode ? `Payment received via Stripe. Promo code ${m.promoCode} applied.` : "Payment received via Stripe." }],
    });
  } catch (e) {
    // Two deliveries racing past the exists() check: the unique index wins.
    if ((e as { code?: number }).code === 11000) return "exists";
    throw e;
  }
  // Record the real Stripe fee for profit reporting (if not settled yet,
  // the Insights page fills it in later).
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (piId) {
    const fee = await fetchStripeFee(piId);
    if (fee != null) await OrderModel.updateOne({ stripeCheckoutId: session.id }, { $set: { stripeFee: fee } });
  }
  // Count the redemption only once the order exists (so retries don't double count).
  if (m.promoCode) await PromoCodeModel.updateOne({ code: m.promoCode }, { $inc: { usedCount: 1 } });
  // Our own branded confirmation (Stripe's receipt covers the payment only).
  await confirmNewOrder(session.id);
  return "created";
}
