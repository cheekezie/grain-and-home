import Link from "next/link";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { getCategoryCounts, getSuggestions } from "@/lib/store";
import { CategoryTiles } from "@/components/store/HomeHero";
import ProductCard from "@/components/store/ProductCard";
import ProductGrid from "@/components/store/ProductGrid";
import NotFoundMessage from "@/components/store/NotFoundMessage";
import { siteConfig } from "@/lib/siteConfig";

// The shop's 404, inside its own layout (header, nav, footer, theme) for any
// address that doesn't exist: a removed product, a renamed category, or an
// unknown URL (see [...missing]). Says what happened, then gives somewhere
// to go: the categories with their photos and a few popular products.
// Next adds noindex to 404 responses. A not-found page inside a layout can't
// set head tags, so NotFoundMessage sets the tab title once it loads.

export default async function NotFound() {
  const [shop, categories, counts, featured] = await Promise.all([getShopSettings(), getCategories(), getCategoryCounts(), getSuggestions(4)]);
  const email = siteConfig.business.email;
  return (
    <div className="pb-4">
      <section className="border-b border-line bg-plaster">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <p className="tabular text-[15px] font-semibold text-moss">404 · Page not found</p>
          <div className="mt-3">
            <NotFoundMessage categoryLabel={shop.words.categoryLabel} storeName={siteConfig.name} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className="rounded-full bg-moss px-7 py-3.5 font-semibold text-white hover:bg-moss-deep">Back to the shop</Link>
            <Link href="/contact" className="rounded-full border border-line bg-page px-7 py-3.5 font-semibold hover:border-ink">Contact us</Link>
          </div>
          {email && (
            <p className="mt-6 text-[15px] text-muted">
              Followed a link from us? Tell us at <a href={`mailto:${email}`} className="font-semibold text-ink underline underline-offset-2">{email}</a> and we&rsquo;ll fix it.
            </p>
          )}
        </div>
      </section>

      <CategoryTiles categories={categories} counts={counts} heading={shop.home.tilesHeading} note={shop.home.tilesNote} words={shop.words} />

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <h2 className="font-display text-3xl">Popular right now</h2>
          <ProductGrid className="mt-8">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
