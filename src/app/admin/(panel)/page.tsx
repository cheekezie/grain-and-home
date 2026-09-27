import Link from "next/link";
import { connection } from "next/server";
import { adminOrders, adminProducts, orderCounts } from "@/lib/admin/queries";
import { STALE_AVAILABILITY_DAYS } from "@/lib/catalogue";
import { businessDetailsMissing } from "@/lib/siteConfig";
import { formatPrice } from "@/lib/money";
import { checkDeliveryPostcode } from "@/lib/delivery";
import { daysSince } from "@/lib/admin/time";

export default async function Overview() {
  await connection();
  const [counts, products, openOrders] = await Promise.all([orderCounts(), adminProducts(), adminOrders()]);
  const days = (iso?: string) => daysSince(iso);

  const toPlace = openOrders.filter((o) => o.status === "paid");
  const waitingDispatch = openOrders.filter((o) => o.status === "ordered" && days(o.updatedAt) > 3);
  const badPostcode = openOrders.filter((o) => ["paid", "ordered"].includes(o.status) && o.shippingAddress?.postalCode && !checkDeliveryPostcode(o.shippingAddress.postalCode).ok);
  const live = products.filter((p) => p.status === "published");
  const stale = live.filter((p) => days(p.availabilityCheckedAt) > STALE_AVAILABILITY_DAYS);
  const unavailable = live.filter((p) => p.availability === "out_of_stock" || p.availability === "discontinued");

  const warnings: string[] = [];
  if (businessDetailsMissing()) warnings.push("Business name or email isn't set, so they're missing from the shop footer and policies. Set NEXT_PUBLIC_BUSINESS_LEGAL_NAME and NEXT_PUBLIC_SUPPORT_EMAIL.");
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!/^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(key)) warnings.push("STRIPE_SECRET_KEY is missing or a placeholder, so checkout can't take payments. Add your key from the Stripe Dashboard.");
  else if (key.startsWith("sk_test_")) warnings.push("Stripe is in test mode: no real payments are taken. Switch to live keys before launch.");
  if (!/^whsec_[A-Za-z0-9]{20,}$/.test(process.env.STRIPE_WEBHOOK_SECRET ?? "")) warnings.push("STRIPE_WEBHOOK_SECRET is missing or a placeholder, so paid checkouts won't become orders. Get it from the Stripe webhook endpoint (or `stripe listen` locally).");

  const tile = (n: number, label: string, href: string, urgent = false) => (
    <Link href={href} className={`block rounded-2xl border bg-white p-4 hover:border-ink ${urgent && n > 0 ? "border-moss" : "border-line"}`}>
      <span className="tabular block font-display text-4xl">{n}</span>
      <span className="mt-1 block text-[14px] font-semibold">{label}</span>
    </Link>
  );

  return (
    <div className="w-full space-y-10">
      <h1 className="font-display text-4xl">Overview</h1>

      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="rounded-xl border border-danger/30 bg-white p-4 text-[15px] text-danger">{w}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tile(counts.paid ?? 0, "To order from supplier", "/admin/orders?status=paid", true)}
        {tile(counts.ordered ?? 0, "Waiting for dispatch", "/admin/orders?status=ordered")}
        {tile(counts.dispatched ?? 0, "On the way", "/admin/orders?status=dispatched")}
        {tile(stale.length, "Stock checks due", "/admin/stock", true)}
      </div>

      <section>
        <h2 className="text-xl font-semibold">Needs action</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
          {toPlace.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex justify-between gap-4 p-4 hover:bg-plaster">
                <span><span className="font-semibold">Order #{o.number}</span>: place with supplier ({o.items.length} item{o.items.length > 1 ? "s" : ""})</span>
                <span className="tabular text-muted">{formatPrice(o.total)}</span>
              </Link>
            </li>
          ))}
          {badPostcode.map((o) => (
            <li key={`pc-${o.id}`}>
              <Link href={`/admin/orders/${o.id}`} className="block p-4 text-danger hover:bg-plaster">
                <span className="font-semibold">Order #{o.number}</span>: delivery postcode {o.shippingAddress?.postalCode} is outside mainland UK. Check with the supplier or refund.
              </Link>
            </li>
          ))}
          {waitingDispatch.map((o) => (
            <li key={`wd-${o.id}`}>
              <Link href={`/admin/orders/${o.id}`} className="block p-4 hover:bg-plaster">
                <span className="font-semibold">Order #{o.number}</span>: ordered over 3 days ago, not yet dispatched. Chase the supplier.
              </Link>
            </li>
          ))}
          {unavailable.map((p) => (
            <li key={`oos-${p.id}`}>
              <Link href={`/admin/products/${p.id}`} className="block p-4 hover:bg-plaster">
                <span className="font-semibold">{p.name}</span> is live but {p.availability === "discontinued" ? "discontinued" : "out of stock"}.
              </Link>
            </li>
          ))}
          {toPlace.length + badPostcode.length + waitingDispatch.length + unavailable.length === 0 && (
            <li className="p-4 text-muted">Nothing needs action right now.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
