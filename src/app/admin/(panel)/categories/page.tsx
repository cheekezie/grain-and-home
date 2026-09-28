import AdminList, { PageHead } from "@/components/admin/AdminList";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { getCategoryCounts } from "@/lib/store";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const [categories, shop, counts] = await Promise.all([getCategories(), getShopSettings(), getCategoryCounts()]);
  const label = shop.words.categoryLabel.toLowerCase();
  return (
    <div className="w-full">
      <PageHead title="Categories" newHref="/admin/categories/new" newLabel={`Add ${label}`} />
      <p className="mt-4 max-w-2xl text-[15px] text-muted">
        Each {label} has its own page, a tile on the home page and, unless you set your own navigation, a place in the nav. A short intro, a search
        description and a buying guide help both shoppers and search rankings.
      </p>
      <AdminList
        empty={`No ${shop.words.categoriesLabel.toLowerCase()} yet. Add your first one.`}
        rows={categories.map((c) => {
          const words = c.guide ? c.guide.trim().split(/\s+/).length : 0;
          const n = counts[c.slug] ?? 0;
          const issues = [!c.image && "No photo", !c.metaDescription && "No search description", !words && "No buying guide"].filter((x): x is string => !!x);
          return {
            href: `/admin/categories/${c.id}`,
            title: c.name,
            sub: `/shop/${c.slug}`,
            meta: [`${n} live ${n === 1 ? shop.words.item : shop.words.items}`, words ? `guide: ${words} words` : ""].filter(Boolean).join(", "),
            issues,
          };
        })}
      />
    </div>
  );
}
