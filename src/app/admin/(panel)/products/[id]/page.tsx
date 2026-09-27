import EditHeader from "@/components/admin/EditHeader";
import { ProductEditor } from "@/components/admin/editors";
import { DeleteButton } from "@/components/admin/fields";
import { adminProduct, adminSuppliers } from "@/lib/admin/queries";
import { toProductValue } from "@/lib/admin/productForm";
import { deleteProduct, saveProduct } from "@/app/admin/actions";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const [p, suppliers] = await Promise.all([adminProduct(id), adminSuppliers()]);
  return (
    <div className="max-w-6xl">
      <EditHeader backHref="/admin/products" backLabel="Products" title={p.name} status={p.status} liveHref={`/products/${p.slug}`} />
      <ProductEditor
        isNew={false}
        initial={toProductValue(p)}
        checkedAt={p.availabilityCheckedAt}
        action={saveProduct.bind(null, id)}
        suppliers={suppliers.map((s) => ({ value: s.id, label: s.active ? s.name : `${s.name} (inactive)` }))}
        aside={<DeleteButton key="delete" action={deleteProduct.bind(null, id)} label="this product" />}
      />
    </div>
  );
}
