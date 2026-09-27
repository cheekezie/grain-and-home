import EditHeader from "@/components/admin/EditHeader";
import { PromoEditor } from "@/components/admin/editors";
import { DeleteButton } from "@/components/admin/fields";
import { deletePromo, savePromo } from "@/app/admin/actions";
import { adminProducts, adminPromo } from "@/lib/admin/queries";
import { promoState, toPromoValue } from "@/lib/admin/promoForm";

export default async function EditPromoPage({ params }: PageProps<"/admin/promos/[id]">) {
  const { id } = await params;
  const [p, products] = await Promise.all([adminPromo(id), adminProducts()]);
  return (
    <div className="max-w-6xl">
      <EditHeader backHref="/admin/promos" backLabel="Promo codes" title={p.code} />
      <p className="-mt-4 mb-6 text-[15px] text-muted">
        {promoState(p)}. Used {p.usedCount}{p.maxUses ? ` of ${p.maxUses}` : ""} time{p.usedCount === 1 ? "" : "s"}.
      </p>
      <PromoEditor
        action={savePromo.bind(null, id)}
        initial={toPromoValue(p)}
        products={products.map((x) => ({ id: x.id, name: x.name, category: x.category, live: x.status === "published" }))}
        aside={<DeleteButton key="delete" action={deletePromo.bind(null, id)} label="this promo code" />}
      />
    </div>
  );
}
