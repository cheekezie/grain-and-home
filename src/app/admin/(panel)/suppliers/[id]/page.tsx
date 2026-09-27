import EditHeader from "@/components/admin/EditHeader";
import { SupplierEditor } from "@/components/admin/editors";
import { DeleteButton } from "@/components/admin/fields";
import { adminSupplier } from "@/lib/admin/queries";
import { deleteSupplier, saveSupplier } from "@/app/admin/actions";

export default async function EditSupplierPage({ params, searchParams }: PageProps<"/admin/suppliers/[id]">) {
  const { id } = await params;
  const [s, sp] = await Promise.all([adminSupplier(id), searchParams]);
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/suppliers" backLabel="Suppliers" title={s.name} />
      {sp.blocked === "1" && (
        <p role="alert" className="mb-6 rounded-xl border border-danger/30 bg-white p-4 font-semibold text-danger">
          This supplier still has products. Move them to another supplier or delete them first.
        </p>
      )}
      <SupplierEditor
        action={saveSupplier.bind(null, id)}
        initial={{
          name: s.name, website: s.website ?? "", orderUrl: s.orderUrl ?? "", contactEmail: s.contactEmail ?? "",
          contactPhone: s.contactPhone ?? "", accountRef: s.accountRef ?? "", notes: s.notes, returnInstructions: s.returnInstructions, active: s.active,
        }}
        aside={<DeleteButton key="delete" action={deleteSupplier.bind(null, id)} label="this supplier" />}
      />
    </div>
  );
}
