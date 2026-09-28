import "server-only";
import type { ParsedMail } from "mailparser";
import { createHash } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import OrderModel from "@/models/Order";
import SupplierModel from "@/models/Supplier";
import SupplierEmailModel from "@/models/SupplierEmail";
import { NEXT_STATUSES, type OrderStatus } from "@/lib/catalogue";
import { sendMail } from "./send";
import { orderConfirmationEmail, orderUpdateEmail, UPDATE_LABELS, type CustomerUpdateKind } from "./templates";
import ProductModel from "@/models/Product";
import { mailConfigured } from "./config";
import { detectStatus, extractTrackingLinks, findOrderRef, htmlToText, type DetectedStatus } from "./parse";
import { getShopSettings } from "@/lib/shop/server";
import { deliveryAreaText } from "@/lib/shop/types";

const OPEN: OrderStatus[] = ["paid", "ordered", "dispatched"];

/** Email the customer about their order and log it on the order. */
export async function sendOrderUpdate(orderId: string, kind: CustomerUpdateKind, trackingUrl?: string) {
  await connectDB();
  const o = await OrderModel.findById(orderId).lean();
  if (!o) throw new Error("Order not found.");
  const mail = orderUpdateEmail({
    kind,
    orderNumber: o.number as number,
    customerName: (o.customerName as string) || undefined,
    items: ((o.items ?? []) as { name: string; quantity: number }[]).map((i) => ({ name: i.name, quantity: i.quantity })),
    trackingUrl,
    postcode: (o.shippingAddress as { postalCode?: string } | undefined)?.postalCode,
  });
  await sendMail({ to: o.customerEmail as string, ...mail });
  await OrderModel.updateOne(
    { _id: orderId },
    {
      $push: {
        emails: { at: new Date(), kind, subject: mail.subject, to: o.customerEmail },
        events: { at: new Date(), note: `Emailed the customer: ${UPDATE_LABELS[kind]}${trackingUrl ? " (with tracking link)" : ""}.` },
      },
    },
  );
  return mail.subject;
}

/** Move an order forward through the allowed steps (e.g. paid → ordered → dispatched). */
async function advanceOrder(orderId: string, target: OrderStatus, note: string) {
  const o = await OrderModel.findById(orderId).select("status").lean();
  if (!o) return;
  let current = o.status as OrderStatus;
  const path: OrderStatus[] = ["paid", "ordered", "dispatched", "delivered"];
  if (!path.includes(current) || path.indexOf(target) <= path.indexOf(current)) return;
  while (current !== target) {
    const next = path[path.indexOf(current) + 1];
    if (!NEXT_STATUSES[current].includes(next)) return;
    await OrderModel.updateOne({ _id: orderId, status: current }, { $set: { status: next }, $push: { events: { at: new Date(), status: next, note } } });
    current = next;
  }
}

const TARGET: Partial<Record<DetectedStatus, OrderStatus>> = { ordered: "ordered", dispatched: "dispatched", delivered: "delivered" };
const CUSTOMER_KIND: Partial<Record<DetectedStatus, CustomerUpdateKind>> = {
  dispatched: "dispatched",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
};

/**
 * Apply a supplier email to its order: save tracking, move the status on,
 * and (optionally) email the customer. Supplier-hosted tracking links are
 * never passed on: they'd show the supplier's name.
 */
export async function applySupplierEmail(id: string, opts: { emailCustomer: boolean; orderId?: string; itemId?: string }) {
  await connectDB();
  const e = await SupplierEmailModel.findById(id).lean();
  if (!e) throw new Error("Email not found.");
  const orderId = opts.orderId ?? (e.order ? String(e.order) : undefined);
  if (!orderId || !isValidObjectId(orderId)) throw new Error("Choose which order this email is about first.");
  const status = e.detectedStatus as DetectedStatus;
  if (status === "cancelled") throw new Error("The supplier cancelled: check with them, then cancel or refund the order yourself.");
  const tracking = (e.trackingUrls as string[] | undefined)?.[0];
  const itemId = opts.itemId ?? (e.orderItem ? String(e.orderItem) : undefined);

  if (tracking && itemId) {
    await OrderModel.updateOne({ _id: orderId, "items._id": itemId }, { $set: { "items.$.trackingUrl": tracking } });
  }
  const target = TARGET[status];
  if (target) await advanceOrder(orderId, target, `From the supplier's email: ${e.subject}`);

  let emailed = false;
  const kind = CUSTOMER_KIND[status];
  if (opts.emailCustomer && kind) {
    await sendOrderUpdate(orderId, kind, tracking);
    emailed = true;
  }
  await SupplierEmailModel.updateOne(
    { _id: id },
    { $set: { state: "applied", appliedAt: new Date(), order: orderId, ...(itemId && { orderItem: itemId }), ...(emailed && { customerEmailedAt: new Date() }) } },
  );
  return { emailed, kind };
}

