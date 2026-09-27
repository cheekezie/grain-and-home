import Link from "next/link";
import { PageHead } from "@/components/admin/AdminList";
import { CopyButton } from "@/components/admin/OrderControls";
import { MarkNotified } from "@/components/admin/AlertControls";
import { adminStockAlerts } from "@/lib/admin/queries";
import { AVAILABILITY_LABELS, type Availability } from "@/lib/catalogue";
import { siteConfig } from "@/lib/siteConfig";

export const metadata = { title: "Back in stock requests" };

export default async function AlertsPage() {
  const groups = await adminStockAlerts();
  return (
    <div className="w-full">
      <PageHead title="Back in stock requests" />
      <p className="mt-4 max-w-2xl text-[15px] text-muted">
        People waiting for an out-of-stock product. When it&rsquo;s back, email them (the shop doesn&rsquo;t send emails itself), then mark them as emailed.
      </p>
      {groups.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-white p-5">Nobody is waiting for anything.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {groups.map((g) => {
            const back = g.availability === "in_stock" || g.availability === "low_stock";
            const subject = `${g.name} is back in stock`;
            const body = `Good news: ${g.name} is back in stock at ${siteConfig.name}.\n\n${siteConfig.url}/products/${g.slug}\n\nYou asked us to let you know. We won't email you about it again.`;
            return (
              <li key={g.productId} className="rounded-xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <Link href={`/admin/products/${g.productId}`} className="font-semibold hover:underline">{g.name}</Link>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${back ? "bg-moss text-white" : "bg-plaster"}`}>
                    {back ? "Back in stock: email them" : AVAILABILITY_LABELS[g.availability as Availability]}
                  </span>
                </div>
                <p className="mt-1 text-[15px]">{g.emails.length} waiting</p>
                <p className="mt-2 break-all text-[14px] text-muted">{g.emails.join(", ")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={g.emails.join(", ")} label="Copy emails" />
                  {back && (
                    <>
                      <a
                        href={`mailto:?bcc=${encodeURIComponent(g.emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                        className="rounded-lg border border-line px-2.5 py-1 text-[13px] font-semibold hover:border-ink"
                      >
                        Open email (BCC)
                      </a>
                      <MarkNotified productId={g.productId} count={g.emails.length} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
