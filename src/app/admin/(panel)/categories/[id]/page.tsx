import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import EditHeader from "@/components/admin/EditHeader";
import { CategoryEditor } from "@/components/admin/editors";
import { DeleteButton } from "@/components/admin/fields";
import { deleteCategory, saveCategory } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { toCategoryValue } from "../form";

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const [categories, shop] = await Promise.all([getCategories(), getShopSettings()]);
  const c = categories.find((x) => x.id === id);
  if (!c) notFound();
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/categories" backLabel="Categories" title={c.name} liveHref={`/shop/${c.slug}`} />
      <CategoryEditor
        isNew={false}
        initial={toCategoryValue(c)}
        action={saveCategory.bind(null, id)}
        label={shop.words.categoryLabel}
        aside={<DeleteButton key="delete" action={deleteCategory.bind(null, id)} label={`this ${shop.words.categoryLabel.toLowerCase()}`} />}
      />
    </div>
  );
}
