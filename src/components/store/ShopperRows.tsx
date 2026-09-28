"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoreProduct } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { AVAILABILITY_LABELS } from "@/lib/catalogue";
import { recentItems, recordViewed, savedItems, type ShopperItem } from "@/lib/shopperLists";
import SaveButton from "./SaveButton";
import { priceRange } from "@/lib/variants";
import { useShopWords } from "./ShopWords";
import ShopImage from "@/components/store/ShopImage";

/** Fetch current details (price, stock) for items stored in the browser. */
function useCurrent(items: ShopperItem[]) {
  const ids = items.map((i) => i.productId).join(",");
  const [data, setData] = useState<{
    ids: string;
    products: StoreProduct[];
  } | null>(null);
  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    fetch(`/api/products?ids=${ids}`)
      .then((r) => r.json())
      .then((products: StoreProduct[]) => {
        if (!cancelled) setData({ ids, products });
      })
      .catch(() => {
        if (!cancelled) setData({ ids, products: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);
  if (!ids) return { loading: false, products: [] as StoreProduct[] };
  if (!data || data.ids !== ids) return { loading: true, products: [] as StoreProduct[] };
  const byId = new Map(data.products.map((p) => [p.id, p]));
  return {
    loading: false,
    products: items.map((i) => byId.get(i.productId)).filter((p): p is StoreProduct => !!p),
  };
}

function MiniCard({ p }: { p: StoreProduct }) {
  const img = p.images[0];
  return (
    <div className="relative">
      <Link href={`/products/${p.slug}`} className="group block">
        <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-plaster">
          {img && (
            <ShopImage
              src={img.url}
              alt={img.alt || p.name}
              sizes="(min-width: 768px) 25vw, 50vw"
              // Cut-outs sit whole on the panel; photos with their own background fill the card.
              className={img.cutout === false ? "object-cover mix-blend-multiply" : "object-contain p-5 mix-blend-multiply"}
            />
          )}
          {p.availability === "out_of_stock" && (
            <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-medium">
              {AVAILABILITY_LABELS.out_of_stock}
            </span>
          )}
        </span>
        <span className="mt-2 block text-[15px] leading-snug group-hover:text-moss">{p.name}</span>
        <span className="tabular block font-semibold">{(({ min, max }) => (min === max ? formatPrice(min) : `From ${formatPrice(min)}`))(priceRange(p))}</span>
      </Link>
      <span className="absolute right-2 top-2">
        <SaveButton
          variant="icon"
          item={{
            productId: p.id,
            slug: p.slug,
            name: p.name,
            image: img?.url ?? null,
          }}
        />
      </span>
    </div>
  );
}

/** Adds the product to "recently viewed". Renders nothing. */
export function RecordView({ item }: { item: ShopperItem }) {
  useEffect(() => {
    recordViewed(item);
  }, [item]);
  return null;
}

export function RecentlyViewed({ exclude, title = "Recently viewed" }: { exclude?: string; title?: string }) {
  const items = recentItems
    .useList()
    .filter((i) => i.productId !== exclude)
    .slice(0, 4);
  const { products } = useCurrent(items);
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
        {products.map((p) => (
          <MiniCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

export function SavedList() {
  const words = useShopWords();
  const items = savedItems.useList();
  const { loading, products } = useCurrent(items);
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl bg-plaster p-8">
        <p className="text-lg">Nothing saved yet.</p>
        <p className="mt-1 text-muted">Tap the heart on any {words.item} to keep it here for later.</p>
        <Link href="/" className="mt-3 inline-block font-semibold text-moss underline underline-offset-2">
          {words.browse}
        </Link>
      </div>
    );
  }
  if (loading) return <div className="mt-8 h-64 animate-pulse rounded-2xl bg-plaster" aria-label="Loading saved items" />;
  const gone = items.length - products.length;
  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
        {products.map((p) => (
          <MiniCard key={p.id} p={p} />
        ))}
      </div>
      {gone > 0 && (
        <p className="mt-6 text-[14px] text-muted">
          {gone} saved item{gone > 1 ? "s are" : " is"} no longer sold.
        </p>
      )}
      <p className="mt-6 text-[13px] text-muted">Saved items are kept on this device only.</p>
    </>
  );
}
