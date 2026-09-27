import Link from "next/link";
import { AvailabilityButtons } from "@/components/admin/ProductControls";
import { adminProducts, adminSuppliers } from "@/lib/admin/queries";
import { STALE_AVAILABILITY_DAYS } from "@/lib/catalogue";
import { daysSince } from "@/lib/admin/time";

export const metadata = { title: "Stock check" };

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

// Work through each supplier's list, check their site or feed, and click
// the current status: one click records it and stamps today's date.
// Oldest checks first, so the list is also the to-do list.
export default async function StockPage() {
  const [products, suppliers] = await Promise.all([adminProducts(), adminSuppliers()]);
  const age = (iso?: string) => {
    const d = daysSince(iso);
    return Number.isFinite(d) ? Math.floor(d) : null;
  };
  const live = products.filter((p) => p.status === "published");
  const groups = [
    ...suppliers.map((s) => ({ key: s.id, name: s.name, orderUrl: s.orderUrl, items: live.filter((p) => p.supplierId === s.id) })),
    { key: "none", name: "No supplier set", orderUrl: undefined, items: live.filter((p) => !p.supplierId) },
  ]
    .map((g) => ({ ...g, items: [...g.items].sort((a, b) => (age(b.availabilityCheckedAt) ?? 9999) - (age(a.availabilityCheckedAt) ?? 9999)) }))
    .filter((g) => g.items.length > 0);
  const due = live.filter((p) => (age(p.availabilityCheckedAt) ?? 9999) > STALE_AVAILABILITY_DAYS).length;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl">Stock check</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-muted">
        Check each live product with its supplier and click its current status. Checks older than {STALE_AVAILABILITY_DAYS} days are
        flagged. Out-of-stock products stay listed but can&rsquo;t be bought; &ldquo;No longer available&rdquo; hides them.
      </p>
      <p className="tabular mt-4 font-semibold">{due === 0 ? "All live products checked recently." : `${due} product${due > 1 ? "s" : ""} due a check.`}</p>
      {groups.length === 0 && <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-muted">No live products yet.</p>}
      {groups.map((g) => (
        <section key={g.key} className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">{g.name}</h2>
            {g.orderUrl && <a href={g.orderUrl} target="_blank" rel="noopener" className="text-[14px] font-semibold text-moss underline">Open supplier portal</a>}
          </div>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {g.items.map((p) => {
              const d = age(p.availabilityCheckedAt);
              const stale = d == null || d > STALE_AVAILABILITY_DAYS;
              return (
                <li key={p.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-moss">{p.name}</Link>
                    <p className="text-[14px]">
                      {p.supplierSku && <span className="font-mono text-muted">{p.supplierSku} </span>}
                      {p.supplierUrl && <a href={p.supplierUrl} target="_blank" rel="noopener" className="font-semibold text-moss underline">Check on supplier site</a>}
                    </p>
                    <p className={`tabular text-[13px] ${stale ? "font-semibold text-danger" : "text-muted"}`}>
                      {p.availabilityCheckedAt ? `Checked ${fmt.format(new Date(p.availabilityCheckedAt))}${d ? ` (${d} day${d > 1 ? "s" : ""} ago)` : " (today)"}` : "Never checked"}
                    </p>
                  </div>
                  <AvailabilityButtons id={p.id} current={p.availability} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
