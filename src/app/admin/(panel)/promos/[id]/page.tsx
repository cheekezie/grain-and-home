import EditHeader from "@/components/admin/EditHeader";
import { PromoEditor } from "@/components/admin/editors";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { DeleteButton } from "@/components/admin/fields";
import { deletePromo, savePromo } from "@/app/admin/actions";
import { adminProducts, adminPromo } from "@/lib/admin/queries";
import { promoState, toPromoValue } from "@/lib/admin/promoForm";

export default async function EditPromoPage({ params }: PageProps<"/admin/promos/[id]">) {
  const { id } = await params;
  const [p, products, categories, shop] = await Promise.all([adminPromo(id), adminProducts(), getCategories(), getShopSettings()]);
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/promos" backLabel="Promo codes" title={p.code} />
      <p className="-mt-4 mb-6 text-[15px] text-muted">
        {promoState(p)}. Used {p.usedCount}{p.maxUses ? ` of ${p.maxUses}` : ""} time{p.usedCount === 1 ? "" : "s"}.
      </p>
      <PromoEditor
        action={savePromo.bind(null, id)}
        initial={toPromoValue(p)}
        products={products.map((x) => ({ id: x.id, name: x.name, category: x.category, live: x.status === "published" }))}
        categories={categories}
        categoriesLabel={shop.words.categoriesLabel}
        aside={<DeleteButton key="delete" action={deletePromo.bind(null, id)} label="this promo code" />}
      />
    </div>
  );
}
