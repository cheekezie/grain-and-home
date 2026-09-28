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

export interface PackPiece {
  name: string;
  image: string | null;
  availability: string;
  options: ProductOption[];
  variants: StoreVariant[];
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
  // chosen[piece][option]; single-value options are chosen for you.
  const [chosen, setChosen] = useState<(string | null)[][]>(() => pieces.map((p) => p.options.map((o) => (o.values.length === 1 ? o.values[0] : null))));
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

  const ready = () => {
    const problems = pieces.map((_, i) => problem(i));
    if (problems.some(Boolean)) {
      setTried(true);
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

  return (
    <div className="mt-6 space-y-4">
      <ol className="space-y-5">
        {pieces.map((p, i) => {
          const err = tried ? problem(i) : null;
          return (
            <li key={i} className="rounded-xl border border-line p-4">
              <p className="font-semibold">
                <span className="text-muted">{i + 1}.</span> {p.name}
              </p>
              {withOptions(p) ? (
                <div className="mt-3 space-y-4">
                  {p.options.map((o, k) => (
                    <OptionPicker
                      key={o.name}
                      option={o}
                      value={chosen[i][k]}
                      isAvailable={(val) =>
                        p.variants.some((v) => canBuy(v.availability) && v.values[k] === val && v.values.every((x, j) => j === k || !chosen[i][j] || chosen[i][j] === x))
                      }
                      onChange={(val) => setChosen((c) => c.map((row, r) => (r === i ? row.map((x, j) => (j === k ? val : x)) : row)))}
                    />
                  ))}
                </div>
              ) : null}
              {err && <p className="mt-2 text-[14px] font-semibold text-danger">{err}</p>}
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
