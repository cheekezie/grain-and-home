import EditHeader from "@/components/admin/EditHeader";
import { PromoEditor } from "@/components/admin/editors";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { savePromo } from "@/app/admin/actions";
import { adminProducts } from "@/lib/admin/queries";
import { emptyPromo } from "@/lib/admin/promoForm";

export const metadata = { title: "Add promo code" };

export default async function NewPromoPage() {
  const [products, categories, shop] = await Promise.all([adminProducts(), getCategories(), getShopSettings()]);
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/promos" backLabel="Promo codes" title="Add promo code" />
      <PromoEditor
        action={savePromo.bind(null, null)}
        initial={emptyPromo}
        products={products.map((p) => ({ id: p.id, name: p.name, category: p.category, live: p.status === "published" }))}
        categories={categories}
        categoriesLabel={shop.words.categoriesLabel}
      />
    </div>
  );
}
