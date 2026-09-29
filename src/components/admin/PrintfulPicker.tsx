"use client";

import { useState } from "react";
import { MAX_VARIANTS } from "@/lib/variants";

// Choose which of a Printful blank's colours and sizes to sell. Submits (GET)
// to Add product, which opens the draft from them.

interface Variant {
  color: string;
  size: string;
  price: string;
  inStock: boolean;
}

export default function PrintfulPicker({
  id,
  colors,
  sizes,
  variants,
  shopCurrency,
}: {
  id: number;
  colors: { name: string; code: string; image: string }[];
  sizes: string[];
  variants: Variant[];
  shopCurrency: string;
}) {
  const [chosenColors, setColors] = useState<string[]>([]);
  const [chosenSizes, setSizes] = useState<string[]>(sizes);
  const toggle = (list: string[], set: (l: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const combos = Math.max(colors.length ? chosenColors.length : 1, 0) * Math.max(sizes.length ? chosenSizes.length : 1, 0);
  const picked = variants.filter((v) => (!colors.length || chosenColors.includes(v.color)) && (!sizes.length || chosenSizes.includes(v.size)));
  const prices = picked.map((v) => Number(v.price)).filter(Number.isFinite);
  const outOfStock = picked.filter((v) => !v.inStock).length;
  const tooMany = combos > MAX_VARIANTS;
  const ready = combos > 0 && !tooMany;

  const costBySize = sizes.map((s) => {
    const p = variants.filter((v) => v.size === s && (!chosenColors.length || chosenColors.includes(v.color))).map((v) => Number(v.price));
    return { size: s, lo: Math.min(...p), hi: Math.max(...p) };
  });

  return (
    <form action="/admin/products/new" method="get" className="space-y-8">
      <input type="hidden" name="printful" value={id} />

      {colors.length > 0 && (
        <fieldset>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <legend className="font-semibold">Colours ({chosenColors.length} of {colors.length})</legend>
            <span className="flex gap-3 text-[14px] font-semibold">
              <button type="button" className="underline" onClick={() => setColors(colors.map((c) => c.name))}>All</button>
              <button type="button" className="underline" onClick={() => setColors([])}>None</button>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((c) => {
              const on = chosenColors.includes(c.name);
              return (
                <label key={c.name} className={`flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[14px] has-focus-visible:outline-2 has-focus-visible:outline-accent ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                  <input type="checkbox" name="colour" value={c.name} checked={on} onChange={() => toggle(chosenColors, setColors, c.name)} className="sr-only" />
                  <span aria-hidden className="size-5 rounded-full border border-black/15" style={{ background: c.code || "transparent" }} />
                  {c.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset>
          <legend className="font-semibold">Sizes ({chosenSizes.length} of {sizes.length})</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map((s) => {
              const on = chosenSizes.includes(s);
              return (
                <label key={s} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[14px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-accent ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                  <input type="checkbox" name="size" value={s} checked={on} onChange={() => toggle(chosenSizes, setSizes, s)} className="sr-only" />
                  {s}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="rounded-xl border border-line bg-white p-5">
        <p className="font-semibold">
          {combos} {combos === 1 ? "combination" : "combinations"}
          {outOfStock > 0 && <span className="font-normal text-muted">, {outOfStock} out of stock at Printful</span>}
        </p>
        {tooMany && <p className="mt-1 text-[14px] font-semibold text-danger">The most is {MAX_VARIANTS}: choose fewer colours or sizes.</p>}
        {prices.length > 0 && (
          <>
            <p className="mt-3 text-[14px] text-muted">
              Printful&rsquo;s price to you for the blank, in US dollars, before printing, shipping and tax:
            </p>
            <table className="mt-2 text-[14px] tabular">
              <tbody>
                {costBySize.filter((c) => chosenSizes.includes(c.size) && Number.isFinite(c.lo)).map((c) => (
                  <tr key={c.size}>
                    <th className="pr-4 text-left font-medium">{c.size}</th>
                    <td>${c.lo.toFixed(2)}{c.hi !== c.lo && `–$${c.hi.toFixed(2)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[14px] text-muted">
              {shopCurrency === "USD"
                ? "These go in as each combination's supplier cost. Add your print cost, then set your prices."
                : `Your shop sells in ${shopCurrency}, so costs are left for you to enter from your Printful dashboard. These dollar prices go in the product's notes.`}
            </p>
          </>
        )}
        <button disabled={!ready} className="mt-5 rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
          Continue to product editor
        </button>
        {colors.length > 0 && chosenColors.length === 0 && <p className="mt-2 text-[14px] text-muted">Choose at least one colour.</p>}
      </div>
    </form>
  );
}
