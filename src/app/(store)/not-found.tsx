import Link from "next/link";
import { getCategories, getShopSettings } from "@/lib/shop/server";

// Shown inside the shop (header, nav, footer, theme) for any address that
// doesn't exist, including unknown URLs (see [...missing]).
export default async function NotFound() {
  const [shop, categories] = await Promise.all([getShopSettings(), getCategories()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-[15px] text-muted">Page not found</p>
      <h1 className="mt-2 font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-tight">We can&rsquo;t find that page.</h1>
      <p className="mt-3 text-lg text-muted">It may have moved, or the address may be mistyped. Try one of these instead.</p>
      <ul className="mt-8 flex flex-wrap gap-2">
        <li>
          <Link href="/" className="inline-block rounded-full bg-moss px-5 py-2.5 font-semibold text-white hover:bg-moss-deep">Home</Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/shop/${c.slug}`} className="inline-block rounded-full border border-line bg-page px-5 py-2.5 font-semibold hover:border-ink">{c.name}</Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[15px] text-muted">{shop.tagline}</p>
    </div>
  );
}
