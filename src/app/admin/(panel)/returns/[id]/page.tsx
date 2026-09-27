import Link from "next/link";
import BackLink from "@/components/admin/BackLink";
import { adminReturn } from "@/lib/admin/queries";
import { FREE_RETURN_REASONS, RETURN_REASON_LABELS, RETURN_STATUS_LABELS } from "@/lib/catalogue";
import { formatPrice } from "@/lib/money";
import { siteConfig } from "@/lib/siteConfig";
import { CopyButton } from "@/components/admin/OrderControls";
import { ReturnNoteForm, ReturnStatusActions } from "@/components/admin/ReturnControls";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const DAY = 86_400_000;

export default async function ReturnPage({ params }: PageProps<"/admin/returns/[id]">) {
  const r = await adminReturn((await params).id);
  const free = FREE_RETURN_REASONS.includes(r.reason);
  const daysAfterDelivery = r.deliveredAt ? Math.floor((new Date(r.createdAt).getTime() - new Date(r.deliveredAt).getTime()) / DAY) : null;

  // Group lines by supplier: each group gets that supplier's instructions.
  const groups = new Map<string, { name: string; instructions: string; items: typeof r.items }>();
  for (const i of r.items) {
    const key = i.supplier?.id ?? "none";
    const g = groups.get(key) ?? { name: i.supplier?.name ?? "No supplier recorded", instructions: i.supplier?.returnInstructions ?? "", items: [] };
    g.items.push(i);
    groups.set(key, g);
  }
  const missing = [...groups.values()].filter((g) => !g.instructions.trim());

  const returnCost = r.items.reduce((n, i) => (n == null || i.returnCost == null ? null : n + i.returnCost * i.quantity), 0 as number | null);
  const reply = [
    `Hi${r.customerName ? ` ${r.customerName.split(" ")[0]}` : ""},`,
    "",
    `Thanks for your return request R${r.number} for order #${r.orderNumber}. Here's how to send it back.`,
    ...[...groups.values()].flatMap((g) => [
      "",
      g.items.map((i) => `${i.quantity} × ${i.name}`).join("\n"),
      g.instructions.trim() || "[Add the return instructions for this item]",
    ]),
    "",
    free
      ? "As the item isn't right, you won't pay anything for the return."
      : returnCost != null
        ? `The return cost of ${formatPrice(returnCost)}, as shown on the product page, will be taken off your refund.`
        : "The return cost shown on the product page will be taken off your refund.",
    "We'll refund you within 14 days of the item reaching us, or of you showing us it's been sent back.",
    "",
    "Thanks,",
    siteConfig.name,
  ].join("\n");
  const mailto = `mailto:${r.email}?subject=${encodeURIComponent(`Your return R${r.number} (order #${r.orderNumber})`)}&body=${encodeURIComponent(reply)}`;

  return (
    <div className="max-w-5xl">
      <BackLink href="/admin/returns" label="Returns" />
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-4xl">Return R{r.number}</h1>
        <span className="rounded-full bg-white px-3 py-1 text-[14px] font-semibold">{RETURN_STATUS_LABELS[r.status]}</span>
      </div>
      <p className="tabular mt-1 text-[14px] text-muted">
        Requested {fmt.format(new Date(r.createdAt))} for <Link href={`/admin/orders/${r.orderId}`} className="underline">order #{r.orderNumber}</Link>.
        {daysAfterDelivery != null ? ` ${daysAfterDelivery} days after delivery.` : " Order not marked delivered yet."}
      </p>

      {!free && daysAfterDelivery != null && daysAfterDelivery > 14 && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-white p-4 font-semibold text-danger">
          Requested more than 14 days after delivery, so outside the change-of-mind cancellation period.
        </p>
      )}
      {missing.length > 0 && (
        <p className="mt-4 rounded-xl bg-notice p-4 text-[15px]">
          No return instructions saved for {missing.map((g) => g.name).join(", ")}. Add them on the supplier&rsquo;s page, or write them into the reply.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">{RETURN_REASON_LABELS[r.reason]}</h2>
            {r.details ? <p className="mt-2 whitespace-pre-line">{r.details}</p> : <p className="mt-2 text-muted">No details given.</p>}
            <p className="mt-3 text-[14px] text-muted">{free ? "The customer doesn't pay for this return (item not right)." : "Change of mind: the product's stated return cost comes off the refund."}</p>
          </section>

          {[...groups.values()].map((g) => (
            <section key={g.name} className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-lg font-semibold">Back to {g.name}</h2>
              <ul className="mt-2 text-[15px]">
                {g.items.map((i, n) => (
                  <li key={n} className="tabular">
                    {i.quantity} × {i.name}
                    {i.unitPrice != null && <span className="text-muted"> · paid {formatPrice(i.unitPrice)} each</span>}
                    {i.returnCost != null && <span className="text-muted"> · return cost {formatPrice(i.returnCost)}</span>}
                    {i.supplierOrderRef && <span className="text-muted"> · supplier ref <span className="font-mono">{i.supplierOrderRef}</span></span>}
                  </li>
                ))}
              </ul>
              <h3 className="mt-4 text-[14px] font-semibold">Supplier&rsquo;s return instructions</h3>
              <p className="mt-1 whitespace-pre-line text-[15px]">{g.instructions || "None saved."}</p>
            </section>
          ))}

          <section className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Reply to the customer</h2>
              <div className="flex gap-2">
                <CopyButton text={reply} label="Copy reply" />
                <a href={mailto} className="rounded-lg bg-moss px-2.5 py-1 text-[13px] font-semibold text-white hover:bg-moss-deep">Open in email</a>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-plaster p-4 font-sans text-[15px]">{reply}</pre>
            <p className="mt-2 text-[13px] text-muted">Check it, send it from {siteConfig.business.email ?? "your support inbox"}, then mark instructions sent.</p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-3">
              {[...r.events].reverse().map((e, n) => (
                <li key={n} className="border-l-2 border-line pl-4 text-[15px]">
                  <p className="tabular text-[13px] text-muted">{e.at ? fmt.format(new Date(e.at)) : ""}</p>
                  <p>{e.note}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4"><ReturnNoteForm id={r.id} /></div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Status</h2>
            <div className="mt-3"><ReturnStatusActions id={r.id} status={r.status} /></div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 text-[15px]">
            <h2 className="text-lg font-semibold">Customer</h2>
            {r.customerName && <p className="mt-2">{r.customerName}</p>}
            <p className="mt-1 break-all"><a href={`mailto:${r.email}`} className="text-moss underline">{r.email}</a></p>
          </section>
        </aside>
      </div>
    </div>
  );
}
