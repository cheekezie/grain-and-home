import AdminList, { PageHead } from "@/components/admin/AdminList";
import { PublishToggle } from "@/components/admin/ProductControls";
import { adminProducts, adminSuppliers } from "@/lib/admin/queries";
import { AVAILABILITY_LABELS } from "@/lib/catalogue";
import { getCategoryNames } from "@/lib/shop/server";
import { formatPrice, marginPercent } from "@/lib/money";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const [products, suppliers, categoryName] = await Promise.all([adminProducts(), adminSuppliers(), getCategoryNames()]);
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  return (
    <div className="w-full">
      <PageHead title="Products" newHref="/admin/products/new" newLabel="Add product" extra={{ href: "/admin/products/import", label: "Import from Printful" }} />
      {suppliers.length === 0 && (
        <p className="mt-4 rounded-xl bg-notice p-4 text-[15px]">Add a supplier first, so each product can be linked to where you buy it.</p>
      )}
      <AdminList
        empty="No products yet. Add your first one from your supplier's catalogue."
        rows={products.map((p) => {
          const m = p.price != null ? marginPercent(p.price, p.supplierCost) : null;
          const issues: string[] = [];
          if (p.images.length === 0) issues.push("No photo");
          if (!p.supplierId) issues.push("No supplier");
          if (p.returnCost == null) issues.push("Return cost not set");
          if (p.availability === "out_of_stock" || p.availability === "discontinued") issues.push(AVAILABILITY_LABELS[p.availability]);
          return {
            href: `/admin/products/${p.id}`,
            title: p.name,
            sub: [categoryName(p.category), p.supplierId ? supplierName.get(p.supplierId) : undefined, p.featured && "Featured"].filter(Boolean).join(", "),
            meta: `${p.price != null ? formatPrice(p.price) : "No price yet"}${m != null ? `, margin ${m}%` : ""}`,
            status: p.status,
            issues,
            action: <PublishToggle id={p.id} status={p.status} />,
          };
        })}
      />
    </div>
  );
}
