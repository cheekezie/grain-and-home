import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartForm from "@/components/AddToCartForm";
import ProductGallery from "@/components/store/ProductGallery";
import PaymentMethods from "@/components/store/PaymentMethods";
import { AVAILABILITY_LABELS, DELIVERY_LABELS, PURCHASABLE, categoryName } from "@/lib/catalogue";
import { formatPrice } from "@/lib/money";
import { getProduct } from "@/lib/store";
import { getAnnouncedPromo } from "@/lib/promos";
import { formatLondonDay } from "@/lib/londonDate";
import SaveButton from "@/components/store/SaveButton";
import StockAlertForm from "@/components/store/StockAlertForm";
import CopyCode from "@/components/store/CopyCode";
import { RecentlyViewed, RecordView } from "@/components/store/ShopperRows";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return p ? { title: p.name, description: p.summary, openGraph: p.images[0] ? { images: [p.images[0].url] } : undefined } : {};
}

const ASSEMBLY = { none: "Arrives assembled", partial: "Some assembly required", required: "Self-assembly required" } as const;

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const purchasable = PURCHASABLE.includes(p.availability);
  const promo = await getAnnouncedPromo();
  const promoApplies =
    promo && (promo.scope === "all" || (promo.scope === "products" ? promo.productIds.includes(p.id) : promo.categories.includes(p.category)));
  const shopperItem = { productId: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null };
  const dims = [p.widthCm && `W ${p.widthCm} cm`, p.depthCm && `D ${p.depthCm} cm`, p.heightCm && `H ${p.heightCm} cm`].filter(Boolean).join(" × ");

  const specs: [string, string][] = [
    ["Dimensions", dims],
    ["Weight", p.weightKg ? `${p.weightKg} kg` : ""],
    ["Materials", p.materials],
    ["Colour", p.colour],
    ["Assembly", ASSEMBLY[p.assembly]],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-[14px] text-muted">
        <Link href={`/shop/${p.category}`} className="hover:text-moss hover:underline">{categoryName(p.category)}</Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery images={p.images} name={p.name} />

        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight">{p.name}</h1>
          <p className="tabular mt-3 text-2xl font-semibold">{formatPrice(p.price)}</p>
          <p className="mt-1 text-[14px] text-muted">Including VAT and delivery to mainland UK</p>

          <p className={`mt-5 text-[15px] font-medium ${purchasable ? "text-moss" : "text-danger"}`}>
            {AVAILABILITY_LABELS[p.availability]}
            {purchasable && p.deliveryEstimate && <span className="font-normal text-ink">: {p.deliveryEstimate}</span>}
          </p>

          <p className="mt-4 text-[16px]">{p.summary}</p>

          {promo && promoApplies && purchasable && (
            <p className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-moss-soft px-4 py-3 text-[15px]">
              <span className="font-semibold">{promo.headline}</span> with code <CopyCode code={promo.code} />
              <span className="text-muted">
                {promo.minSpend ? `on orders over ${formatPrice(promo.minSpend)}` : ""}
                {promo.minSpend && promo.expiresAt ? ", " : ""}
                {promo.expiresAt ? `ends ${formatLondonDay(promo.expiresAt)}` : ""}
              </span>
            </p>
          )}

          {!purchasable && <StockAlertForm productId={p.id} />}

          <AddToCartForm
            productId={p.id}
            slug={p.slug}
            name={p.name}
            price={p.price}
            image={p.images[0]?.url ?? null}
            purchasable={purchasable}
          />
          <div className="mt-4"><SaveButton item={shopperItem} /></div>
          <div className="mt-6">
            <PaymentMethods compact />
          </div>

          {specs.length > 0 && (
            <dl className="mt-10 divide-y divide-line border-y border-line text-[15px]">
              {specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <section className="mt-8 rounded-2xl bg-plaster p-5 text-[15px]">
            <h2 className="font-semibold">Delivery and returns</h2>
            <ul className="mt-2 space-y-1.5">
              <li>{DELIVERY_LABELS[p.deliveryType]}, free to mainland UK.{p.deliveryEstimate && ` ${p.deliveryEstimate}.`}</li>
              <li>
                You can cancel within 14 days of delivery.{" "}
                {p.returnCost != null
                  ? p.returnCost === 0
                    ? "Returns are free."
                    : `If you change your mind, returning this item costs ${formatPrice(p.returnCost)}.`
                  : "If you change your mind, we'll confirm the return cost before collection."}{" "}
                Faulty or damaged items are always returned free.
              </li>
            </ul>
            <Link href="/returns" className="mt-2 inline-block font-semibold text-moss underline underline-offset-2">Returns and cancellations</Link>
          </section>
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="font-display text-3xl">About this piece</h2>
        <div className="mt-4 whitespace-pre-line text-[16px] leading-relaxed">{p.description}</div>
      </section>
      <RecordView item={shopperItem} />
      <RecentlyViewed exclude={p.id} />
    </div>
  );
}
