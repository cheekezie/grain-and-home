import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/catalogue";
import { siteConfig } from "@/lib/siteConfig";
import { getAllListedSlugs } from "@/lib/store";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllListedSlugs();
  const u = (p: string) => `${siteConfig.url}${p}`;
  return [
    ...["", "/delivery", "/returns", "/terms", "/privacy", "/contact"].map((p) => ({ url: u(p) })),
    ...CATEGORIES.map((c) => ({ url: u(`/shop/${c.slug}`) })),
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined })),
  ];
}
