import "server-only";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { deliveryAreaText } from "@/lib/shop/types";
import type { ProductEditorShop } from "@/components/admin/editors";
import { connectDB } from "@/lib/db";
import ProductModel from "@/models/Product";

/** What the product editor needs from the shop. `exclude`: the product being edited (it can't be in its own pack). */
export async function productEditorShop(exclude?: string): Promise<ProductEditorShop> {
  await connectDB();
  const [shop, categories, products] = await Promise.all([
    getShopSettings(),
    getCategories(),
    ProductModel.find({ "packSlots.0": { $exists: false } }).select("name supplierCost status options").sort({ name: 1 }).lean(),
  ]);
  return {
    categories: categories.map((c) => ({ value: c.slug, label: c.name })),
    categoryLabel: shop.words.categoryLabel,
    fields: shop.details,
    twoPerson: shop.delivery.twoPerson,
    areaText: deliveryAreaText(shop.delivery.area),
    packProducts: products
      .filter((x) => String(x._id) !== exclude)
      .map((x) => ({
        value: String(x._id),
        label: `${x.name as string}${x.status === "published" ? "" : " (draft)"}`,
        cost: typeof x.supplierCost === "number" ? x.supplierCost : undefined,
        hasOptions: ((x.options as unknown[] | undefined) ?? []).length > 0,
        options: ((x.options as { name: string; values: string[] }[] | undefined) ?? []).map((o) => ({ name: o.name, values: [...o.values] })),
      })),
  };
}
