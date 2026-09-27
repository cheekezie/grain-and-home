import AdminList, { PageHead } from "@/components/admin/AdminList";
import { adminProducts, adminSuppliers } from "@/lib/admin/queries";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const [suppliers, products] = await Promise.all([adminSuppliers(), adminProducts()]);
  return (
    <div className="max-w-5xl">
      <PageHead title="Suppliers" newHref="/admin/suppliers/new" newLabel="Add supplier" />
      <p className="mt-4 max-w-2xl text-[15px] text-muted">The vendors you order from on customers&rsquo; behalf. Never shown on the shop.</p>
      <AdminList
        empty="No suppliers yet. Add the trade suppliers you've registered with."
        rows={suppliers.map((s) => {
          const n = products.filter((p) => p.supplierId === s.id).length;
          return { href: `/admin/suppliers/${s.id}`, title: s.name, sub: [`${n} product${n === 1 ? "" : "s"}`, !s.active && "Inactive"].filter(Boolean).join(", ") };
        })}
      />
    </div>
  );
}
