"use client";

import { useFieldError, useNestedFieldError } from "./EditorForm";
import { SelectField, TextField } from "./fields";
import { AVAILABILITY, AVAILABILITY_LABELS } from "@/lib/catalogue";
import { MAX_OPTIONS, MAX_VARIANTS, OPTION_GOOGLE, syncVariants, variantLabel, type ProductOption } from "@/lib/variants";

// Options (Size, Colour…) on the product editor, and the variant each
// combination makes: its own stock, and price, cost and supplier code when
// they differ from the product's.

export interface OptionFormValue {
  name: string;
  /** As typed: "S, M, L, XL". */
  valuesText: string;
  google: string;
}

export interface VariantFormValue {
  id: string;
  values: string[];
  price: string;
  supplierCost: string;
  supplierSku: string;
  availability: string;
}

const GOOGLE_LABEL: Record<string, string> = { "": "Not sent", size: "Size", color: "Colour", material: "Material", pattern: "Pattern" };

export const splitValues = (text: string) => [...new Set(text.split(",").map((v) => v.trim()).filter(Boolean))];

const toOptions = (opts: OptionFormValue[]): ProductOption[] => opts.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), values: splitValues(o.valuesText) })).filter((o) => o.values.length);

/** Guess the Google attribute from the option's name. */
const guessGoogle = (name: string) => (/^size$/i.test(name.trim()) ? "size" : /^colou?r$/i.test(name.trim()) ? "color" : "");

export default function ProductOptions({
  options,
  variants,
  onChange,
  productPrice,
}: {
  options: OptionFormValue[];
  variants: VariantFormValue[];
  onChange: (options: OptionFormValue[], variants: VariantFormValue[]) => void;
  productPrice: string;
}) {
  const optionsError = useNestedFieldError("options");
  const variantsError = useFieldError("variants");
  const update = (next: OptionFormValue[]) =>
    onChange(
      next,
      syncVariants(toOptions(next), variants, (values, id) => ({ id, values, price: "", supplierCost: "", supplierSku: "", availability: "in_stock" })),
    );
  const setOption = (i: number, patch: Partial<OptionFormValue>) => update(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setVariant = (id: string, patch: Partial<VariantFormValue>) => onChange(options, variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const combos = toOptions(options).reduce((n, o) => n * o.values.length, 1);

  return (
    <>
      {options.map((o, i) => (
        <div key={i} className="rounded-xl border border-line p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr_1fr]">
            <TextField
              label={`Option ${i + 1}`}
              path={`options.${i}.name`}
              value={o.name}
              placeholder="e.g. Size"
              onChange={(n) => setOption(i, { name: n, ...(o.google || !guessGoogle(n) ? {} : { google: guessGoogle(n) }) })}
            />
            <TextField label="Choices, in order" path={`options.${i}.values`} value={o.valuesText} placeholder="S, M, L, XL" onChange={(n) => setOption(i, { valuesText: n })} hint="Separate with commas." />
            <SelectField label="Google Shopping" path={`options.${i}.google`} value={o.google} onChange={(n) => setOption(i, { google: n })} options={OPTION_GOOGLE.map((g) => ({ value: g, label: GOOGLE_LABEL[g] }))} />
          </div>
          <button type="button" onClick={() => update(options.filter((_, j) => j !== i))} className="mt-2 text-[14px] font-semibold text-danger underline">
            Remove this option
          </button>
        </div>
      ))}
      {options.length < MAX_OPTIONS && (
        <button type="button" onClick={() => update([...options, { name: "", valuesText: "", google: "" }])} className="font-semibold underline">
          {options.length ? "Add another option" : "Add an option (e.g. Size)"}
        </button>
      )}
      {optionsError && <p className="text-[14px] font-semibold text-danger">{optionsError}</p>}
      {combos > MAX_VARIANTS && <p className="text-[14px] font-semibold text-danger">That makes {combos} combinations; the most is {MAX_VARIANTS}.</p>}

      {variants.length > 0 && (
        <div>
          <p className="font-semibold">Each combination ({variants.length})</p>
          <p className="text-[14px] text-muted">
            Leave price, cost or code empty to use the product&rsquo;s. Customers can only choose combinations in stock.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead className="border-b border-line text-[13px] text-muted">
                <tr>
                  <th className="p-2.5">Combination</th>
                  <th className="p-2.5">Price</th>
                  <th className="p-2.5">Supplier cost</th>
                  <th className="p-2.5">Supplier code</th>
                  <th className="p-2.5">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {variants.map((v, k) => (
                  <VariantRow key={v.id} v={v} index={k} productPrice={productPrice} onChange={(patch) => setVariant(v.id, patch)} />
                ))}
              </tbody>
            </table>
          </div>
          {variantsError && <p className="mt-1 text-[14px] font-semibold text-danger">{variantsError}</p>}
        </div>
      )}
    </>
  );
}

function VariantRow({ v, index, productPrice, onChange }: { v: VariantFormValue; index: number; productPrice: string; onChange: (p: Partial<VariantFormValue>) => void }) {
  const error = useNestedFieldError(`variants.${index}`);
  const label = variantLabel(v.values);
  const cell = "w-full rounded-lg border border-line bg-white px-2 py-1.5 aria-[invalid=true]:border-danger";
  return (
    <tr>
      <td className="p-2.5 font-medium">
        {label}
        {error && <span className="block text-[13px] font-semibold text-danger">{error}</span>}
      </td>
      <td className="p-2.5">
        <input aria-label={`Price for ${label}`} inputMode="decimal" value={v.price} placeholder={productPrice ? `£${productPrice}` : "£"} onChange={(e) => onChange({ price: e.target.value })} aria-invalid={!!error} className={`tabular ${cell}`} />
      </td>
      <td className="p-2.5">
        <input aria-label={`Supplier cost for ${label}`} inputMode="decimal" value={v.supplierCost} placeholder="Product's" onChange={(e) => onChange({ supplierCost: e.target.value })} className={`tabular ${cell}`} />
      </td>
      <td className="p-2.5">
        <input aria-label={`Supplier code for ${label}`} value={v.supplierSku} placeholder="Product's" onChange={(e) => onChange({ supplierSku: e.target.value })} className={`font-mono text-[14px] ${cell}`} />
      </td>
      <td className="p-2.5">
        <select aria-label={`Stock for ${label}`} value={v.availability} onChange={(e) => onChange({ availability: e.target.value })} className={cell}>
          {AVAILABILITY.map((a) => (
            <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}
