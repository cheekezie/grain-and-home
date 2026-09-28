"use client";

import { useMemo, useState } from "react";

// A category's products with filters above them. The cards are rendered on
// the server and passed in, so every product is in the page's HTML for
// search engines; filtering only shows or hides them.

export interface GridItem {
  id: string;
  card: React.ReactNode;
  inStock: boolean;
  /** Filterable details, e.g. { fit: "Relaxed fit" }. */
  details: Record<string, string>;
  /** Option values of each in-stock variant, by option name, e.g. [{ Size: "M", Colour: "Black" }]. */
  variants: Record<string, string>[];
}

export interface Facet {
  /** "detail:fit" or "option:Size" */
  id: string;
  label: string;
  values: string[];
}

export default function CategoryGrid({
  items,
  facets,
  words,
}: {
  items: GridItem[];
  facets: Facet[];
  words: { item: string; items: string };
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [inStockOnly, setInStockOnly] = useState(false);

  const shown = useMemo(() => {
    const detailFilters = Object.entries(picked).filter(([id, v]) => id.startsWith("detail:") && v.length);
    const optionFilters = Object.entries(picked).filter(([id, v]) => id.startsWith("option:") && v.length);
    return items.filter((it) => {
      if (inStockOnly && !it.inStock) return false;
      if (!detailFilters.every(([id, vals]) => vals.includes(it.details[id.slice(7)] ?? ""))) return false;
      // Chosen size and colour must be the same in-stock variant.
      if (optionFilters.length && !it.variants.some((v) => optionFilters.every(([id, vals]) => vals.includes(v[id.slice(7)] ?? "")))) return false;
      return true;
    });
  }, [items, picked, inStockOnly]);

  const active = inStockOnly || Object.values(picked).some((v) => v.length);
  const toggle = (id: string, value: string) =>
    setPicked((p) => ({ ...p, [id]: p[id]?.includes(value) ? p[id].filter((x) => x !== value) : [...(p[id] ?? []), value] }));
  const showFilters = facets.length > 0;

  return (
    <>
      {showFilters && (
        <div className="mt-8 space-y-4 rounded-2xl bg-plaster p-4 sm:p-5" role="group" aria-label="Filters">
          {facets.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2">
              <span className="mr-1 min-w-20 text-[14px] font-semibold">{f.label}</span>
              {f.values.map((v) => {
                const on = picked[f.id]?.includes(v) ?? false;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(f.id, v)}
                    className={`rounded-full border px-3.5 py-1.5 text-[14px] ${on ? "border-ink bg-ink text-white" : "border-line bg-page hover:border-ink"}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="size-4 accent-moss" />
              In stock only
            </label>
            {active && (
              <button
                type="button"
                onClick={() => {
                  setPicked({});
                  setInStockOnly(false);
                }}
                className="font-semibold underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
      <p className="tabular mt-8 text-[15px] text-muted" aria-live="polite">
        {active ? `${shown.length} of ${items.length}` : items.length} {items.length > 1 ? words.items : words.item}
      </p>
      {shown.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-plaster p-8 text-muted">Nothing matches those filters. Try removing one.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.id} className={shown.includes(it) ? "contents" : "hidden"}>
              {it.card}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
