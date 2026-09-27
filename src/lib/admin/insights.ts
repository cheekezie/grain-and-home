import "server-only";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fetchStripeFee } from "@/lib/stripeFees";
import OrderModel from "@/models/Order";
import ProductModel from "@/models/Product";
import { categoryName } from "@/lib/catalogue";

// Sales and profit reporting. All money in pence.
//
// - Revenue: what customers actually paid (after discounts) on orders
//   that weren't cancelled or refunded.
// - Supplier cost: the cost saved on each order line when it was sold, so
//   later product edits never rewrite past profit.
// - Stripe fees: the real fee per payment, read from Stripe.
// - Profit = revenue - supplier cost - Stripe fees - fees on refunded
//   orders (Stripe keeps its fee when you refund).

export const RANGES = {
  "7d": { label: "7 days", days: 7, bucket: "day" },
  "30d": { label: "30 days", days: 30, bucket: "day" },
  "90d": { label: "90 days", days: 90, bucket: "week" },
  "12m": { label: "12 months", days: 365, bucket: "month" },
  all: { label: "All time", days: null, bucket: "month" },
} as const;
export type RangeKey = keyof typeof RANGES;

const LONDON = "Europe/London";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function bucketKey(d: Date, bucket: "day" | "week" | "month"): string {
  const k = dayKey(d);
  if (bucket === "day") return k;
  if (bucket === "month") return k.slice(0, 7);
  // week starting Monday
  const [y, m, dd] = k.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, dd));
  const shift = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - shift);
  return utc.toISOString().slice(0, 10);
}

function bucketLabel(key: string, bucket: "day" | "week" | "month"): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d || 1));
  if (bucket === "month") return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

function allBuckets(from: Date, to: Date, bucket: "day" | "week" | "month"): string[] {
  const keys: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const k = bucketKey(cur, bucket);
    if (keys[keys.length - 1] !== k) keys.push(k);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
}

const COUNTED = (s: string) => s !== "cancelled" && s !== "refunded";

export interface Transaction {
  id: string;
  number: number;
  date: string;
  customer: string;
  status: string;
  items: number;
  revenue: number;
  discount: number;
  promoCode?: string;
  supplierCost: number | null;
  stripeFee: number | null;
  profit: number | null;
}

