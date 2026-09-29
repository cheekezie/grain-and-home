import "server-only";
import type { ProductValue } from "@/components/admin/editors";
import type { DetailField } from "@/lib/shop/types";
import { CURRENCY, penceToPounds } from "@/lib/money";
import { MAX_VARIANTS, variantId } from "@/lib/variants";
import { emptyProduct } from "./productForm";

// Printful's public product catalogue (no account or key needed): the blank
// garments they print on, with every colour and size, a photo per colour and
// their price to us. Used by Admin → Products → Import from Printful to start
// a draft product; nothing is saved until the owner saves it in the editor.
//
// Printful's public catalogue prices are in US dollars only. They become the
// supplier cost only when the shop sells in USD; otherwise they are listed in
// the product's internal notes and the owner enters the cost in the shop's
// currency (from their Printful dashboard). No conversion is guessed.

const API = "https://api.printful.com";

export interface PrintfulListItem {
  id: number;
  title: string;
  image: string;
  type: string;
  brand: string | null;
  variantCount: number;
}

export interface PrintfulVariant {
  id: number;
  color: string;
  colorCode: string;
  size: string;
  /** US dollars, as Printful lists it, e.g. "17.95". */
  price: string;
  inStock: boolean;
  image: string;
}

export interface PrintfulProduct {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  model: string | null;
  image: string;
  currency: string;
  variants: PrintfulVariant[];
  colors: { name: string; code: string; image: string }[];
  sizes: string[];
}

async function get<T>(path: string, cache = true): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...(cache ? { next: { revalidate: 86400 } } : { cache: "no-store" }), signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Printful ${path}: HTTP ${res.status}`);
  return ((await res.json()) as { result: T }).result;
}

interface RawListItem {
  id: number;
  title: string;
  image: string;
  type_name: string;
  brand: string | null;
  variant_count: number;
  is_discontinued: boolean;
}

// The full list is over 2MB (too big for Next's fetch cache), so a trimmed
// copy is kept in memory for a day instead.
let catalogue: { at: number; items: PrintfulListItem[] } | null = null;
const DAY = 86_400_000;

/** The whole catalogue (about 550 items), minus discontinued ones. */
export async function printfulCatalogue(): Promise<PrintfulListItem[]> {
  if (catalogue && Date.now() - catalogue.at < DAY) return catalogue.items;
  const items = (await get<RawListItem[]>("/products", false))
    .filter((p) => !p.is_discontinued)
    .map((p) => ({ id: p.id, title: p.title, image: p.image, type: p.type_name, brand: p.brand, variantCount: p.variant_count }));
  catalogue = { at: Date.now(), items };
  return items;
}

export async function searchPrintful(q: string): Promise<PrintfulListItem[]> {
  const all = await printfulCatalogue();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return all;
  return all.filter((p) => {
    const text = `${p.title} ${p.type} ${p.brand ?? ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL", "6XL"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  return i === -1 ? SIZE_ORDER.length : i;
};

interface RawProduct {
  product: { id: number; title: string; description: string; brand: string | null; model: string | null; image: string; currency: string; is_discontinued: boolean };
  variants: { id: number; color: string | null; color_code: string | null; size: string | null; price: string; in_stock: boolean; image: string }[];
}

export async function printfulProduct(id: number): Promise<PrintfulProduct | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  let raw: RawProduct;
  try {
    raw = await get<RawProduct>(`/products/${id}`);
  } catch (e) {
    if (String(e).includes("HTTP 404")) return null;
    throw e;
  }
  const variants: PrintfulVariant[] = raw.variants.map((v) => ({
    id: v.id,
    color: v.color?.trim() || "",
    colorCode: v.color_code ?? "",
    size: v.size?.trim() || "",
    price: v.price,
    inStock: v.in_stock,
    image: v.image,
  }));
  const colors = new Map<string, { name: string; code: string; image: string }>();
  for (const v of variants) if (v.color && !colors.has(v.color)) colors.set(v.color, { name: v.color, code: v.colorCode, image: v.image });
  // Printful's order within a colour isn't size order ("L" can come before "M").
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))].sort((a, b) => sizeRank(a) - sizeRank(b));
  const p = raw.product;
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    brand: p.brand,
    model: p.model,
    image: p.image,
    currency: p.currency,
    variants,
    colors: [...colors.values()],
    sizes,
  };
}

