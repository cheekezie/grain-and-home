import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { CategoryTiles } from "@/components/store/HomeHero";
import { breadcrumbJsonLd, shareMeta } from "@/lib/seo";
import { getCategoryCounts } from "@/lib/store";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { shareImage } from "@/lib/shop/images";

// Every category on one page: the target for a "Shop" nav item, and a
// crawlable route to all of them.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopSettings();
  const title = shop.home.tilesHeading;
  return { title, description: shop.tagline, ...shareMeta({ title, description: shop.tagline, path: "/shop", image: shareImage(shop.hero.image?.url) }) };
}

export default async function ShopIndexPage() {
  const [shop, categories, counts] = await Promise.all([getShopSettings(), getCategories(), getCategoryCounts()]);
  return (
    <div className="pb-4">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: shop.home.tilesHeading, path: "/shop" }])} />
      <CategoryTiles headingLevel="h1" categories={categories} counts={counts} heading={shop.home.tilesHeading} note={shop.home.tilesNote} words={shop.words} />
    </div>
  );
}