export async function getInsights(range: RangeKey) {
  await requireAdmin();
  await connectDB();
  const r = RANGES[range];
  const now = new Date();
  const since = r.days ? new Date(now.getTime() - (r.days - 1) * 86_400_000) : null;

  const orders = await OrderModel.find(since ? { createdAt: { $gte: new Date(dayKey(since) + "T00:00:00Z") } } : {})
    .sort({ createdAt: -1 })
    .lean();

  // Fill in Stripe fees that weren't settled when the order was created.
  const missing = orders.filter((o) => o.stripeFee == null && o.stripePaymentIntentId).slice(0, 10);
  for (const o of missing) {
    const fee = await fetchStripeFee(o.stripePaymentIntentId as string);
    if (fee != null) {
      o.stripeFee = fee;
      await OrderModel.updateOne({ _id: o._id }, { $set: { stripeFee: fee } });
    }
  }

  const transactions: Transaction[] = orders.map((o) => {
    const items = (o.items ?? []) as { supplierCost?: number; quantity: number }[];
    const costKnown = items.every((i) => typeof i.supplierCost === "number");
    const supplierCost = costKnown ? items.reduce((n, i) => n + (i.supplierCost ?? 0) * i.quantity, 0) : null;
    const fee = typeof o.stripeFee === "number" ? o.stripeFee : null;
    const counted = COUNTED(o.status as string);
    return {
      id: String(o._id),
      number: o.number as number,
      date: (o.createdAt as Date).toISOString(),
      customer: (o.customerName as string) || (o.customerEmail as string),
      status: o.status as string,
      items: items.reduce((n, i) => n + i.quantity, 0),
      revenue: o.total as number,
      discount: (o.discount as number) ?? 0,
      promoCode: (o.promoCode as string) || undefined,
      supplierCost,
      stripeFee: fee,
      profit: counted && supplierCost != null ? (o.total as number) - supplierCost - (fee ?? 0) : counted ? null : -(fee ?? 0),
    };
  });

  const sold = transactions.filter((t) => COUNTED(t.status));
  const refunded = transactions.filter((t) => t.status === "refunded");
  const sum = (xs: (number | null)[]) => xs.reduce<number>((n, x) => n + (x ?? 0), 0);
  const revenue = sum(sold.map((t) => t.revenue));
  const supplierCost = sum(sold.map((t) => t.supplierCost));
  const stripeFees = sum(sold.map((t) => t.stripeFee));
  const refundFees = sum(refunded.map((t) => t.stripeFee));
  const profit = revenue - supplierCost - stripeFees - refundFees;
  const kpis = {
    revenue,
    orders: sold.length,
    units: sum(sold.map((t) => t.items)),
    averageOrder: sold.length ? Math.round(revenue / sold.length) : 0,
    supplierCost,
    stripeFees,
    discounts: sum(sold.map((t) => t.discount)),
    refunds: sum(refunded.map((t) => t.revenue)),
    refundCount: refunded.length,
    refundFees,
    profit,
    margin: revenue ? Math.round((profit / revenue) * 1000) / 10 : null,
    costsIncomplete: sold.some((t) => t.supplierCost == null),
    feesPending: sold.filter((t) => t.stripeFee == null).length,
  };

  // Time series, with empty periods shown as zero.
  const first = since ?? (orders.length ? new Date(orders[orders.length - 1].createdAt as Date) : now);
  const keys = allBuckets(new Date(dayKey(first) + "T12:00:00Z"), new Date(dayKey(now) + "T12:00:00Z"), r.bucket);
  const byKey = new Map(keys.map((k) => [k, { key: k, label: bucketLabel(k, r.bucket), revenue: 0, profit: 0, orders: 0 }]));
  for (const t of transactions) {
    const b = byKey.get(bucketKey(new Date(t.date), r.bucket));
    if (!b) continue;
    if (COUNTED(t.status)) {
      b.revenue += t.revenue;
      b.orders += 1;
      b.profit += t.profit ?? 0;
    }
    // Fees kept on refunds are in the Profit total, not the daily bars.
  }
  const series = [...byKey.values()];

  // Best sellers from the order lines.
  const lines = new Map<string, { name: string; units: number; revenue: number; cost: number; costKnown: boolean }>();
  for (const o of orders) {
    if (!COUNTED(o.status as string)) continue;
    for (const i of (o.items ?? []) as { product?: unknown; name: string; unitPrice: number; quantity: number; supplierCost?: number }[]) {
      const key = i.product ? String(i.product) : i.name;
      const l = lines.get(key) ?? { name: i.name, units: 0, revenue: 0, cost: 0, costKnown: true };
      l.units += i.quantity;
      l.revenue += i.unitPrice * i.quantity;
      if (typeof i.supplierCost === "number") l.cost += i.supplierCost * i.quantity;
      else l.costKnown = false;
      lines.set(key, l);
    }
  }
  const topProducts = [...lines.values()]
    .map((l) => ({ ...l, profit: l.costKnown ? l.revenue - l.cost : null }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return { range, rangeLabel: r.label, bucket: r.bucket, kpis, series, topProducts, transactions };
}

/** Margins as set on each product (not sales): what every sale would make before Stripe fees. */
export async function getProductMargins() {
  await requireAdmin();
  await connectDB();
  const products = await ProductModel.find({ price: { $gt: 0 } }).select("name slug category status price supplierCost").sort({ category: 1, name: 1 }).lean();
  // All-time units sold per product (orders not cancelled or refunded), to rank best sellers.
  const sales = await OrderModel.aggregate<{ _id: unknown; units: number; revenue: number }>([
    { $match: { status: { $nin: ["cancelled", "refunded"] } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", units: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } } } },
  ]);
  const sold = new Map(sales.map((s) => [String(s._id), s]));
  return products.map((p) => {
    const price = p.price as number;
    const cost = typeof p.supplierCost === "number" ? (p.supplierCost as number) : null;
    return {
      id: String(p._id),
      name: p.name as string,
      category: categoryName(p.category as string),
      live: p.status === "published",
      price,
      cost,
      margin: cost != null ? price - cost : null,
      marginPct: cost != null && price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : null,
      unitsSold: sold.get(String(p._id))?.units ?? 0,
      salesRevenue: sold.get(String(p._id))?.revenue ?? 0,
    };
  });
}
