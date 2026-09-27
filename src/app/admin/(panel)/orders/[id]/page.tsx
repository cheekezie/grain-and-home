import BackLink from "@/components/admin/BackLink";
import { adminOrder } from "@/lib/admin/queries";
import { ORDER_STATUS_LABELS } from "@/lib/catalogue";
import { formatPrice, marginPercent } from "@/lib/money";
import { checkDeliveryPostcode } from "@/lib/delivery";
import { CopyButton, ItemRefs, NoteForm, StatusActions } from "@/components/admin/OrderControls";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const o = await adminOrder((await params).id);
  const a = o.shippingAddress;
  const addressLines = [a?.name, a?.line1, a?.line2, a?.city, a?.postalCode].filter(Boolean) as string[];
  const addressText = [...addressLines, o.customerPhone].filter(Boolean).join("\n");
  const postcodeOk = !a?.postalCode || checkDeliveryPostcode(a.postalCode).ok;
  const cost = o.items.every((i) => i.supplierCost != null) ? o.items.reduce((n, i) => n + (i.supplierCost ?? 0) * i.quantity, 0) : null;
  const margin = cost != null ? marginPercent(o.total, cost) : null;

  return (
    <div className="max-w-5xl">
      <BackLink href="/admin/orders" label="Orders" />
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-4xl">Order #{o.number}</h1>
        <span className="rounded-full bg-white px-3 py-1 text-[14px] font-semibold">{ORDER_STATUS_LABELS[o.status]}</span>
      </div>
      <p className="tabular mt-1 text-[14px] text-muted">Placed {fmt.format(new Date(o.createdAt))}. Paid {formatPrice(o.total)}.
        {o.promoCode && <> Promo code <span className="font-mono">{o.promoCode}</span> took off {formatPrice(o.discount)}.</>}
      </p>

      {!postcodeOk && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-white p-4 font-semibold text-danger">
          {a?.postalCode} is outside mainland UK. Check the supplier will deliver there before ordering, or cancel and refund.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Items to order</h2>
            <ul className="mt-3 divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="py-4">
                  <div className="flex gap-4">
                    {i.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-plaster object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{i.quantity} × {i.name}</p>
                      <p className="tabular text-[14px] text-muted">
                        {formatPrice(i.unitPrice)} each
                        {i.supplierCost != null && <> · cost {formatPrice(i.supplierCost)}</>}
                      </p>
                      <p className="mt-1 text-[14px]">
                        {i.supplierName ?? "No supplier recorded"}
                        {i.supplierSku && <> · code <span className="font-mono">{i.supplierSku}</span></>}
                        {i.supplierUrl && (
                          <>
                            {" · "}
                            <a href={i.supplierUrl} target="_blank" rel="noopener" className="font-semibold text-moss underline">Open supplier page</a>
                          </>
                        )}
                      </p>
                      {i.trackingUrl && (
                        <a href={i.trackingUrl} target="_blank" rel="noopener" className="mt-1 inline-block text-[14px] font-semibold text-moss underline">Track delivery</a>
                      )}
                    </div>
                  </div>
                  <ItemRefs orderId={o.id} itemId={i.id} supplierOrderRef={i.supplierOrderRef} trackingUrl={i.trackingUrl} />
                </li>
              ))}
            </ul>
            {cost != null && (
              <p className="tabular mt-3 border-t border-line pt-3 text-[15px]">
                Supplier cost {formatPrice(cost)}. Gross margin {formatPrice(o.total - cost)} ({margin}%), before Stripe fees.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-3">
              {[...o.events].reverse().map((e, n) => (
                <li key={n} className="border-l-2 border-line pl-4 text-[15px]">
                  <p className="tabular text-[13px] text-muted">{e.at ? fmt.format(new Date(e.at)) : ""}{e.status && <> · {ORDER_STATUS_LABELS[e.status]}</>}</p>
                  {e.note && <p>{e.note}</p>}
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <NoteForm orderId={o.id} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Next step</h2>
            <div className="mt-3">
              <StatusActions orderId={o.id} status={o.status} />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 text-[15px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Deliver to</h2>
              <CopyButton text={addressText} label="Copy address" />
            </div>
            <address className="mt-2 whitespace-pre-line not-italic">{addressLines.join("\n") || "No address recorded"}</address>
            {o.customerPhone && <p className="mt-2">{o.customerPhone}</p>}
            <p className="mt-2 break-all">
              <a href={`mailto:${o.customerEmail}?subject=${encodeURIComponent(`Your order #${o.number}`)}`} className="text-moss underline">{o.customerEmail}</a>
            </p>
          </section>
          {o.stripePaymentIntentId && (
            <a
              href={`https://dashboard.stripe.com/payments/${o.stripePaymentIntentId}`}
              target="_blank"
              rel="noopener"
              className="block rounded-2xl border border-line bg-white p-4 text-[15px] font-semibold text-moss hover:border-ink"
            >
              View payment in Stripe (refunds are made there)
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
