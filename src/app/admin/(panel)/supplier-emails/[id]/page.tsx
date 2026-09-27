import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/admin/BackLink";
import { EmailActions } from "@/components/admin/MailControls";
import { adminSupplierEmail, openOrdersForMatching } from "@/lib/admin/queries";
import { mailConfigured } from "@/lib/mail/config";
import { EMAIL_STATUS_LABEL, emailDate as fmt } from "../labels";

export const metadata = { title: "Supplier email" };

const STATE_LABEL: Record<string, string> = { new: "To review", unmatched: "Not matched", applied: "Done", ignored: "Ignored" };

export default async function SupplierEmailPage({ params }: PageProps<"/admin/supplier-emails/[id]">) {
  const [e, orders] = await Promise.all([adminSupplierEmail((await params).id), openOrdersForMatching()]);
  if (!e) notFound();
  const canSend = mailConfigured();
  const tellable = ["dispatched", "out_for_delivery", "delivered"].includes(e.detectedStatus);

  return (
    <div className="w-full max-w-4xl">
      <BackLink href={`/admin/supplier-emails?state=${e.state}`} label="Supplier emails" />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl leading-tight">{e.subject || "(no subject)"}</h1>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[13px] font-semibold">{STATE_LABEL[e.state] ?? e.state}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${e.detectedStatus === "cancelled" ? "bg-danger text-white" : "bg-plaster"}`}>
            {EMAIL_STATUS_LABEL[e.detectedStatus] ?? e.detectedStatus}
          </span>
        </div>
      </div>
      <p className="mt-1 text-[14px] text-muted">
        {e.supplierName ?? "Supplier"} · {e.from} · {e.receivedAt ? fmt.format(new Date(e.receivedAt)) : ""}
      </p>

      <section className="mt-5 space-y-2 rounded-xl border border-line bg-white p-5 text-[15px]">
        <p>
          {e.orderId ? (
            <>
              Order <Link href={`/admin/orders/${e.orderId}`} className="font-semibold text-moss underline">#{e.orderNumber}</Link>
              {e.supplierOrderRef && <> (supplier order <span className="font-mono">{e.supplierOrderRef}</span>)</>}
            </>
          ) : (
            <span className="text-danger">No order matched. Save the supplier&rsquo;s order number on the order, or match it below.</span>
          )}
        </p>
        {e.trackingUrls.length > 0 && (
          <p className="break-all">Tracking: {e.trackingUrls.map((u) => <a key={u} href={u} target="_blank" rel="noopener" className="mr-2 text-moss underline">{new URL(u).hostname}</a>)}</p>
        )}
        {e.supplierHostedTrackingUrls.length > 0 && e.trackingUrls.length === 0 && (
          <p className="text-danger">
            The only tracking link is on the supplier&rsquo;s own site, so it won&rsquo;t be sent (it would show their name). Paste the carrier&rsquo;s tracking link on the order if you can find it.
          </p>
        )}
        {e.detectedStatus === "cancelled" && <p className="font-semibold text-danger">The supplier cancelled. Check with them, then cancel or refund the order yourself.</p>}
        {e.customerEmailedAt && <p className="text-[14px] text-moss">Customer emailed {fmt.format(new Date(e.customerEmailedAt))}</p>}
        {(e.state === "new" || e.state === "unmatched") && e.detectedStatus !== "cancelled" && (
          <EmailActions id={e.id} matched={!!e.orderId} canEmail={canSend && tellable} orders={orders} />
        )}
      </section>

      <section className="mt-5">
        <h2 className="font-semibold">Email</h2>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-white p-5 font-sans text-[14px] leading-relaxed">{e.text || "(empty)"}</pre>
      </section>
    </div>
  );
}
