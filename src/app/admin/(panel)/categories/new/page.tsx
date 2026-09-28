import EditHeader from "@/components/admin/EditHeader";
import { CategoryEditor } from "@/components/admin/editors";
import { saveCategory } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { toCategoryValue } from "../form";

export const metadata = { title: "Add category" };

export default async function NewCategoryPage() {
  await requireAdmin();
  const [shop, categories] = await Promise.all([getShopSettings(), getCategories()]);
  const last = categories.at(-1)?.sortOrder ?? 0;
  return (
    <div className="w-full">
      <EditHeader backHref="/admin/categories" backLabel="Categories" title={`Add ${shop.words.categoryLabel.toLowerCase()}`} />
      <CategoryEditor isNew initial={{ ...toCategoryValue(), sortOrder: last + 10 }} action={saveCategory.bind(null, null)} label={shop.words.categoryLabel} />
    </div>
  );
}
