import { PURCHASABLE, type Availability } from "./catalogue";
import { variantLabel } from "./variants";

// What one basket line really is, worked out on the server from the product
// in the database: never from what the browser says. Used by checkout, the
// promo preview and order creation, so a variant's price, stock, supplier
// cost and code are read the same way everywhere.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Lean = Record<string, any>;

export type ResolvedLine =
  | {
      ok: true;
      price: number;
      availability: Availability;
      purchasable: boolean;
      /** "Classic tee (M / Black)" */
      name: string;
      variant?: string;
      variantId?: string;
      supplierCost?: number;
      supplierSku?: string;
    }
  | { ok: false; reason: "needs_choice" | "no_variant" };

export function resolveLine(p: Lean, variantId: string | undefined): ResolvedLine {
  const variants = (p.variants ?? []) as Lean[];
  const hasOptions = ((p.options ?? []) as unknown[]).length > 0 && variants.length > 0;
  if (!hasOptions) {
    const availability = (p.availability ?? "in_stock") as Availability;
    return { ok: true, price: p.price, availability, purchasable: PURCHASABLE.includes(availability), name: p.name, supplierCost: p.supplierCost, supplierSku: p.supplierSku || undefined };
  }
  if (!variantId) return { ok: false, reason: "needs_choice" };
  const v = variants.find((x) => x.id === variantId);
  if (!v) return { ok: false, reason: "no_variant" };
  // A product marked unavailable overall stops every variant.
  const own = (v.availability ?? "in_stock") as Availability;
  const overall = (p.availability ?? "in_stock") as Availability;
  const availability = PURCHASABLE.includes(overall) ? own : overall;
  const label = variantLabel(v.values ?? []);
  return {
    ok: true,
    price: typeof v.price === "number" ? v.price : p.price,
    availability,
    purchasable: PURCHASABLE.includes(availability),
    name: `${p.name} (${label})`,
    variant: label,
    variantId: v.id,
    supplierCost: typeof v.supplierCost === "number" ? v.supplierCost : p.supplierCost,
    supplierSku: v.supplierSku || p.supplierSku || undefined,
  };
}

// ------------------------------------------------------------ packs

export interface ResolvedPiece {
  product: Lean;
  line: Extract<ResolvedLine, { ok: true }>;
}

export type ResolvedPack =
  | { ok: true; price: number; purchasable: boolean; name: string; pieces: ResolvedPiece[]; labels: string[] }
  | { ok: false; reason: "needs_choice" | "no_variant" | "missing_piece"; piece?: string };

export const isPack = (p: Lean) => ((p.packSlots ?? []) as unknown[]).length > 0;

/**
 * A pack line: the pack's own price, and each piece resolved with the
 * option chosen for it. It can be bought only if the pack and every piece
 * can. `components` holds the pieces' products by id.
 */
export function resolvePack(pack: Lean, components: Map<string, Lean>, choices: string[] = []): ResolvedPack {
  const slots = ((pack.packSlots ?? []) as unknown[]).map(String);
  const pieces: ResolvedPiece[] = [];
  for (const [i, id] of slots.entries()) {
    const product = components.get(id);
    // A piece may be a draft: something sold only inside packs.
    if (!product) return { ok: false, reason: "missing_piece" };
    const line = resolveLine(product, choices[i] || undefined);
    if (!line.ok) return { ok: false, reason: line.reason, piece: product.name };
    pieces.push({ product, line });
  }
  const overall = (pack.availability ?? "in_stock") as Availability;
  const labels = pieces.map(({ product, line }) => (line.variant ? `${product.name}, ${line.variant}` : product.name));
  return {
    ok: true,
    price: pack.price,
    purchasable: PURCHASABLE.includes(overall) && pieces.every((p) => p.line.purchasable),
    name: `${pack.name} (${labels.join("; ")})`,
    pieces,
    labels,
  };
}

/** Every product id the given products' packs contain. */
export const packComponentIds = (products: Lean[]) => [...new Set(products.flatMap((p) => ((p.packSlots ?? []) as unknown[]).map(String)))];
