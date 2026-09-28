import Link from "next/link";
import type { StoreProduct } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { AVAILABILITY_LABELS } from "@/lib/catalogue";
import SaveButton from "./SaveButton";
import QuickAdd from "./QuickAdd";
import { priceRange } from "@/lib/variants";
import ShopImage from "@/components/store/ShopImage";

// The photo and the name/price are separate links to the same page (the
// photo one is skipped by keyboard and screen readers), so the Save and
// Add buttons can sit on the photo without being nested inside a link.
export default function ProductCard({ product: p, eager = false }: { product: StoreProduct; eager?: boolean }) {
  const img = p.images[0];
  const unavailable = p.availability === "out_of_stock";
  const href = `/products/${p.slug}`;
  const range = priceRange(p);
  // Options or a pack: chosen on the product page, so no quick add.
  const withOptions = p.variants.length > 0 || p.packSlots.length > 0;
  return (
    <div className="group">
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-plaster">
          {img ? (
            <ShopImage
              src={img.url}
              alt=""
              sizes="(min-width: 768px) 25vw, 50vw"
              eager={eager}
              className="object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">Photo coming soon</span>
          )}
          {unavailable && (
            <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[13px] font-medium">{AVAILABILITY_LABELS.out_of_stock}</span>
          )}
        </Link>
        <span className="absolute right-2 top-2">
          <SaveButton variant="icon" item={{ productId: p.id, slug: p.slug, name: p.name, image: img?.url ?? null }} />
        </span>
        {/* Products with options (Size…) are added from their page, once a choice is made. */}
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
