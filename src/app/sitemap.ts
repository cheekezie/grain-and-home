import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/shop/server";
import { siteConfig } from "@/lib/siteConfig";
import { getAllListedSlugs } from "@/lib/store";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllListedSlugs(), getCategories()]);
  const u = (p: string) => `${siteConfig.url}${p}`;
  return [
    ...["", "/shop", "/delivery", "/returns", "/terms", "/privacy", "/contact"].map((p) => ({ url: u(p) })),
    ...categories.map((c) => ({ url: u(`/shop/${c.slug}`) })),
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined, images: p.images })),
  ];
}
