import Link from "next/link";
import { adminOrders, orderCounts } from "@/lib/admin/queries";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/catalogue";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Orders" };

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" && (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : undefined;
  const [orders, counts] = await Promise.all([adminOrders(filter), orderCounts()]);
  const tab = (value: OrderStatus | undefined, label: string, n?: number) => (
    <Link
      key={label}
      href={value ? `/admin/orders?status=${value}` : "/admin/orders"}
      aria-current={filter === value ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${filter === value ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}
    >
      {label}
      {n ? <span className="tabular ml-1.5 opacity-70">{n}</span> : null}
    </Link>
  );

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl">Orders</h1>
      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {tab(undefined, "All")}
        {ORDER_STATUSES.map((s) => tab(s, ORDER_STATUS_LABELS[s], counts[s]))}
      </nav>
      {orders.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-line bg-white p-6 text-muted">
          {filter ? "No orders with this status." : "No orders yet. Paid checkouts appear here automatically."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-line text-[13px] text-muted">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-plaster">
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-moss hover:underline">#{o.number}</Link>
                    <span className="block text-[13px] text-muted">{fmt.format(new Date(o.createdAt))}</span>
                  </td>
                  <td className="p-3">{o.customerName ?? o.customerEmail}<span className="block text-[13px] text-muted">{o.shippingAddress?.postalCode}</span></td>
                  <td className="p-3">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="p-3 text-right">{formatPrice(o.total)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${o.status === "paid" ? "bg-moss text-white" : "bg-plaster"}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
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
