import Link from "next/link";
import { CATEGORIES } from "@/lib/catalogue";
import { siteConfig } from "@/lib/siteConfig";
import BasketLink from "./BasketLink";
import SavedLink from "./SavedLink";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-2xl leading-none">{siteConfig.name}</Link>
        <nav aria-label="Shop by room" className="hidden flex-1 lg:block">
          <ul className="flex gap-6 text-[15px]">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="hover:text-moss">{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <SavedLink />
          <BasketLink />
        </div>
      </div>
      <nav aria-label="Shop by room" className="overflow-x-auto border-t border-line lg:hidden">
        <ul className="flex gap-5 whitespace-nowrap px-4 py-2.5 text-[15px] sm:px-6">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}`} className="hover:text-moss">{c.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
