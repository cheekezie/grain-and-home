import "server-only";
import { connectDB } from "@/lib/db";
import ProductModel from "@/models/Product";
import { getCategories } from "@/lib/shop/server";
import type { LinkTargets } from "@/components/admin/ShopSettingsEditors";

/** Everything a nav link or hero button can point to: categories and live products. */
export async function linkTargets(): Promise<LinkTargets> {
  await connectDB();
  const [categories, products] = await Promise.all([
    getCategories(),
    ProductModel.find({ status: "published" }).select("name slug").sort({ name: 1 }).lean(),
  ]);
  return {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    products: products.map((p) => ({ name: p.name as string, slug: p.slug as string })),
  };
}
