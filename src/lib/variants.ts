import type { Availability } from "./catalogue";

// Product options (Size, Colour, Shade…) and the variants they make.
// A product with options sells as one of its variants: each combination
// can have its own price, supplier cost, supplier code and stock. Without
// options a product sells as itself, exactly as before. Client-safe.

export const OPTION_GOOGLE = ["", "size", "color", "material", "pattern"] as const;
export type OptionGoogle = (typeof OPTION_GOOGLE)[number];

export interface ProductOption {
  name: string;
  values: string[];
  /** Which Google Shopping attribute the choice fills (clothing needs size and colour). */
  google?: Exclude<OptionGoogle, "">;
}

export interface StoreVariant {
  /** Stable id from the values, e.g. "m-black". Kept in baskets and orders. */
  id: string;
  /** One value per option, in the options' order. */
  values: string[];
  /** Price in pence. */
  price: number;
  availability: Availability;
}

export interface AdminVariant extends Omit<StoreVariant, "price"> {
  /** Empty: the product's price. */
  price?: number;
  /** Empty: the product's supplier cost. */
  supplierCost?: number;
  /** Empty: the product's supplier code. */
  supplierSku?: string;
}

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "x";

export const variantId = (values: string[]) => values.map(slug).join("--");
/** "M / Black" */
export const variantLabel = (values: string[]) => values.join(" / ");

/** Every combination of the options' values, in order. */
export function combinations(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((combo) => o.values.map((v) => [...combo, v])), [[]]).filter((c) => c.length === options.length && c.length > 0);
}

/** Variants for the current options, keeping what was already set for combinations that still exist. */
export function syncVariants<V extends { id: string; values: string[] }>(options: ProductOption[], existing: V[], make: (values: string[], id: string) => V): V[] {
  const byId = new Map(existing.map((v) => [v.id, v]));
  return combinations(options).map((values) => {
    const id = variantId(values);
    const old = byId.get(id);
    return old ? { ...old, values } : make(values, id);
  });
}

/** Lowest and highest variant price (or the product price when there are no variants). */
export function priceRange(p: { price: number; variants: StoreVariant[] }): { min: number; max: number } {
  const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.price];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export const hasOptions = (p: { options: ProductOption[] }) => p.options.length > 0;
