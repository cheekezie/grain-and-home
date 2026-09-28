import ProductCard from "@/components/store/ProductCard";
import { CategoryTiles, Hero } from "@/components/store/HomeHero";
import { getPaymentMethods } from "@/lib/paymentMethods";
import { RecentlyViewed } from "@/components/store/ShopperRows";
import JsonLd from "@/components/JsonLd";
import { organisationJsonLd, shareMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/siteConfig";
import type { Metadata } from "next";
import { getCategoryCounts, getFeatured } from "@/lib/store";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { shareImage } from "@/lib/shop/images";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopSettings();
  return shareMeta({ title: `${siteConfig.name}: ${shop.seoTitle}`, description: shop.tagline, path: "/", image: shareImage(shop.hero.image?.url) });
}

export default async function HomePage() {
  const [shop, categories, featured, counts, marks] = await Promise.all([getShopSettings(), getCategories(), getFeatured(), getCategoryCounts(), getPaymentMethods()]);
  const klarna = marks.some((m) => m.label === "Klarna");

  return (
    <>
      <JsonLd data={organisationJsonLd(shop.tagline)} />
      <Hero hero={shop.hero} trust={shop.trust} klarna={klarna} />
      <CategoryTiles categories={categories} counts={counts} heading={shop.home.tilesHeading} note={shop.home.tilesNote} words={shop.words} />
      <RecentlyViewed title="Pick up where you left off" />

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <h2 className="font-display text-3xl">{shop.home.featuredHeading}</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} eager={i < 4} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
