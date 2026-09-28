import Link from "next/link";
import ShopImage from "@/components/store/ShopImage";
import { formatPrice } from "@/lib/money";
import type { StoreProduct } from "@/lib/types";

/** "Save with a pack": packs that include the product being viewed. */
export default function PackSuggestions({ packs }: { packs: { product: StoreProduct; contents: string[]; saving: number }[] }) {
  if (!packs.length) return null;
  return (
    <section className="mt-16" aria-labelledby="pack-suggestions">
      <h2 id="pack-suggestions" className="font-display text-3xl">Save with a pack</h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {packs.map(({ product: p, contents, saving }) => (
          <li key={p.id}>
            <Link href={`/products/${p.slug}`} className="group flex gap-4 rounded-2xl border border-line bg-page p-3 hover:border-ink">
              <span className="relative block size-28 shrink-0 overflow-hidden rounded-xl bg-plaster sm:size-32">
                {p.images[0] && <ShopImage src={p.images[0].url} alt="" sizes="128px" className="object-contain p-2 mix-blend-multiply" />}
              </span>
              <span className="flex min-w-0 flex-col justify-center py-1">
                <span className="font-semibold group-hover:text-moss">{p.name}</span>
                <span className="mt-1 text-[14px] text-muted">{contents.join(", ")}</span>
                <span className="tabular mt-2 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">{formatPrice(p.price)}</span>
                  {saving > 0 && <span className="rounded-full bg-moss-soft px-2.5 py-0.5 text-[13px] font-semibold text-moss">Save at least {formatPrice(saving)}</span>}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
