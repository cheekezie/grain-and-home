import { notFound } from "next/navigation";
import EditHeader from "@/components/admin/EditHeader";
import PrintfulPicker from "@/components/admin/PrintfulPicker";
import { printfulProduct, productName } from "@/lib/admin/printful";
import { CURRENCY } from "@/lib/money";
import { fxRate } from "@/lib/admin/fx";
import { printfulImports } from "@/lib/admin/queries";
import Link from "next/link";

export const metadata = { title: "Import from Printful" };

export default async function PrintfulProductPage({ params, searchParams }: PageProps<"/admin/products/import/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const [p, fx, imports] = await Promise.all([printfulProduct(Number(id)), fxRate("USD", CURRENCY), printfulImports()]);
  if (!p) notFound();
  const mine = imports.get(p.id) ?? [];

  return (
    <div className="w-full">
      <EditHeader backHref={`/admin/products/import${q ? `?q=${encodeURIComponent(q)}` : ""}`} backLabel={q ? "the search results" : "the Printful catalogue"} title={productName(p.title)} />
      {mine.length > 0 && (
        <p role="status" className="-mt-4 mb-8 max-w-[70ch] rounded-lg bg-notice p-3 text-[15px]">
          Already imported as{" "}
          {mine.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ", "}
              <Link href={`/admin/products/${m.id}`} className="font-semibold underline">{m.name}</Link> ({m.status === "published" ? "live" : "draft"})
            </span>
          ))}
          . Importing again makes another product, e.g. for a different set of colours.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Printful's catalogue photo, admin only */}
          <img src={p.image} alt="" loading="eager" className="aspect-square w-full rounded-xl border border-line bg-white object-contain" />
          <p className="mt-3 text-[14px] text-muted">
            {p.title}. Printful product {p.id}, {p.variants.length} variants.
          </p>
          <details className="mt-3 text-[15px]">
            <summary className="cursor-pointer font-semibold">Printful&rsquo;s description</summary>
            <p className="mt-2 whitespace-pre-line text-muted">{p.description}</p>
          </details>
        </div>
        <PrintfulPicker
          id={p.id}
          q={q}
          colors={p.colors}
          sizes={p.sizes}
          variants={p.variants.map((v) => ({ color: v.color, size: v.size, price: v.price, inStock: v.inStock }))}
          shopCurrency={CURRENCY}
          fx={fx && { rate: fx.rate, date: fx.date }}
        />
      </div>
    </div>
  );
}
