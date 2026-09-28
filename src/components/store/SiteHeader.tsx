import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import type { NavItem } from "@/lib/shop/types";
import BasketLink from "./BasketLink";
import SavedLink from "./SavedLink";

/** The shop's nav: its categories in order, or the custom list from Admin → Shop settings → Navigation. */
export async function getNavItems(): Promise<NavItem[]> {
  const [shop, categories] = await Promise.all([getShopSettings(), getCategories()]);
  if (shop.nav.mode === "custom" && shop.nav.items.length) return shop.nav.items;
  return categories.map((c) => ({ label: c.name, href: `/shop/${c.slug}`, children: [] }));
}

export default async function SiteHeader() {
  const [items, shop] = await Promise.all([getNavItems(), getShopSettings()]);
  const label = shop.home.tilesHeading;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-2xl leading-none">{siteConfig.name}</Link>
        <nav aria-label={label} className="hidden flex-1 lg:block">
          <ul className="flex gap-6 text-[15px]">
            {items.map((item) => (
              <li key={item.href + item.label} className="group relative">
                <Link href={item.href} className="hover:text-moss" aria-haspopup={item.children.length ? "true" : undefined}>
                  {item.label}
                  {item.children.length > 0 && <span aria-hidden className="ml-1 inline-block text-[11px] text-muted">▾</span>}
                </Link>
                {item.children.length > 0 && (
                  // Opens on hover and on keyboard focus (focus-within), no script needed.
                  <ul className="invisible absolute left-0 top-full z-50 min-w-52 rounded-xl border border-line bg-page p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {item.children.map((c) => (
                      <li key={c.href + c.label}>
                        <Link href={c.href} className="block rounded-lg px-3 py-2 hover:bg-plaster hover:text-moss">{c.label}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <SavedLink />
          <BasketLink />
        </div>
      </div>
      <nav aria-label={label} className="overflow-x-auto border-t border-line lg:hidden">
        <ul className="flex gap-5 whitespace-nowrap px-4 py-2.5 text-[15px] sm:px-6">
          {items.flatMap((item) => [item, ...item.children]).map((c) => (
            <li key={c.href + c.label}>
              <Link href={c.href} className="hover:text-moss">{c.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
