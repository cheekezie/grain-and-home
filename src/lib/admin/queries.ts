import "server-only";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import ProductModel from "@/models/Product";
import SupplierModel from "@/models/Supplier";
import OrderModel from "@/models/Order";
import ReturnRequestModel from "@/models/ReturnRequest";
import PromoCodeModel from "@/models/PromoCode";
import SubscriberModel from "@/models/Subscriber";
import StockAlertModel from "@/models/StockAlert";
import SupplierEmailModel from "@/models/SupplierEmail";
import MailSyncModel from "@/models/MailSync";
import WebhookSecretModel from "@/models/WebhookSecret";
import type { ReturnReason, ReturnStatus } from "@/lib/catalogue";
import { toAdminProduct, toOrder, toSupplier } from "@/lib/serialize";

export async function adminProducts() {
  await requireAdmin();
  await connectDB();
  return (await ProductModel.find().sort({ category: 1, sortOrder: 1, name: 1 }).lean()).map(toAdminProduct);
}

/** Products imported from Printful, by Printful catalogue id (a blank can be imported more than once). */
export async function printfulImports() {
  await requireAdmin();
  await connectDB();
  const rows = await ProductModel.find({ printfulId: { $exists: true } }).select("name status printfulId createdAt").sort({ createdAt: -1 }).lean();
  const byId = new Map<number, { id: string; name: string; status: "draft" | "published" }[]>();
  for (const r of rows) {
    const list = byId.get(r.printfulId as number) ?? [];
    list.push({ id: String(r._id), name: r.name, status: r.status as "draft" | "published" });
    byId.set(r.printfulId as number, list);
  }
  return byId;
}

export async function adminProduct(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const p = await ProductModel.findById(id).lean();
  if (!p) notFound();
  return toAdminProduct(p);
}

export async function adminSuppliers() {
  await requireAdmin();
  await connectDB();
  return (await SupplierModel.find().sort({ name: 1 }).lean()).map(toSupplier);
}

export async function adminSupplier(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const s = await SupplierModel.findById(id).lean();
  if (!s) notFound();
  return toSupplier(s);
}

export async function adminOrders(status?: string) {
  await requireAdmin();
  await connectDB();
  const filter = status ? { status } : {};
  return (await OrderModel.find(filter).sort({ createdAt: -1 }).limit(200).lean()).map(toOrder);
}

export async function adminOrder(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const o = await OrderModel.findById(id).lean();
  if (!o) notFound();
  return toOrder(o);
}

export async function orderCounts() {
  await requireAdmin();
  await connectDB();
  const rows = await OrderModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n])) as Record<string, number>;
}

// ------------------------------------------------------------ returns

export interface AdminReturn {
  id: string;
  number: number;
  orderId: string;
  orderNumber: number;
  email: string;
  customerName?: string;
  reason: ReturnReason;
  details: string;
  status: ReturnStatus;
  createdAt: string;
  deliveredAt?: string;
  events: { at: string; note: string }[];
  /** One entry per returned line, with where it goes back to. */
  items: {
    name: string;
    quantity: number;
    unitPrice?: number;
    returnCost?: number;
    supplierOrderRef?: string;
    supplier?: { id: string; name: string; returnInstructions: string; contactEmail?: string };
  }[];
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : "");

export async function adminReturns(status?: ReturnStatus) {
  await requireAdmin();
  await connectDB();
  const rows = await ReturnRequestModel.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(200).lean();
  return rows.map((r) => ({
    id: String(r._id),
    number: r.number,
    orderId: String(r.order),
    orderNumber: r.orderNumber,
    email: r.email,
    reason: r.reason as ReturnReason,
    status: r.status as ReturnStatus,
    itemCount: (r.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0),
    createdAt: iso(r.createdAt),
  }));
}

export async function returnCounts() {
  await requireAdmin();
  await connectDB();
  const rows = await ReturnRequestModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n])) as Record<string, number>;
}

