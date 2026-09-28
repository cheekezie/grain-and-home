import Link from "next/link";

// Admin 404: an old link to something deleted, or a mistyped address.
// Inside the admin layout, with a way back.
export default function AdminNotFound() {
  return (
    <div className="max-w-xl rounded-2xl border border-line bg-white p-8">
      <p className="tabular text-[14px] font-semibold text-muted">404</p>
      <h1 className="mt-1 font-display text-3xl">That page isn&rsquo;t in the admin.</h1>
      <p className="mt-2 text-[15px] text-muted">
        The product, order or other record may have been deleted, or the link may be out of date.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-strong">Back to overview</Link>
        <Link href="/admin/products" className="rounded-lg border border-line px-5 py-2.5 font-semibold hover:border-ink">Products</Link>
        <Link href="/admin/orders" className="rounded-lg border border-line px-5 py-2.5 font-semibold hover:border-ink">Orders</Link>
      </div>
    </div>
  );
}
