"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import QuantityStepper from "@/components/store/QuantityStepper";
import { showToast } from "@/lib/toast";
import { formatPrice } from "@/lib/money";
import { PURCHASABLE } from "@/lib/catalogue";
import { variantLabel, type ProductOption, type StoreVariant } from "@/lib/variants";
import { CHOICE_EVENT, imageFor, type ChoiceDetail } from "@/lib/variantImages";
import type { ProductImage } from "@/lib/types";

const canBuy = (v: StoreVariant) => (PURCHASABLE as readonly string[]).includes(v.availability);

export default function AddToCartForm({
  productId,
  slug,
  name,
  price,
  image,
  purchasable,
  options = [],
  variants = [],
  images = [],
}: {
  /** All the product's photos: the one for the chosen colour goes in the basket. */
  images?: ProductImage[];
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  purchasable: boolean;
  options?: ProductOption[];
  variants?: StoreVariant[];
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  // One chosen value per option; an option with a single value is chosen for you.
  const [chosen, setChosen] = useState<(string | null)[]>(() => options.map((o) => (o.values.length === 1 ? o.values[0] : null)));
  const [missing, setMissing] = useState(false);

  // Tell the gallery what's chosen, so it can show that colour's photo.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<ChoiceDetail>(CHOICE_EVENT, { detail: { productId, values: chosen } }));
  }, [chosen, productId]);

  // A link to one combination (?v=m--black, e.g. from Google Shopping) arrives with it chosen.
  // Read after hydration so the cached page's HTML stays the same for everyone.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v");
    const v = id ? variants.find((x) => x.id === id) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off sync from the URL
    if (v) setChosen(v.values);
  }, [variants]);

  if (!purchasable) {
    return null; // the product page shows the back-in-stock form instead
  }

  const withOptions = options.length > 0 && variants.length > 0;
  const variant = withOptions && chosen.every(Boolean) ? variants.find((v) => v.values.every((x, i) => x === chosen[i])) : undefined;
  const firstMissing = options.findIndex((_, i) => !chosen[i]);

  // A value can be picked if some in-stock variant has it together with the other choices so far.
  const available = (optionIndex: number, value: string) =>
    variants.some((v) => canBuy(v) && v.values[optionIndex] === value && v.values.every((x, i) => i === optionIndex || !chosen[i] || chosen[i] === x));

  /** What's being bought, or null (and a prompt) until each option is chosen. */
  const ready = (): { variantId?: string; variant?: string; price: number } | null => {
    if (!withOptions) return { price };
    if (!variant || !canBuy(variant)) {
      setMissing(true);
      return null;
    }
    return { variantId: variant.id, variant: variantLabel(variant.values), price: variant.price };
  };

  return (
    <div className="mt-6 space-y-4">
      {withOptions && (
        <div className="space-y-5">
          {options.map((o, i) => (
            <OptionPicker
              key={o.name}
              option={o}
              value={chosen[i]}
              isAvailable={(v) => available(i, v)}
              onChange={(v) => {
                setChosen((c) => c.map((x, j) => (j === i ? v : x)));
                setMissing(false);
              }}
              error={missing && i === firstMissing ? `Choose a ${o.name.toLowerCase()}` : undefined}
            />
          ))}
          {chosen.every(Boolean) && (!variant || !canBuy(variant)) && (
            <p className="text-[15px] font-semibold text-danger">That combination is out of stock. Choose another.</p>
          )}
          {variant && variant.price !== price && (
            <p className="tabular text-lg font-semibold">
              {formatPrice(variant.price)} <span className="text-[15px] font-normal text-muted">for {variantLabel(variant.values)}</span>
            </p>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-[15px] text-muted">Quantity</span>
        <QuantityStepper value={quantity} onChange={setQuantity} label={`Quantity of ${name}`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Buy now skips the basket entirely: straight to checkout with just this item. */}
        <button
          type="button"
          onClick={() => {
            const line = ready();
            if (!line) return;
            router.push(`/checkout?buy=${encodeURIComponent(slug)}&qty=${quantity}${line.variantId ? `&v=${encodeURIComponent(line.variantId)}` : ""}`);
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
            const photo = imageFor(images, chosen)?.url ?? image;
            addItem({ productId, slug, name, image: photo, ...line }, quantity);
            setAdded(true);
            const label = line.variant ? `${name}, ${line.variant}` : name;
            showToast({
              title: "Added to your basket",
              body: quantity > 1 ? `${quantity} × ${label}` : label,
              image: photo,
              action: { label: "View basket", href: "/basket" },
            });
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

/** One option as a row of choice buttons (real radio inputs, so keyboard and screen readers work). */
export function OptionPicker({
  option,
  value,
  onChange,
  isAvailable,
  error,
  compact = false,
}: {
  /** Smaller buttons (inside packs). */
  compact?: boolean;
  option: ProductOption;
  value: string | null;
  onChange: (v: string) => void;
  isAvailable: (v: string) => boolean;
  error?: string;
}) {
  const name = useId();
  return (
    <fieldset aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined}>
      <legend className="text-[15px]">
        <span className="font-semibold">{option.name}</span>
        {value && <span className="text-muted">: {value}</span>}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {option.values.map((v) => {
          const ok = isAvailable(v);
          return (
            <label
              key={v}
              className={`relative cursor-pointer rounded-full border text-center ${compact ? "min-w-10 px-3 py-1.5 text-[14px]" : "min-w-12 px-4 py-2 text-[15px]"} has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moss ${
                value === v ? "border-ink bg-ink text-white" : ok ? "border-line bg-white hover:border-ink" : "cursor-not-allowed border-line bg-plaster text-muted line-through"
              }`}
            >
              <input type="radio" name={name} value={v} checked={value === v} disabled={!ok} onChange={() => onChange(v)} className="sr-only" />
              {v}
              {!ok && <span className="sr-only"> (out of stock)</span>}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${name}-err`} className="mt-1.5 text-[14px] font-semibold text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