export async function adminReturn(id: string): Promise<AdminReturn> {
  await requireAdmin();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const r = await ReturnRequestModel.findById(id).lean();
  if (!r) notFound();
  const order = await OrderModel.findById(r.order).lean();
  const lines = new Map((order?.items ?? []).map((i) => [String(i._id), i]));
  const productIds = (order?.items ?? []).map((i) => i.product).filter(Boolean);
  const products = new Map((await ProductModel.find({ _id: { $in: productIds } }, { supplier: 1, returnCost: 1 }).lean()).map((p) => [String(p._id), p]));
  const supplierIds = [...products.values()].map((p) => p.supplier).filter(Boolean);
  const suppliers = new Map((await SupplierModel.find({ _id: { $in: supplierIds } }).lean()).map((s) => [String(s._id), s]));
  const delivered = (order?.events ?? []).find((e) => e.status === "delivered");

  return {
    id: String(r._id),
    number: r.number,
    orderId: String(r.order),
    orderNumber: r.orderNumber,
    email: r.email,
    customerName: order?.customerName || undefined,
    reason: r.reason as ReturnReason,
    details: r.details ?? "",
    status: r.status as ReturnStatus,
    createdAt: iso(r.createdAt),
    deliveredAt: delivered ? iso(delivered.at) : undefined,
    events: (r.events ?? []).map((e) => ({ at: iso(e.at), note: e.note ?? "" })),
    items: (r.items ?? []).map((i) => {
      const line = lines.get(String(i.orderItem));
      const product = line?.product ? products.get(String(line.product)) : undefined;
      const s = product?.supplier ? suppliers.get(String(product.supplier)) : undefined;
      return {
        name: i.name ?? line?.name ?? "Item",
        quantity: i.quantity ?? 1,
        unitPrice: line?.unitPrice,
        returnCost: typeof product?.returnCost === "number" ? product.returnCost : undefined,
        supplierOrderRef: line?.supplierOrderRef || undefined,
        supplier: s
          ? { id: String(s._id), name: s.name, returnInstructions: s.returnInstructions ?? "", contactEmail: s.contactEmail || undefined }
          : undefined,
      };
    }),
  };
}

// ------------------------------------------------------------ promotions

export interface AdminPromo {
  id: string;
  code: string;
  headline: string;
  kind: "percent" | "fixed";
  value: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categories: string[];
  minSpend?: number;
  startsAt?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  oncePerCustomer: boolean;
  active: boolean;
  announce: boolean;
  welcome: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toAdminPromo(p: Record<string, any>): AdminPromo {
  return {
    id: String(p._id),
    code: p.code,
    headline: p.headline,
    kind: p.kind,
    value: p.value,
    scope: p.scope ?? "all",
    productIds: (p.products ?? []).map(String),
    categories: p.categories ?? [],
    minSpend: p.minSpend ?? undefined,
    startsAt: p.startsAt ? iso(p.startsAt) : undefined,
    expiresAt: p.expiresAt ? iso(p.expiresAt) : undefined,
    maxUses: p.maxUses ?? undefined,
    usedCount: p.usedCount ?? 0,
    oncePerCustomer: !!p.oncePerCustomer,
    active: !!p.active,
    announce: !!p.announce,
    welcome: !!p.welcome,
  };
}

export async function adminPromos() {
  await requireAdmin();
  await connectDB();
  return (await PromoCodeModel.find().sort({ createdAt: -1 }).lean()).map(toAdminPromo);
}

export async function adminPromo(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const p = await PromoCodeModel.findById(id).lean();
  if (!p) notFound();
  return toAdminPromo(p);
}

export async function adminSubscribers() {
  await requireAdmin();
  await connectDB();
  const rows = await SubscriberModel.find().sort({ createdAt: -1 }).lean();
  return rows.map((r) => ({ id: String(r._id), email: r.email, source: r.source ?? "", createdAt: iso(r.createdAt), unsubscribed: !!r.unsubscribedAt }));
}

/** Waiting lists per product, with whether it's back in stock. */
export async function adminStockAlerts() {
  await requireAdmin();
  await connectDB();
  const rows = await StockAlertModel.find({ notifiedAt: null }).sort({ createdAt: 1 }).lean();
  const products = await ProductModel.find({ _id: { $in: [...new Set(rows.map((r) => String(r.product)))] } }).select("name slug availability").lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const groups = new Map<string, { productId: string; name: string; slug: string; availability: string; emails: string[] }>();
  for (const r of rows) {
    const p = byId.get(String(r.product));
    if (!p) continue;
    const g = groups.get(String(r.product)) ?? { productId: String(r.product), name: p.name, slug: p.slug, availability: p.availability as string, emails: [] };
    g.emails.push(r.email);
    groups.set(String(r.product), g);
  }
  return [...groups.values()];
}

export async function marketingCounts() {
  await requireAdmin();
  await connectDB();
  const [waiting, backInStock] = await Promise.all([
    StockAlertModel.countDocuments({ notifiedAt: null }),
    adminStockAlerts().then((g) => g.filter((x) => x.availability === "in_stock" || x.availability === "low_stock").length),
  ]);
  return { waiting, backInStock };
}

// ------------------------------------------------------------ supplier emails

export const SUPPLIER_EMAILS_PER_PAGE = 50;

type SupplierEmailRow = Record<string, unknown> & { _id: unknown };

async function supplierEmailViews(rows: SupplierEmailRow[], textLimit: number) {
  const supplierNames = new Map((await SupplierModel.find().select("name").lean()).map((s) => [String(s._id), s.name as string]));
  const orderNums = new Map(
    (await OrderModel.find({ _id: { $in: rows.map((r) => r.order).filter(Boolean) } }).select("number").lean()).map((o) => [String(o._id), o]),
  );
  return rows.map((r) => ({
    id: String(r._id),
    from: r.from as string,
    subject: r.subject as string,
    receivedAt: r.receivedAt ? iso(r.receivedAt as Date) : undefined,
    supplierName: r.supplier ? supplierNames.get(String(r.supplier)) : undefined,
    text: ((r.text as string) ?? "").slice(0, textLimit),
    detectedStatus: r.detectedStatus as string,
    trackingUrls: (r.trackingUrls as string[]) ?? [],
    supplierHostedTrackingUrls: (r.supplierHostedTrackingUrls as string[]) ?? [],
    supplierOrderRef: (r.supplierOrderRef as string) || undefined,
    orderId: r.order ? String(r.order) : undefined,
    orderNumber: r.order ? (orderNums.get(String(r.order))?.number as number | undefined) : undefined,
    state: r.state as string,
    customerEmailedAt: r.customerEmailedAt ? iso(r.customerEmailedAt as Date) : undefined,
  }));
}

/** One page of emails for the list: no body text (it's on the email's own page). */
export async function adminSupplierEmails(state: string | undefined, page = 1) {
  await requireAdmin();
  await connectDB();
  const filter = state ? { state } : {};
  const total = await SupplierEmailModel.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / SUPPLIER_EMAILS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pages);
  const rows = await SupplierEmailModel.find(filter)
    .select("-text")
    .sort({ receivedAt: -1, _id: -1 })
    .skip((current - 1) * SUPPLIER_EMAILS_PER_PAGE)
    .limit(SUPPLIER_EMAILS_PER_PAGE)
    .lean();
  return { items: await supplierEmailViews(rows as SupplierEmailRow[], 0), total, page: current };
}

