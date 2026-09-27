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
import type { ReturnReason, ReturnStatus } from "@/lib/catalogue";
import { toAdminProduct, toOrder, toSupplier } from "@/lib/serialize";

export async function adminProducts() {
  await requireAdmin();
  await connectDB();
  return (await ProductModel.find().sort({ category: 1, sortOrder: 1, name: 1 }).lean()).map(toAdminProduct);
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
