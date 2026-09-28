import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartForm from "@/components/AddToCartForm";
import PackForm from "@/components/PackForm";
import ProductGallery from "@/components/store/ProductGallery";
import PaymentMethods from "@/components/store/PaymentMethods";
import { AVAILABILITY_LABELS, DELIVERY_LABELS, PURCHASABLE } from "@/lib/catalogue";
import { getCategoryNames, getShopSettings } from "@/lib/shop/server";
import { detailRows } from "@/lib/shop/details";
import { deliveryAreaName } from "@/lib/shop/types";
import { priceRange } from "@/lib/variants";
import { formatPrice } from "@/lib/money";
import { getPackPieces, getProduct, getRelated } from "@/lib/store";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/store/ProductCard";
import { breadcrumbJsonLd, productJsonLd, shareMeta } from "@/lib/seo";
import { getAnnouncedPromo } from "@/lib/promos";
import { formatLondonDay } from "@/lib/londonDate";
import SaveButton from "@/components/store/SaveButton";
import StockAlertForm from "@/components/store/StockAlertForm";
import CopyCode from "@/components/store/CopyCode";
import { RecentlyViewed, RecordView } from "@/components/store/ShopperRows";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const [p, shop] = await Promise.all([getProduct((await params).slug), getShopSettings()]);
  if (!p) return {};
  const description = `${p.summary} ${formatPrice(p.price)}, free delivery to ${deliveryAreaName(shop.delivery.area)}.`;
  return { title: p.name, description, ...shareMeta({ title: p.name, description, path: `/products/${p.slug}`, image: p.images[0]?.url }) };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  // With options, it can be bought if at least one combination is in stock;
  // a pack, if every piece can be.
  const inStock = (x: { availability: (typeof PURCHASABLE)[number] | string; variants: { availability: string }[] }) =>
    (PURCHASABLE as readonly string[]).includes(x.availability) && (!x.variants.length || x.variants.some((v) => (PURCHASABLE as readonly string[]).includes(v.availability)));
  const pieces = await getPackPieces(p.packSlots);
  // A pack piece counts as in stock if some in-stock combination keeps the options we fixed for it.
  const pieceInStock = (x: (typeof pieces)[number], i: number) => {
    const preset = p.packPresets[i] ?? {};
    const fits = (values: string[]) => x.options.every((o, k) => !preset[o.name] || values[k] === preset[o.name]);
    return (PURCHASABLE as readonly string[]).includes(x.availability) && (!x.variants.length || x.variants.some((v) => (PURCHASABLE as readonly string[]).includes(v.availability) && fits(v.values)));
  };
  const purchasable = inStock(p) && pieces.every(pieceInStock);
  const range = priceRange(p);
  const [promo, related, shop, categoryName] = await Promise.all([getAnnouncedPromo(), getRelated(p.id, p.category), getShopSettings(), getCategoryNames()]);
  const area = deliveryAreaName(shop.delivery.area);
  const catName = categoryName(p.category);
  const promoApplies =
    promo && (promo.scope === "all" || (promo.scope === "products" ? promo.productIds.includes(p.id) : promo.categories.includes(p.category)));
  const shopperItem = { productId: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null };
  const rows = detailRows(shop.details, p.details);
  // Short details go in the table; long ones (ingredients, care) get their own section below.
  const specs = rows.filter(([, , f]) => f.kind !== "longtext");
  const longDetails = rows.filter(([, , f]) => f.kind === "longtext");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <JsonLd
        data={[
          productJsonLd(p, { categoryName: catName, deliveryArea: shop.delivery.area, details: shop.details }),
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: catName, path: `/shop/${p.category}` }, { name: p.name, path: `/products/${p.slug}` }]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="text-[14px] text-muted">
        <Link href={`/shop/${p.category}`} className="hover:text-moss hover:underline">{catName}</Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery images={p.images} name={p.name} />

        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight">{p.name}</h1>
          <p className="tabular mt-3 text-2xl font-semibold">
            {range.min === range.max ? formatPrice(range.min) : `${formatPrice(range.min)} – ${formatPrice(range.max)}`}
          </p>
          <p className="mt-1 text-[14px] text-muted">Including VAT and delivery to {area}</p>

          <p className={`mt-5 text-[15px] font-medium ${purchasable ? "text-moss" : "text-danger"}`}>
            {purchasable ? AVAILABILITY_LABELS[p.availability] : AVAILABILITY_LABELS[p.availability === "discontinued" ? "discontinued" : "out_of_stock"]}
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

          {pieces.length > 0 && purchasable ? (
            <PackForm
              productId={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              image={p.images[0]?.url ?? null}
              pieces={pieces.map((x, i) => ({ name: x.name, image: x.images[0]?.url ?? null, availability: x.availability, options: x.options, variants: x.variants, preset: p.packPresets[i] ?? {} }))}
            />
          ) : purchasable && !pieces.length ? (
          <AddToCartForm
            productId={p.id}
            slug={p.slug}
            name={p.name}
            price={p.price}
            image={p.images[0]?.url ?? null}
            purchasable={purchasable}
            options={p.options}
            variants={p.variants}
          />
          ) : null}
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
              <li>{shop.delivery.twoPerson ? DELIVERY_LABELS[p.deliveryType] : "Delivery"}, free to {area}.{p.deliveryEstimate && ` ${p.deliveryEstimate}.`}</li>
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
        <h2 className="font-display text-3xl">{shop.words.aboutItem}</h2>
        <div className="mt-4 whitespace-pre-line text-[16px] leading-relaxed">{p.description}</div>
        {longDetails.map(([label, value]) => (
          <div key={label} className="mt-8">
            <h3 className="font-display text-2xl">{label}</h3>
            <div className="mt-3 whitespace-pre-line text-[16px] leading-relaxed">{value}</div>
          </div>
        ))}
      </section>
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
      <RecordView item={shopperItem} />
      <RecentlyViewed exclude={p.id} />
    </div>
  );
}
