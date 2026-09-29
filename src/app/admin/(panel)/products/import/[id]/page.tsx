import { notFound } from "next/navigation";
import EditHeader from "@/components/admin/EditHeader";
import PrintfulPicker from "@/components/admin/PrintfulPicker";
import { printfulProduct, productName } from "@/lib/admin/printful";
import { CURRENCY } from "@/lib/money";

export const metadata = { title: "Import from Printful" };

export default async function PrintfulProductPage({ params }: PageProps<"/admin/products/import/[id]">) {
  const { id } = await params;
  const p = await printfulProduct(Number(id));
  if (!p) notFound();

  return (
    <div className="w-full">
      <EditHeader backHref="/admin/products/import" backLabel="the Printful catalogue" title={productName(p.title)} />
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
          colors={p.colors}
          sizes={p.sizes}
          variants={p.variants.map((v) => ({ color: v.color, size: v.size, price: v.price, inStock: v.inStock }))}
          shopCurrency={CURRENCY}
        />
      </div>
    </div>
  );
}