/** "Unisex Garment-Dyed Heavyweight T-Shirt | Comfort Colors 1717" → the part before the brand. */
export const productName = (title: string) => title.split("|")[0].trim();

const toSlug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** "$15.60" or "$15.60–$22.50". */
export function usdRange(prices: string[]): string {
  const n = prices.map(Number).filter((x) => Number.isFinite(x));
  if (!n.length) return "";
  const lo = Math.min(...n);
  const hi = Math.max(...n);
  return lo === hi ? `$${lo.toFixed(2)}` : `$${lo.toFixed(2)}–$${hi.toFixed(2)}`;
}

/**
 * A draft product for the editor from the chosen colours and sizes. Options:
 * Colour (when the product has colours) then Size. One variant per
 * combination Printful makes, with its Printful variant id as the supplier
 * code. Combinations Printful doesn't make are marked discontinued.
 */
export function printfulDraft(
  p: PrintfulProduct,
  chosenColors: string[],
  chosenSizes: string[],
  shop: { fields: DetailField[]; category?: string; supplierId?: string },
): ProductValue | { error: string } {
  const colors = p.colors.map((c) => c.name).filter((c) => chosenColors.includes(c));
  const sizes = p.sizes.filter((s) => chosenSizes.includes(s));
  if (p.colors.length && !colors.length) return { error: "Choose at least one colour." };
  if (p.sizes.length && !sizes.length) return { error: "Choose at least one size." };
  const combos = Math.max(colors.length, 1) * Math.max(sizes.length, 1);
  if (combos > MAX_VARIANTS) return { error: `That makes ${combos} combinations; the most is ${MAX_VARIANTS}. Choose fewer colours or sizes.` };

  const name = productName(p.title);
  const usd = CURRENCY === "USD";
  const find = (color: string, size: string) => p.variants.find((v) => (v.color || "") === color && (v.size || "") === size);

  const options: ProductValue["options"] = [];
  if (colors.length) options.push({ name: "Colour", valuesText: colors.join(", "), google: "color" });
  if (sizes.length) options.push({ name: "Size", valuesText: sizes.join(", "), google: "size" });

  const variants: ProductValue["variants"] = [];
  const chosen: PrintfulVariant[] = [];
  for (const color of colors.length ? colors : [""]) {
    for (const size of sizes.length ? sizes : [""]) {
      const values = [color, size].filter(Boolean);
      const v = find(color, size);
      if (v) chosen.push(v);
      variants.push({
        id: variantId(values),
        values,
        price: "",
        supplierCost: v && usd ? penceToPounds(Math.round(Number(v.price) * 100)) : "",
        supplierSku: v ? String(v.id) : "",
        availability: !v ? "discontinued" : v.inStock ? "in_stock" : "out_of_stock",
      });
    }
  }

  // One photo per colour, tagged so choosing the colour shows it.
  const images = colors.length
    ? colors.map((c) => ({ url: p.colors.find((x) => x.name === c)!.image, alt: `${name} in ${c}`, forValue: c }))
    : [{ url: p.image, alt: name }];

  const description = p.description.trim();
  const summary = description.split(/(?<=[.!?])\s|\n/)[0]?.trim().slice(0, 200) ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const notes = [
    `Imported from Printful catalogue product ${p.id} (${p.title}) on ${today}. Supplier codes are Printful variant ids.`,
    usd
      ? "Supplier costs are Printful's catalogue prices (USD) before printing, shipping and tax: add the print cost for your design."
      : `Printful's catalogue lists these in USD only (${usdRange(chosen.map((v) => v.price))} before printing, shipping and tax). Enter your cost in ${CURRENCY} from your Printful dashboard.`,
    "The description is Printful's own: rewrite it in the shop's voice before publishing.",
    ...(shop.supplierId ? [] : ["No supplier named Printful yet: add it under Suppliers and choose it here."]),
  ].join("\n");

  return {
    ...emptyProduct(shop.fields, shop.category),
    name,
    slug: toSlug(name),
    summary,
    description,
    images,
    options,
    variants,
    supplierId: shop.supplierId ?? "",
    internalNotes: notes,
    availability: chosen.some((v) => v.inStock) ? "in_stock" : "out_of_stock",
  };
}