/** One incoming email, whether read from the inbox (IMAP) or pushed by Zoho's webhook. */
export interface IncomingEmail {
  messageId: string;
  from: string;
  fromAddress: string;
  subject: string;
  date?: Date;
  text: string;
  html: string;
}

export function fromParsedMail(mail: ParsedMail): IncomingEmail {
  const html = typeof mail.html === "string" ? mail.html : "";
  return {
    messageId: mail.messageId || `${mail.date?.toISOString()}-${mail.subject}`,
    from: mail.from?.text ?? "",
    fromAddress: mail.from?.value?.[0]?.address ?? "",
    subject: mail.subject ?? "",
    date: mail.date,
    text: mail.text || htmlToText(html),
    html,
  };
}

/** Same email seen via both routes? Sender + subject + send time (to the minute). */
function dedupeKey(m: IncomingEmail): string {
  const minute = m.date ? Math.floor(m.date.getTime() / 60_000) : "";
  return createHash("sha256").update(`${m.fromAddress.toLowerCase()}|${m.subject.trim()}|${minute}`).digest("hex").slice(0, 32);
}

/** The active, non-white-label supplier this sender belongs to (by email domain), if any. */
export async function supplierForAddress(address: string) {
  const domain = address.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return null;
  const suppliers = await suppliersWithInbox();
  return suppliers.find((s) => ((s.senderDomains as string[]) ?? []).some((d) => domain === d || domain.endsWith(`.${d}`))) ?? null;
}

/**
 * Store a supplier email, matched to an order if we can. Only called for
 * senders on a supplier's domains: other mail is never stored.
 */
export async function recordSupplierEmail(mail: IncomingEmail, supplier: { _id: unknown; senderDomains?: string[]; autoCustomerUpdates?: boolean }) {
  await connectDB();
  const key = dedupeKey(mail);
  if (await SupplierEmailModel.exists({ $or: [{ messageId: mail.messageId }, { dedupeKey: key }] })) return null;

  const subject = mail.subject;
  const text = mail.text.slice(0, 20000);
  const html = mail.html;
  const status = detectStatus(subject, text);
  const links = extractTrackingLinks(html, text, supplier.senderDomains ?? []);

  // Open orders with a line from this supplier and a saved supplier order number.
  const orders = await OrderModel.find({ status: { $in: OPEN }, "items.supplier": supplier._id, "items.supplierOrderRef": { $exists: true, $ne: "" } })
    .select("items number")
    .lean();
  const candidates = orders.flatMap((o) =>
    ((o.items ?? []) as { _id: unknown; supplier?: unknown; supplierOrderRef?: string }[])
      .filter((i) => String(i.supplier) === String(supplier._id) && i.supplierOrderRef)
      .map((i) => ({ ref: i.supplierOrderRef as string, orderId: String(o._id), itemId: String(i._id) })),
  );
  const match = findOrderRef(subject, text, candidates);

  const doc = await SupplierEmailModel.create({
    messageId: mail.messageId,
    dedupeKey: key,
    from: mail.from,
    subject,
    receivedAt: mail.date ?? new Date(),
    supplier: supplier._id,
    text,
    detectedStatus: status,
    // Carrier links first; supplier-hosted ones kept only for review (never auto-sent).
    trackingUrls: links.carrier,
    supplierHostedTrackingUrls: links.supplierHosted,
    supplierOrderRef: match?.ref,
    order: match?.orderId,
    orderItem: match?.itemId,
    state: match ? "new" : "unmatched",
  });

  // Fully automatic only when the supplier allows it, the order is known,
  // and there's something worth telling the customer.
  const worthTelling = status === "delivered" || status === "out_for_delivery" || (status === "dispatched" && links.carrier.length > 0);
  if (match && supplier.autoCustomerUpdates && worthTelling) {
    try {
      await applySupplierEmail(String(doc._id), { emailCustomer: true });
    } catch (err) {
      console.error("[mail] auto-apply failed:", (err as Error).message);
    }
  }
  return doc;
}

