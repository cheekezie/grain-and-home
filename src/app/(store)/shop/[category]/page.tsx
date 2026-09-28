import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/store/ProductCard";
import { getCategoryProducts } from "@/lib/store";
import JsonLd from "@/components/JsonLd";
import RichText from "@/components/store/RichText";
import { breadcrumbJsonLd, shareMeta } from "@/lib/seo";
import { getCategory, getShopSettings } from "@/lib/shop/server";
import { deliveryAreaName } from "@/lib/shop/types";
import { shareImage } from "@/lib/shop/images";
import CategoryGrid, { type Facet, type GridItem } from "@/components/store/CategoryGrid";
import { PURCHASABLE } from "@/lib/catalogue";
import type { StoreProduct } from "@/lib/types";
import type { DetailField } from "@/lib/shop/types";

const buyable = (a: string) => (PURCHASABLE as readonly string[]).includes(a);

/** Filters worth offering here: filterable details and options with at least two values among these products. */
function facetsFor(products: StoreProduct[], fields: DetailField[]): Facet[] {
  const facets: Facet[] = [];
  for (const f of fields.filter((x) => x.filterable)) {
    const seen = new Set(products.map((p) => p.details[f.key]).filter((v): v is string => typeof v === "string" && !!v));
    const order = f.options ?? [];
    const values = [...seen].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999) || a.localeCompare(b));
    if (values.length >= 2) facets.push({ id: `detail:${f.key}`, label: f.label, values });
  }
  const optionValues = new Map<string, string[]>();
  for (const p of products) {
    for (const [i, o] of p.options.entries()) {
      const list = optionValues.get(o.name) ?? [];
      for (const v of o.values) if (!list.includes(v) && p.variants.some((x) => x.values[i] === v && buyable(x.availability))) list.push(v);
      optionValues.set(o.name, list);
    }
  }
  for (const [name, values] of optionValues) if (values.length >= 2) facets.push({ id: `option:${name}`, label: name, values });
  return facets;
}

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const [cat, shop] = await Promise.all([getCategory((await params).category), getShopSettings()]);
  if (!cat) return {};
  const title = cat.pageTitle || cat.name;
  const description = cat.metaDescription || cat.intro || `${cat.blurb} Delivered free across ${deliveryAreaName(shop.delivery.area)}.`;
  return { title, description, ...shareMeta({ title, description, path: `/shop/${cat.slug}`, image: shareImage(cat.image?.url ?? shop.hero.image?.url) }) };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const [cat, shop] = await Promise.all([getCategory((await params).category), getShopSettings()]);
  if (!cat) notFound();
  const products = await getCategoryProducts(cat.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: cat.name, path: `/shop/${cat.slug}` }])} />
      <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-tight">{cat.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{cat.intro || cat.blurb}</p>
      {products.length === 0 ? (
        <p className="mt-12 rounded-2xl bg-plaster p-8 text-muted">{shop.words.emptyCategory}</p>
      ) : (
        (() => {
          const facets = facetsFor(products, shop.details);
          // Nothing to filter by: the plain grid.
          if (!facets.length) {
            return (
              <>
                <p className="tabular mt-8 text-[15px] text-muted">{products.length} {products.length > 1 ? shop.words.items : shop.words.item}</p>
                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                  {products.map((p, i) => (
                    <ProductCard key={p.id} product={p} eager={i < 8} />
                  ))}
                </div>
              </>
            );
          }
          const items: GridItem[] = products.map((p, i) => ({
            id: p.id,
            card: <ProductCard product={p} eager={i < 8} />,
            inStock: buyable(p.availability) && (!p.variants.length || p.variants.some((v) => buyable(v.availability))),
            details: Object.fromEntries(Object.entries(p.details).filter((e): e is [string, string] => typeof e[1] === "string")),
            variants: p.variants.filter((v) => buyable(v.availability)).map((v) => Object.fromEntries(p.options.map((o, k) => [o.name, v.values[k]]))),
          }));
          return <CategoryGrid items={items} facets={facets} words={shop.words} />;
        })()
      )}
      {cat.guide && (
        <section className="mt-20 max-w-3xl border-t border-line pt-10">
          <RichText text={cat.guide} />
        </section>
      )}
    </div>
  );
}
