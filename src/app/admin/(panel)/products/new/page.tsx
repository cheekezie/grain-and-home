import EditHeader from "@/components/admin/EditHeader";
import { ProductEditor } from "@/components/admin/editors";
import { adminSuppliers } from "@/lib/admin/queries";
import { emptyProduct } from "@/lib/admin/productForm";
import { saveProduct } from "@/app/admin/actions";
import { productEditorShop } from "@/lib/admin/productShop";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const [suppliers, shop] = await Promise.all([adminSuppliers(), productEditorShop()]);
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/products" backLabel="Products" title="Add product" />
      <ProductEditor
        isNew
        initial={emptyProduct(shop.fields, shop.categories[0]?.value)}
        shop={shop}
        action={saveProduct.bind(null, null)}
        suppliers={suppliers.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
      />
    </div>
  );
}