export async function suppliersWithInbox() {
  await connectDB();
  return SupplierModel.find({ active: true, whiteLabel: { $ne: true }, senderDomains: { $exists: true, $ne: [] } }).lean();
}

type EmailLine = { name: string; quantity: number; unitPrice: number; listUnitPrice?: number; packGroup?: string; packName?: string };

/** Pack pieces back into one line per pack: "3-tee pack (Classic tee, M / Black; …)". */
function groupPacks(items: EmailLine[]): EmailLine[] {
  const out: EmailLine[] = [];
  const packs = new Map<string, EmailLine>();
  for (const i of items) {
    if (!i.packGroup) {
      out.push(i);
      continue;
    }
    const piece = i.packName && i.name.startsWith(`${i.packName}: `) ? i.name.slice(i.packName.length + 2) : i.name;
    const g = packs.get(i.packGroup);
    if (!g) {
      const line = { ...i, name: `${i.packName ?? "Pack"} (${piece}` };
      packs.set(i.packGroup, line);
      out.push(line);
    } else {
      g.name += `; ${piece}`;
      g.unitPrice += i.unitPrice;
      if (g.listUnitPrice != null && i.listUnitPrice != null) g.listUnitPrice += i.listUnitPrice;
    }
  }
  for (const g of packs.values()) g.name += ")";
  return out;
}

/**
 * Our own order confirmation, sent when payment goes through (and on
 * request from the order page). Delivery time comes from the products;
 * if they differ, the longest estimate is used so we never over-promise.
 */
export async function sendOrderConfirmation(orderId: string) {
  await connectDB();
  const o = await OrderModel.findById(orderId).lean();
  if (!o) throw new Error("Order not found.");
  const items = (o.items ?? []) as { product?: unknown; name: string; quantity: number; unitPrice: number; listUnitPrice?: number; packGroup?: string; packName?: string }[];
  const hasList = items.every((i) => typeof i.listUnitPrice === "number");
  const products = await ProductModel.find({ _id: { $in: items.map((i) => i.product).filter(Boolean) } }).select("deliveryEstimate").lean();
  const estimates = [...new Set(products.map((p) => (p.deliveryEstimate as string) || "").filter(Boolean))];
  const longest = estimates.sort((a, b) => (Number(b.match(/(\d+)\D*$/)?.[1]) || 0) - (Number(a.match(/(\d+)\D*$/)?.[1]) || 0))[0];
  const mail = orderConfirmationEmail({
    orderNumber: o.number as number,
    customerName: (o.customerName as string) || undefined,
    // Full prices on the lines and the discount once, as its own line.
    // (Orders from before list prices were saved show paid prices, no discount line.)
    items: groupPacks(items).map((i) => ({ name: i.name, quantity: i.quantity, lineTotal: (hasList ? i.listUnitPrice! : i.unitPrice) * i.quantity })),
    discount: hasList ? ((o.discount as number) ?? 0) : 0,
    promoCode: (o.promoCode as string) || undefined,
    total: o.total as number,
    address: o.shippingAddress as { name?: string; line1?: string; line2?: string; city?: string; postalCode?: string } | undefined,
    deliveryEstimate: longest,
    deliveryAreaText: deliveryAreaText((await getShopSettings()).delivery.area),
  });
  await sendMail({ to: o.customerEmail as string, ...mail });
  await OrderModel.updateOne(
    { _id: orderId },
    { $push: { emails: { at: new Date(), kind: "confirmation", subject: mail.subject, to: o.customerEmail }, events: { at: new Date(), note: "Emailed the customer: Order confirmation." } } },
  );
  return mail.subject;
}

/** Called right after the webhook creates an order: never lets an email problem fail the webhook. */
export async function confirmNewOrder(stripeCheckoutId: string) {
  if (!mailConfigured()) return;
  try {
    const o = await OrderModel.findOne({ stripeCheckoutId }).select("_id").lean();
    if (o) await sendOrderConfirmation(String(o._id));
  } catch (e) {
    console.error("[mail] order confirmation failed:", (e as Error).message);
    await OrderModel.updateOne({ stripeCheckoutId }, { $push: { events: { at: new Date(), note: `Order confirmation email failed: ${(e as Error).message}` } } });
  }
}
