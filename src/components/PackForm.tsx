"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import QuantityStepper from "@/components/store/QuantityStepper";
import { showToast } from "@/lib/toast";
import { PURCHASABLE } from "@/lib/catalogue";
import { variantLabel, type ProductOption, type StoreVariant } from "@/lib/variants";
import { OptionPicker } from "./AddToCartForm";
import { imageFor } from "@/lib/variantImages";

export interface PackPiece {
  name: string;
  image: string | null;
  /** All the piece's photos, so the row can show the chosen colour's. */
  images?: { url: string; forValue?: string }[];
  availability: string;
  options: ProductOption[];
  variants: StoreVariant[];
  /** Options we've fixed for this piece, e.g. { Colour: "Black" }: shown, not chosen. */
  preset: Record<string, string>;
}

const canBuy = (a: string) => (PURCHASABLE as readonly string[]).includes(a);

/**
 * Buying a pack: each piece listed in order, with its own options to choose
 * (Size, Colour…). The basket gets one line for the pack, carrying the
 * choice made for every piece.
 */
export default function PackForm({
  productId,
  slug,
  name,
  price,
  image,
  pieces,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  pieces: PackPiece[];
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  // chosen[piece][option]: fixed options and single-value ones are chosen for you.
  const [chosen, setChosen] = useState<(string | null)[][]>(() =>
    pieces.map((p) => p.options.map((o) => p.preset[o.name] ?? (o.values.length === 1 ? o.values[0] : null))),
  );
  const [tried, setTried] = useState(false);

  const withOptions = (p: PackPiece) => p.options.length > 0 && p.variants.length > 0;
  const variantOf = (i: number) => {
    const p = pieces[i];
    if (!withOptions(p) || !chosen[i].every(Boolean)) return undefined;
    return p.variants.find((v) => v.values.every((x, k) => x === chosen[i][k]));
  };
  // Per piece: what's still to choose, or that the combination is sold out.
  const problem = (i: number): string | null => {
    const p = pieces[i];
    if (!withOptions(p)) return canBuy(p.availability) ? null : "Out of stock";
    const missing = p.options.findIndex((_, k) => !chosen[i][k]);
    if (missing >= 0) return `Choose a ${p.options[missing].name.toLowerCase()}`;
    const v = variantOf(i);
    return v && canBuy(v.availability) ? null : "That combination is out of stock. Choose another.";
  };

  // One piece open at a time, starting with the first that needs a choice.
  const firstOpen = () => pieces.findIndex((_, i) => problem(i));
  const [openIdx, setOpenIdx] = useState<number | null>(() => {
    const i = firstOpen();
    return i >= 0 ? i : null;
  });

  const ready = () => {
    const problems = pieces.map((_, i) => problem(i));
    if (problems.some(Boolean)) {
      setTried(true);
      setOpenIdx(problems.findIndex(Boolean));
      return null;
    }
    return {
      choices: pieces.map((_, i) => variantOf(i)?.id ?? ""),
      pieces: pieces.map((p, i) => {
        const v = variantOf(i);
        return v ? `${p.name}, ${variantLabel(v.values)}` : p.name;
      }),
    };
  };

  const choose = (i: number, k: number, val: string) => {
    const next = chosen.map((row, r) => (r === i ? row.map((x, j) => (j === k ? val : x)) : row));
    setChosen(next);
    // Piece done: move on to the next one still needing a choice.
    const p = pieces[i];
    const v = next[i].every(Boolean) ? p.variants.find((x) => x.values.every((y, j) => y === next[i][j])) : undefined;
    if (v && canBuy(v.availability)) {
      const later = pieces.findIndex((q, n) => n > i && withOptions(q) && !next[n].every(Boolean));
      const earlier = pieces.findIndex((q, n) => n < i && withOptions(q) && !next[n].every(Boolean));
      setOpenIdx(later >= 0 ? later : earlier >= 0 ? earlier : null);
    }
  };

  /** One line about a piece: what's chosen, or what's still to choose. */
  const summary = (i: number) => {
    const p = pieces[i];
    if (!withOptions(p)) return canBuy(p.availability) ? "Included" : "Out of stock";
    const picked = p.options.map((o, k) => chosen[i][k]).filter(Boolean) as string[];
    const missing = p.options.filter((_, k) => !chosen[i][k]).map((o) => o.name.toLowerCase());
    return [picked.join(" · "), missing.length ? `choose ${missing.join(" and ")}` : ""].filter(Boolean).join(" · ");
  };

  const done = pieces.filter((_, i) => !problem(i)).length;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-baseline justify-between text-[14px]">
        <p className="font-semibold">In this pack</p>
        <p className="tabular text-muted" aria-live="polite">{done} of {pieces.length} ready</p>
      </div>
      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {pieces.map((p, i) => {
          const err = tried ? problem(i) : null;
          const ok = !problem(i);
          const open = openIdx === i && withOptions(p);
          const panelId = `pack-piece-${i}`;
          return (
            <li key={i}>
              <button
                type="button"
                aria-expanded={withOptions(p) ? open : undefined}
                aria-controls={withOptions(p) ? panelId : undefined}
                onClick={() => withOptions(p) && setOpenIdx(open ? null : i)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${withOptions(p) ? "hover:bg-plaster" : "cursor-default"}`}
              >
                <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-plaster">
                  {(imageFor(p.images ?? [], chosen[i])?.url ?? p.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageFor(p.images ?? [], chosen[i])?.url ?? p.image ?? ""} alt="" className="absolute inset-0 size-full object-contain mix-blend-multiply" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    <span className="text-muted">{i + 1}.</span> {p.name}
                  </span>
                  <span className={`block truncate text-[13px] ${err ? "font-semibold text-danger" : "text-muted"}`}>{err ?? summary(i)}</span>
                </span>
                {ok ? (
                  <span aria-label="Ready" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-moss text-white">
                    <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>
                  </span>
                ) : withOptions(p) ? (
                  <svg aria-hidden viewBox="0 0 20 20" className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l5 5 5-5" /></svg>
                ) : null}
              </button>
              {open && (
                <div id={panelId} className="space-y-3 border-t border-line bg-plaster/40 px-3 pb-3 pt-2.5">
                  {p.options.map((o, k) =>
                    p.preset[o.name] ? null : (
                      <OptionPicker
                        key={o.name}
                        compact
                        option={o}
                        value={chosen[i][k]}
                        isAvailable={(val) =>
                          p.variants.some((v) => canBuy(v.availability) && v.values[k] === val && v.values.every((x, j) => j === k || !chosen[i][j] || chosen[i][j] === x))
                        }
                        onChange={(val) => choose(i, k, val)}
                      />
                    ),
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-3">
        <span className="text-[15px] text-muted">Quantity</span>
        <QuantityStepper value={quantity} onChange={setQuantity} label={`Quantity of ${name}`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            const line = ready();
            if (!line) return;
            router.push(`/checkout?buy=${encodeURIComponent(slug)}&qty=${quantity}&p=${encodeURIComponent(line.choices.join("|"))}`);
          }}
          className="rounded-full bg-moss px-8 py-3.5 text-[16px] font-semibold text-white hover:bg-moss-deep"
        >
          Buy now
        </button>
        <button
          type="button"
          onClick={() => {
            const line = ready();
            if (!line) return;
            addItem({ productId, slug, name, image, price, ...line }, quantity);
            setAdded(true);
            showToast({ title: "Added to your basket", body: quantity > 1 ? `${quantity} × ${name}` : name, image, action: { label: "View basket", href: "/basket" } });
          }}
          className="rounded-full border-2 border-ink px-8 py-3 text-[16px] font-semibold hover:bg-ink hover:text-white"
        >
          Add to basket
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-[15px]">
        {added && (
          <>
            Added to your basket. <Link href="/basket" className="font-semibold text-moss underline underline-offset-2">View basket</Link>
          </>
        )}
      </p>
    </div>
  );
}
