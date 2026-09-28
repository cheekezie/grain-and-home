import { isAdmin } from "@/lib/auth";
import { getInsights, RANGES, type RangeKey } from "@/lib/admin/insights";
import { CURRENCY, MINOR_DIGITS, toMajor } from "@/lib/money";

// CSV of transactions for the chosen period (for your accountant or a
// spreadsheet). Outside the (panel) group; checks the session itself.
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  const raw = new URL(request.url).searchParams.get("range") ?? "30d";
  const range: RangeKey = raw in RANGES ? (raw as RangeKey) : "30d";
  const { transactions } = await getInsights(range);
  const cur = CURRENCY.toLowerCase();
  const pounds = (p: number | null) => (p == null ? "" : toMajor(p).toFixed(MINOR_DIGITS));
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const rows = [
    ["order", "date", "customer", "status", "items", `revenue_${cur}`, `discount_${cur}`, "promo_code", `supplier_cost_${cur}`, `stripe_fee_${cur}`, `profit_${cur}`],
    ...transactions.map((t) => [
      String(t.number), t.date.slice(0, 10), t.customer, t.status, String(t.items),
      pounds(t.revenue), pounds(t.discount), t.promoCode ?? "", pounds(t.supplierCost), pounds(t.stripeFee), pounds(t.profit),
    ]),
  ];
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${range}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
