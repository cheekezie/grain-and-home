// Pure discount maths, shared by the checkout preview and the checkout
// itself (the server always recalculates; the browser only displays).

export interface PromoRule {
  code: string;
  headline: string;
  kind: "percent" | "fixed";
  value: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categories: string[];
  minSpend?: number;
}

export interface PricedLine {
  productId: string;
  category: string;
  price: number;
  quantity: number;
}

export type PromoOutcome =
  | { ok: true; discount: number; eligibleSubtotal: number }
  | { ok: false; message: string };

export function applyPromo(rule: PromoRule, lines: PricedLine[], formatPrice: (p: number) => string): PromoOutcome {
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  if (rule.minSpend && subtotal < rule.minSpend) {
    return { ok: false, message: `${rule.code} needs a spend of at least ${formatPrice(rule.minSpend)}.` };
  }
  const eligible = lines.filter((l) =>
    rule.scope === "all" ? true : rule.scope === "products" ? rule.productIds.includes(l.productId) : rule.categories.includes(l.category),
  );
  const eligibleSubtotal = eligible.reduce((n, l) => n + l.price * l.quantity, 0);
  if (eligibleSubtotal === 0) return { ok: false, message: `${rule.code} doesn't apply to anything in this order.` };
  const raw = rule.kind === "percent" ? Math.round((eligibleSubtotal * rule.value) / 100) : rule.value;
  // Never more than the eligible items, and always leave at least 1p to pay.
  const discount = Math.min(raw, eligibleSubtotal, subtotal - 1);
  if (discount <= 0) return { ok: false, message: `${rule.code} can't be used on this order.` };
  return { ok: true, discount, eligibleSubtotal };
}
