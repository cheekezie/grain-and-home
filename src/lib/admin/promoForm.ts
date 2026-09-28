import type { AdminPromo } from "@/lib/admin/queries";
import type { PromoValue } from "@/components/admin/editors";
import { CURRENCY_SYMBOL, escapeSymbol, parsePounds, penceToPounds } from "@/lib/money";
import { londonDay } from "@/lib/londonDate";

export const emptyPromo: PromoValue = {
  code: "", headline: "", kind: "percent", value: "", scope: "all", productIds: [], categories: [], minSpend: "",
  startsOn: "", expiresOn: "", maxUses: "", oncePerCustomer: false, active: true, announce: false, welcome: false,
};

export function toPromoValue(p: AdminPromo): PromoValue {
  return {
    code: p.code, headline: p.headline, kind: p.kind,
    value: p.kind === "percent" ? String(p.value) : penceToPounds(p.value),
    scope: p.scope, productIds: p.productIds, categories: p.categories,
    minSpend: penceToPounds(p.minSpend),
    startsOn: p.startsAt ? londonDay(p.startsAt) : "",
    expiresOn: p.expiresAt ? londonDay(p.expiresAt) : "",
    maxUses: p.maxUses ? String(p.maxUses) : "",
    oncePerCustomer: p.oncePerCustomer, active: p.active, announce: p.announce, welcome: p.welcome,
  };
}

/** "Live", "Expired", "Scheduled", "Used up", "Off". */
export function promoState(p: AdminPromo, now = Date.now()): string {
  if (!p.active) return "Off";
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= now) return "Expired";
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return "Scheduled";
  if (p.maxUses && p.usedCount >= p.maxUses) return "Used up";
  return "Live";
}

/** Headline claims a different % or £ than the code gives (for codes saved before the check existed). */
export function headlineMismatch(p: AdminPromo): string | null {
  const pct = p.headline.match(/(\d+(?:\.\d+)?)\s*%/);
  const gbp = p.headline.match(new RegExp(`${escapeSymbol(CURRENCY_SYMBOL)}\\s*(\\d+(?:\\.\\d{1,2})?)`));
  const actual = p.kind === "percent" ? `${p.value}%` : `${CURRENCY_SYMBOL}${penceToPounds(p.value)}`;
  if (pct && !(p.kind === "percent" && Number(pct[1]) === p.value)) return `Headline says ${pct[1]}% but the code gives ${actual}`;
  if (gbp && p.kind === "fixed" && parsePounds(gbp[1]) !== p.value) return `Headline says ${CURRENCY_SYMBOL}${gbp[1]} but the code gives ${actual}`;
  return null;
}
