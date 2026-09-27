import EditHeader from "@/components/admin/EditHeader";
import { SupplierEditor } from "@/components/admin/editors";
import { saveSupplier } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  await requireAdmin();
  return (
    <div className="max-w-6xl">
      <EditHeader backHref="/admin/suppliers" backLabel="Suppliers" title="Add supplier" />
      <SupplierEditor
        action={saveSupplier.bind(null, null)}
        initial={{ name: "", website: "", orderUrl: "", contactEmail: "", contactPhone: "", accountRef: "", notes: "", returnInstructions: "", active: true }}
      />
    </div>
  );
}
