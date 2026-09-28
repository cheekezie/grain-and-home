import Link from "next/link";
import type { StoreProduct } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { AVAILABILITY_LABELS } from "@/lib/catalogue";
import SaveButton from "./SaveButton";
import QuickAdd from "./QuickAdd";
import ShopImage from "@/components/store/ShopImage";
import { priceRange } from "@/lib/variants";
import { getShopSettings } from "@/lib/shop/server";

// The photo and the name/price are separate links to the same page (the
// photo one is skipped by keyboard and screen readers), so the Save and
// Add buttons can sit on the photo without being nested inside a link.
//
// The photo follows the shop's card style (Shop settings → Look):
// panel = whole product on the panel colour; fill = photo covers the card;
// masonry = photo at its natural shape (the grid lays them out in columns).
export default async function ProductCard({ product: p, eager = false }: { product: StoreProduct; eager?: boolean }) {
  const cards = (await getShopSettings()).theme?.cards ?? "panel";
  const img = p.images[0];
  const unavailable = p.availability === "out_of_stock";
  const href = `/products/${p.slug}`;
  const range = priceRange(p);
  // Options or a pack: chosen on the product page, so no quick add.
  const withOptions = p.variants.length > 0 || p.packSlots.length > 0;
  return (
    <div className={cards === "masonry" ? "group mb-10 break-inside-avoid" : "group"}>
      <div className="relative">
        {cards === "masonry" ? (
          <Link href={href} tabIndex={-1} aria-hidden className="relative block overflow-hidden rounded-xl bg-plaster">
            {img ? (
              // Natural size: the photo decides the card's height.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.url}
                alt=""
                loading={eager ? "eager" : "lazy"}
                className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            ) : (
              <span className="flex aspect-[4/5] items-center justify-center text-[13px] text-muted">Photo coming soon</span>
            )}
            {unavailable && <OutOfStock />}
          </Link>
        ) : (
          <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-plaster">
            {img ? (
              <ShopImage
                src={img.url}
                alt=""
                sizes="(min-width: 768px) 25vw, 50vw"
                eager={eager}
                className={
                  cards === "fill"
                    ? "object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    : "object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.03]"
                }
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">Photo coming soon</span>
            )}
            {unavailable && <OutOfStock />}
          </Link>
        )}
        <span className="absolute right-2 top-2">
          <SaveButton variant="icon" item={{ productId: p.id, slug: p.slug, name: p.name, image: img?.url ?? null }} />
        </span>
        {!unavailable && !withOptions && (
          <span className="absolute bottom-2 right-2">
            <QuickAdd item={{ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: img?.url ?? null }} />
          </span>
        )}
      </div>
      <Link href={href} className="block">
        <span className="mt-3 block text-[15px] leading-snug group-hover:text-moss">{p.name}</span>
        <span className="tabular mt-0.5 block font-semibold">{range.min === range.max ? formatPrice(range.min) : `From ${formatPrice(range.min)}`}</span>
      </Link>
    </div>
  );
}

function OutOfStock() {
  return <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[13px] font-medium">{AVAILABILITY_LABELS.out_of_stock}</span>;
}
