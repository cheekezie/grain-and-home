import type { CategoryValue } from "@/components/admin/editors";
import type { ShopCategory } from "@/lib/shop/types";

export function toCategoryValue(c?: ShopCategory): CategoryValue {
  return {
    name: c?.name ?? "",
    slug: c?.slug ?? "",
    blurb: c?.blurb ?? "",
    pageTitle: c?.pageTitle ?? "",
    intro: c?.intro ?? "",
    metaDescription: c?.metaDescription ?? "",
    guide: c?.guide ?? "",
    image: { url: c?.image?.url ?? "", alt: c?.image?.alt ?? "", credit: c?.image?.credit ?? "", creditUrl: c?.image?.creditUrl ?? "", cutout: !!c?.image?.cutout },
    sortOrder: c?.sortOrder ?? 100,
  };
}
