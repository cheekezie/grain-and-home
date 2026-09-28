import Link from "next/link";
import { getInsights, getProductMargins, RANGES, type RangeKey } from "@/lib/admin/insights";
import { MarginChart, RevenueProfitChart, TopProductsChart } from "@/components/admin/InsightsCharts";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/catalogue";
import { formatPrice } from "@/lib/money";
import Pagination from "@/components/admin/Pagination";
import { getShopSettings } from "@/lib/shop/server";

const MARGINS_PER_PAGE = 50;

export const metadata = { title: "Insights" };

const THIN_MARGIN = 20; // % below which a product's margin is flagged

const fmtDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const money = (p: number | null) => (p == null ? "–" : formatPrice(p));

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-[14px] text-muted">{label}</p>
      <p className={`tabular mt-1 text-3xl font-semibold ${tone === "bad" ? "text-danger" : tone === "good" ? "text-moss" : ""}`}>{value}</p>
      {sub && <p className="tabular mt-1 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

function Panel({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {hint && <p className="mt-1 text-[14px] text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function InsightsPage({ searchParams }: PageProps<"/admin/insights">) {
  const { range: raw, page: rawPage } = await searchParams;
  const range: RangeKey = typeof raw === "string" && raw in RANGES ? (raw as RangeKey) : "30d";
  const [ins, margins, shop] = await Promise.all([getInsights(range), getProductMargins(), getShopSettings()]);
  // The margins table shows 50 products a page; the chart and averages use them all.
  const pages = Math.max(1, Math.ceil(margins.length / MARGINS_PER_PAGE));
  const marginPage = Math.min(pages, Math.max(1, Number(typeof rawPage === "string" ? rawPage : 1) || 1));
  const marginRows = margins.slice((marginPage - 1) * MARGINS_PER_PAGE, marginPage * MARGINS_PER_PAGE);
  const k = ins.kpis;
  const hasSales = k.orders > 0 || k.refundCount > 0;
  const liveMargins = margins.filter((m) => m.live && m.marginPct != null);
  // Margins chart: the 10 best sellers (all-time units, then revenue); before
  // any sales, the first 10 priced products.
  const anySold = margins.some((m) => m.unitsSold > 0);
  const marginChartData = [...margins]
    .filter((m) => m.marginPct != null)
    .sort((a, b) => b.unitsSold - a.unitsSold || b.salesRevenue - a.salesRevenue)
    .slice(0, 10);
  const avgMargin = liveMargins.length ? Math.round((liveMargins.reduce((n, m) => n + (m.marginPct ?? 0), 0) / liveMargins.length) * 10) / 10 : null;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Insights</h1>
          <p className="mt-1 text-[15px] text-muted">Sales, costs and profit from paid orders. Money is what customers actually paid, after discounts.</p>
        </div>
        <nav aria-label="Period" className="flex flex-wrap gap-1.5">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Link
              key={key}
              href={`/admin/insights?range=${key}`}
              aria-current={key === range ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${key === range ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}
            >
              {RANGES[key].label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={formatPrice(k.revenue)} sub={`${k.orders} order${k.orders === 1 ? "" : "s"} · ${k.units} item${k.units === 1 ? "" : "s"}`} />
        <Stat label="Profit" value={formatPrice(k.profit)} sub={k.margin == null ? "No sales yet" : `${k.margin}% margin`} tone={k.profit < 0 ? "bad" : k.profit > 0 ? "good" : undefined} />
        <Stat label="Average order" value={formatPrice(k.averageOrder)} />
        <Stat label="Refunds" value={formatPrice(k.refunds)} sub={`${k.refundCount} order${k.refundCount === 1 ? "" : "s"}${k.refundFees ? ` · ${formatPrice(k.refundFees)} fees kept by Stripe` : ""}`} tone={k.refunds ? "bad" : undefined} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Supplier costs" value={formatPrice(k.supplierCost)} />
        <Stat label="Stripe fees" value={formatPrice(k.stripeFees)} sub={k.feesPending ? `${k.feesPending} not settled yet` : undefined} />
        <Stat label="Discounts given" value={formatPrice(k.discounts)} sub="Already taken off revenue" />
      </div>

      {(k.costsIncomplete || k.feesPending > 0) && (
        <p className="rounded-xl bg-notice p-4 text-[15px]">
          {k.costsIncomplete && "Some orders have items with no supplier cost, so profit is shown only where the cost is known. "}
          {k.feesPending > 0 && "Some Stripe fees aren't settled yet; they're filled in automatically when Stripe reports them."}
        </p>
      )}

      <Panel title={`Revenue and profit, last ${ins.rangeLabel.toLowerCase()}`} hint={`By ${ins.bucket}. Hover a bar for the exact figures. Profit here is sales minus supplier costs and Stripe fees; fees kept on refunds are in the Profit total above.`}>
        {hasSales ? <RevenueProfitChart data={ins.series} /> : <p className="py-10 text-center text-muted">No paid orders in this period yet. Sales show up here as soon as they come in.</p>}
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Best sellers" hint="By revenue in this period.">
          {ins.topProducts.length ? (
            <>
              <TopProductsChart data={ins.topProducts} />
              <table className="tabular mt-4 w-full text-left text-[14px]">
                <thead className="text-[13px] text-muted"><tr><th className="py-1.5">Product</th><th className="text-right">Sold</th><th className="text-right">Revenue</th><th className="text-right">Profit</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {ins.topProducts.map((p) => (
                    <tr key={p.name}><td className="py-1.5 pr-2">{p.name}</td><td className="text-right">{p.units}</td><td className="text-right">{formatPrice(p.revenue)}</td><td className="text-right">{money(p.profit)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="py-10 text-center text-muted">Nothing sold in this period yet.</p>
          )}
        </Panel>

        <Panel
          title="Margins of your best sellers"
          hint={`${anySold ? "Your 10 best-selling products, all time, best first" : "No sales yet, so showing the first 10 priced products"}. Margin = price minus supplier cost, before Stripe fees (about 1.5% + 20p a sale). Red is under ${THIN_MARGIN}%.${avgMargin != null ? ` Average across all live products: ${avgMargin}%.` : ""} Every product is in the table below.`}
        >
          {marginChartData.length ? <MarginChart data={marginChartData} threshold={THIN_MARGIN} /> : <p className="py-10 text-center text-muted">No priced products yet.</p>}
        </Panel>
      </div>

      <Panel
        title="Transactions"
        hint="Every order in this period. Profit = revenue minus supplier cost and Stripe fee."
        action={ins.transactions.length ? <Link href={`/admin/insights/export?range=${range}`} prefetch={false} className="rounded-lg border border-line px-3 py-1.5 text-[14px] font-semibold hover:border-ink">Download CSV</Link> : undefined}
      >
        {ins.transactions.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="tabular w-full min-w-[760px] text-left text-[14px]">
              <thead className="border-b border-line text-[13px] text-muted">
                <tr>
                  <th className="px-5 py-2">Order</th><th className="py-2">Customer</th><th className="py-2">Status</th>
                  <th className="py-2 text-right">Revenue</th><th className="py-2 text-right">Supplier cost</th><th className="py-2 text-right">Stripe fee</th><th className="px-5 py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ins.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-plaster">
                    <td className="px-5 py-2">
                      <Link href={`/admin/orders/${t.id}`} className="font-semibold text-moss hover:underline">#{t.number}</Link>
                      <span className="block text-[12px] text-muted">{fmtDate.format(new Date(t.date))}</span>
                    </td>
                    <td className="py-2 pr-3">{t.customer}<span className="block text-[12px] text-muted">{t.items} item{t.items === 1 ? "" : "s"}{t.promoCode ? ` · ${t.promoCode} −${formatPrice(t.discount)}` : ""}</span></td>
                    <td className="py-2">{ORDER_STATUS_LABELS[t.status as OrderStatus] ?? t.status}</td>
                    <td className={`py-2 text-right ${t.status === "refunded" || t.status === "cancelled" ? "text-muted line-through" : ""}`}>{formatPrice(t.revenue)}</td>
                    <td className="py-2 text-right">{money(t.supplierCost)}</td>
                    <td className="py-2 text-right">{t.stripeFee == null ? <span className="text-muted">pending</span> : formatPrice(t.stripeFee)}</td>
                    <td className={`px-5 py-2 text-right font-semibold ${t.profit != null && t.profit < 0 ? "text-danger" : ""}`}>{money(t.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-muted">No orders in this period.</p>
        )}
      </Panel>

      <Panel title="Product margins" hint="From the price and supplier cost set on each product. Edit a product to change them.">
        <div id="margins" className="-mx-5 scroll-mt-6 overflow-x-auto">
          <table className="tabular w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b border-line text-[13px] text-muted">
              <tr><th className="px-5 py-2">Product</th><th className="py-2">{shop.words.categoryLabel}</th><th className="py-2 text-right">Sold</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Supplier cost</th><th className="py-2 text-right">Margin</th><th className="px-5 py-2 text-right">Margin %</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {marginRows.map((m) => (
                <tr key={m.id} className="hover:bg-plaster">
                  <td className="px-5 py-2"><Link href={`/admin/products/${m.id}`} className="hover:underline">{m.name}</Link>{!m.live && <span className="ml-2 rounded-full bg-plaster px-2 text-[12px] text-muted">Draft</span>}</td>
                  <td className="py-2">{m.category}</td>
                  <td className="py-2 text-right">{m.unitsSold}</td>
                  <td className="py-2 text-right">{formatPrice(m.price)}</td>
                  <td className="py-2 text-right">{m.cost == null ? <span className="text-danger">not set</span> : formatPrice(m.cost)}</td>
                  <td className="py-2 text-right">{money(m.margin)}</td>
                  <td className={`px-5 py-2 text-right font-semibold ${m.marginPct != null && m.marginPct < THIN_MARGIN ? "text-danger" : ""}`}>{m.marginPct == null ? "–" : `${m.marginPct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination path="/admin/insights" params={{ range }} page={marginPage} perPage={MARGINS_PER_PAGE} total={margins.length} anchor="margins" />
      </Panel>
    </div>
  );
}
