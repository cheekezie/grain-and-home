"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { gridClass, masonryClass } from "./gridClasses";

// A category's products with filters above them. The cards are rendered on
// the server and passed in, so every product is in the page's HTML for
// search engines; filtering only shows or hides them.
//
// Filters take one row however many values there are: a small button per
// filter that opens a floating panel (desktop), or one "Filters" button that
// opens a sheet from the bottom (phones). Chosen values show as chips.

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

type Picked = Record<string, string[]>;

export default function CategoryGrid({
  items,
  facets,
  words,
  masonry = false,
}: {
  items: GridItem[];
  facets: Facet[];
  words: { item: string; items: string };
  /** Staggered columns instead of a grid (shop card style "masonry"). */
  masonry?: boolean;
}) {
  const [picked, setPicked] = useState<Picked>({});
  const [inStockOnly, setInStockOnly] = useState(false);
  // Which panel is open: a facet id, "sheet" (phones), or none.
  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

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

  // Close a floating panel on a click outside it or Escape.
  useEffect(() => {
    if (!open || open === "sheet") return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chips = facets.flatMap((f) => (picked[f.id] ?? []).map((v) => ({ facet: f, value: v })));
  const count = chips.length + (inStockOnly ? 1 : 0);
  const toggle = (id: string, value: string) =>
    setPicked((p) => ({ ...p, [id]: p[id]?.includes(value) ? p[id].filter((x) => x !== value) : [...(p[id] ?? []), value] }));
  const clear = () => {
    setPicked({});
    setInStockOnly(false);
  };
  const noun = (n: number) => `${n} ${n === 1 ? words.item : words.items}`;

  return (
    <>
      <div ref={barRef} className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        {/* Phones: one button for everything. */}
        <button
          type="button"
          onClick={() => setOpen("sheet")}
          className="flex items-center gap-2 rounded-full border border-line bg-page px-4 py-2 text-[14px] font-semibold hover:border-ink sm:hidden"
        >
          <FilterIcon />
          Filters{count > 0 && <span className="tabular rounded-full bg-ink px-1.5 text-[12px] text-white">{count}</span>}
        </button>

        {/* Desktop: a small button per filter, each with a floating panel. */}
        {facets.map((f) => {
          const n = picked[f.id]?.length ?? 0;
          return (
            <div key={f.id} className="relative hidden sm:block">
              <button
                type="button"
                aria-expanded={open === f.id}
                onClick={() => setOpen(open === f.id ? null : f.id)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-semibold ${
                  n ? "border-ink bg-ink text-white" : "border-line bg-page hover:border-ink"
                }`}
              >
                {f.label}
                {n > 0 && <span className="tabular">· {n}</span>}
                <Chevron up={open === f.id} />
              </button>
              {open === f.id && (
                <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-page p-2 shadow-lift">
                  <ValueList facet={f} picked={picked[f.id] ?? []} onToggle={(v) => toggle(f.id, v)} />
                </div>
              )}
            </div>
          );
        })}

        <label className="hidden cursor-pointer items-center gap-2 rounded-full border border-line bg-page px-4 py-2 text-[14px] font-semibold hover:border-ink sm:flex">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="size-4 accent-moss" />
          In stock only
        </label>

        <p className="tabular ml-auto text-[14px] text-muted" aria-live="polite">
          {count ? `${shown.length} of ${noun(items.length)}` : noun(items.length)}
        </p>
      </div>

      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-2 text-[14px]" aria-label="Chosen filters">
          {chips.map(({ facet, value }) => (
            <li key={facet.id + value}>
              <button
                type="button"
                onClick={() => toggle(facet.id, value)}
                className="flex items-center gap-1.5 rounded-full bg-plaster px-3 py-1 hover:bg-line"
                aria-label={`Remove ${facet.label}: ${value}`}
              >
                <span className="text-muted">{facet.label}:</span> {value}
                <span aria-hidden className="text-[16px] leading-none">×</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clear} className="px-1 font-semibold underline">Clear all</button>
          </li>
        </ul>
      )}

      {open === "sheet" && (
        <FilterSheet
          facets={facets}
          picked={picked}
          onToggle={toggle}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          onClear={clear}
          onClose={() => setOpen(null)}
          showLabel={`Show ${noun(shown.length)}`}
        />
      )}

      {shown.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-plaster p-8 text-muted">
          Nothing matches those filters.{" "}
          <button type="button" onClick={clear} className="font-semibold text-ink underline">Clear filters</button>
        </p>
      ) : (
        <div className={`mt-6 ${masonry ? masonryClass(3) : gridClass(3)}`}>
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

/** A filter's values as checkboxes; long lists scroll inside the panel. */
function ValueList({ facet, picked, onToggle }: { facet: Facet; picked: string[]; onToggle: (v: string) => void }) {
  return (
    <ul className="max-h-72 overflow-y-auto">
      {facet.values.map((v) => (
        <li key={v}>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] hover:bg-plaster">
            <input type="checkbox" checked={picked.includes(v)} onChange={() => onToggle(v)} className="size-4 accent-moss" />
            {v}
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Phones: every filter in a sheet from the bottom of the screen. */
function FilterSheet({
  facets,
  picked,
  onToggle,
  inStockOnly,
  setInStockOnly,
  onClear,
  onClose,
  showLabel,
}: {
  facets: Facet[];
  picked: Picked;
  onToggle: (id: string, v: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  onClear: () => void;
  onClose: () => void;
  showLabel: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-page">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">Filters</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-full px-3 py-1 text-[15px] font-semibold underline">Close</button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {facets.map((f) => (
            <fieldset key={f.id}>
              <legend className="font-semibold">{f.label}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {f.values.map((v) => {
                  const on = picked[f.id]?.includes(v) ?? false;
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggle(f.id, v)}
                      className={`rounded-full border px-3.5 py-1.5 text-[14px] ${on ? "border-ink bg-ink text-white" : "border-line bg-page"}`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="size-4 accent-moss" />
            In stock only
          </label>
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <button type="button" onClick={onClear} className="font-semibold underline">Clear all</button>
          <button type="button" onClick={onClose} className="ml-auto rounded-full bg-moss px-6 py-3 font-semibold text-white hover:bg-moss-deep">
            {showLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`size-4 transition-transform ${up ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 5h14M6 10h8M8.5 15h3" />
    </svg>
  );
}
