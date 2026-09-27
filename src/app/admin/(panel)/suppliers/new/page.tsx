import EditHeader from "@/components/admin/EditHeader";
import { SupplierEditor } from "@/components/admin/editors";
import { saveSupplier } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { orderingInbox } from "@/lib/mail/inboxSettings";

export const metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  await requireAdmin();
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/suppliers" backLabel="Suppliers" title="Add supplier" />
      <SupplierEditor
        action={saveSupplier.bind(null, null)}
        orderingInbox={await orderingInbox()}
        initial={{ name: "", website: "", orderUrl: "", contactEmail: "", contactPhone: "", accountRef: "", notes: "", returnInstructions: "", whiteLabel: false, senderDomains: "", autoCustomerUpdates: false, active: true }}
      />
    </div>
  );
}
