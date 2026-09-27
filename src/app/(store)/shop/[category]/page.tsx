import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/store/ProductCard";
import { CATEGORIES } from "@/lib/catalogue";
import { getCategoryProducts, getRoomContent } from "@/lib/store";
import JsonLd from "@/components/JsonLd";
import RichText from "@/components/store/RichText";
import { breadcrumbJsonLd, shareMeta } from "@/lib/seo";

export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES.find((x) => x.slug === category);
  if (!cat) return {};
  const content = await getRoomContent(category);
  const title = `${cat.name} furniture`;
  const description = content.metaDescription || content.intro || `${cat.blurb} Delivered free across mainland UK.`;
  return { title, description, ...shareMeta({ title, description, path: `/shop/${cat.slug}` }) };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const cat = CATEGORIES.find((x) => x.slug === category);
  if (!cat) notFound();
  const [products, content] = await Promise.all([getCategoryProducts(category), getRoomContent(category)]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: cat.name, path: `/shop/${cat.slug}` }])} />
      <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-tight">{cat.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{content.intro || cat.blurb}</p>
      {products.length === 0 ? (
        <p className="mt-12 rounded-2xl bg-plaster p-8 text-muted">We&rsquo;re adding pieces to this room. Check back soon.</p>
      ) : (
        <>
          <p className="tabular mt-8 text-[15px] text-muted">{products.length} piece{products.length > 1 ? "s" : ""}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} eager={i < 8} />
            ))}
          </div>
        </>
      )}
      {content.guide && (
        <section className="mt-20 max-w-3xl border-t border-line pt-10">
          <RichText text={content.guide} />
        </section>
      )}
    </div>
  );
}