export async function adminSupplierEmail(id: string) {
  await requireAdmin();
  await connectDB();
  if (!isValidObjectId(id)) return null;
  const row = await SupplierEmailModel.findById(id).lean();
  if (!row) return null;
  return (await supplierEmailViews([row as SupplierEmailRow], 20000))[0];
}

export async function supplierEmailCounts() {
  await requireAdmin();
  await connectDB();
  const rows = await SupplierEmailModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$state", n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n])) as Record<string, number>;
}

export async function mailSyncState() {
  await requireAdmin();
  await connectDB();
  const s = (await MailSyncModel.findById("INBOX").lean()) as { lastRunAt?: Date; lastError?: string } | null;
  return { lastRunAt: s?.lastRunAt ? iso(s.lastRunAt) : undefined, lastError: s?.lastError };
}

/** Open orders, for matching an email to an order by hand. */
export async function openOrdersForMatching() {
  await requireAdmin();
  await connectDB();
  const rows = await OrderModel.find({ status: { $in: ["paid", "ordered", "dispatched"] } }).sort({ createdAt: -1 }).limit(100).select("number customerName customerEmail items").lean();
  return rows.map((o) => ({
    id: String(o._id),
    label: `#${o.number} · ${(o.customerName as string) || (o.customerEmail as string)}`,
    items: ((o.items ?? []) as { _id: unknown; name: string; supplierName?: string }[]).map((i) => ({ id: String(i._id), label: `${i.name}${i.supplierName ? ` (${i.supplierName})` : ""}` })),
  }));
}

export async function zohoWebhookState() {
  await requireAdmin();
  await connectDB();
  const w = (await WebhookSecretModel.findById("zoho-mail").lean()) as { secret?: string; connectedAt?: Date; lastCallAt?: Date; lastResult?: string } | null;
  return {
    connected: !!(w?.secret || process.env.ZOHO_MAIL_WEBHOOK_SECRET),
    connectedAt: w?.connectedAt ? iso(w.connectedAt) : undefined,
    lastCallAt: w?.lastCallAt ? iso(w.lastCallAt) : undefined,
    lastResult: w?.lastResult,
  };
}
