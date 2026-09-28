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
import { isPack, packComponentIds, resolveLine, resolvePack } from "./productLines";
import { imageFor } from "./variantImages";
import { CURRENCY } from "./money";

/** One line of a new order (see models/Order.ts). */
export interface OrderLine {
  product?: unknown;
  slug?: string;
  name: string;
  variant?: string;
  variantId?: string;
  packGroup?: string;
  packName?: string;
  image?: string;
  unitPrice: number;
  listUnitPrice: number;
  quantity: number;
  supplier?: unknown;
  supplierName?: string;
  supplierSku?: string | null;
  supplierUrl?: string | null;
  supplierCost?: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The product's photo for a chosen variant (its colour's photo if tagged). */
function photoFor(product: Record<string, any>, variantId?: string): string | undefined {
  const values = ((product.variants ?? []) as { id: string; values: string[] }[]).find((v) => v.id === variantId)?.values ?? [];
  return imageFor((product.images ?? []) as { url: string; forValue?: string }[], values)?.url;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Split `total` pence by `weights`, whole pence, with the remainder on the first share so the parts add up exactly. */
function share(total: number, weights: number[], i: number): number {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts[i];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Paid Stripe lines to order lines. Pure (no database or Stripe calls), so
 * the pack split can be tested. A pack becomes one line per piece.
 */
export function stripeLinesToItems(
  lines: Stripe.LineItem[],
  byId: Map<string, Record<string, any>>,
  components: Map<string, Record<string, any>>,
  supplierName: Map<string, string>,
): OrderLine[] {
  return lines.flatMap((l): OrderLine[] => {
    const stripeProduct = l.price?.product as Stripe.Product | undefined;
    const p = byId.get(stripeProduct?.metadata?.productId ?? "");
    const quantity = l.quantity ?? 1;
    const paid = Math.round((l.amount_total ?? 0) / quantity);
    const list = Math.round((l.amount_subtotal ?? l.amount_total ?? 0) / quantity);

    // A pack becomes one order line per piece, so each is ordered from its
    // own supplier with its own reference and tracking. What was paid for the
    // pack is shared across the pieces in proportion to their own prices.
    const pack = p && isPack(p) ? resolvePack(p, components, (stripeProduct?.metadata?.packChoices ?? "").split("|")) : null;
    if (p && pack?.ok) {
      const packGroup = `${String(p._id)}-${l.id}`;
      const weights = pack.pieces.map((x) => x.line.price || 1);
      return pack.pieces.map(({ product: c, line }, i) => ({
        product: c._id,
        slug: c.slug,
        name: `${p.name}: ${pack.labels[i]}`,
        variant: line.variant,
        variantId: line.variantId,
        packGroup,
        packName: p.name as string,
        image: photoFor(c, line.variantId),
        unitPrice: share(paid, weights, i),
        listUnitPrice: share(list, weights, i),
        quantity,
        supplier: c.supplier ?? undefined,
        supplierName: c.supplier ? supplierName.get(String(c.supplier)) : undefined,
        supplierSku: line.supplierSku,
        supplierUrl: c.supplierUrl,
        supplierCost: line.supplierCost,
      }));
    }
    // The chosen variant's supplier code and cost (or the product's).
    const line = p ? resolveLine(p, stripeProduct?.metadata?.variantId || undefined) : null;
    const v = line?.ok ? line : null;
    return [{
      product: p?._id,
      slug: p?.slug,
      // Stripe's line name is what the customer saw and paid for.
      name: stripeProduct?.name ?? v?.name ?? p?.name ?? l.description ?? "Item",
      variant: v?.variant,
      variantId: v?.variantId,
      image: p ? photoFor(p, v?.variantId) : undefined,
      // What the customer actually paid per unit, from Stripe.
      unitPrice: paid,
      listUnitPrice: list,
      quantity,
      supplier: p?.supplier ?? undefined,
      supplierName: p?.supplier ? supplierName.get(String(p.supplier)) : undefined,
      supplierSku: v ? v.supplierSku : p?.supplierSku,
      supplierUrl: p?.supplierUrl,
      supplierCost: v ? v.supplierCost : p?.supplierCost,
    }];
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
  const components = new Map((await ProductModel.find({ _id: { $in: packComponentIds(products) } }).lean()).map((p) => [String(p._id), p]));
  const supplierIds = [...new Set([...products, ...components.values()].map((p) => p.supplier).filter(Boolean).map(String))];
  const suppliers = await SupplierModel.find({ _id: { $in: supplierIds } }).select("name").lean();
  const supplierName = new Map(suppliers.map((s) => [String(s._id), s.name as string]));

  const items = stripeLinesToItems(lines.data, byId, components, supplierName);

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
      currency: session.currency ?? CURRENCY.toLowerCase(),
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
