import Link from "next/link";
import { adminReturns, returnCounts } from "@/lib/admin/queries";
import { RETURN_REASON_LABELS, RETURN_STATUSES, RETURN_STATUS_LABELS, type ReturnStatus } from "@/lib/catalogue";

export const metadata = { title: "Returns" };

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function ReturnsPage({ searchParams }: PageProps<"/admin/returns">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" && (RETURN_STATUSES as readonly string[]).includes(status) ? (status as ReturnStatus) : undefined;
  const [rows, counts] = await Promise.all([adminReturns(filter), returnCounts()]);
  const tab = (value: ReturnStatus | undefined, label: string, n?: number) => (
    <Link
      key={label}
      href={value ? `/admin/returns?status=${value}` : "/admin/returns"}
      aria-current={filter === value ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${filter === value ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}
    >
      {label}
      {n ? <span className="tabular ml-1.5 opacity-70">{n}</span> : null}
    </Link>
  );

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl">Returns</h1>
      <p className="mt-2 text-muted">Requests customers send from the returns form. Reply with the supplier&rsquo;s instructions; refund in Stripe once it&rsquo;s on its way back.</p>
      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {tab(undefined, "All")}
        {RETURN_STATUSES.map((s) => tab(s, RETURN_STATUS_LABELS[s], counts[s]))}
      </nav>
      {rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-line bg-white p-6 text-muted">{filter ? "No returns with this status." : "No return requests yet."}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-line text-[13px] text-muted">
              <tr><th className="p-3">Return</th><th className="p-3">Order</th><th className="p-3">Reason</th><th className="p-3">Items</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-plaster">
                  <td className="p-3">
                    <Link href={`/admin/returns/${r.id}`} className="font-semibold text-moss hover:underline">R{r.number}</Link>
                    <span className="block text-[13px] text-muted">{fmt.format(new Date(r.createdAt))}</span>
                  </td>
                  <td className="p-3"><Link href={`/admin/orders/${r.orderId}`} className="hover:underline">#{r.orderNumber}</Link><span className="block text-[13px] text-muted">{r.email}</span></td>
                  <td className="p-3">{RETURN_REASON_LABELS[r.reason]}</td>
                  <td className="p-3">{r.itemCount}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${r.status === "new" ? "bg-moss text-white" : "bg-plaster"}`}>{RETURN_STATUS_LABELS[r.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
