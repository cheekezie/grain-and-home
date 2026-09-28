import type { DeliveryArea } from "./shop/types";

// Postcode areas outside "mainland UK" for most furniture couriers
// (Highlands and islands, Northern Ireland, Isle of Man, Channel Islands,
// Isles of Scilly, Isle of Wight...). This is the common courier list —
// check it against each supplier's own exclusions and edit to match.

// Whole areas (letters only) and districts given as "AREA" + number ranges.
export const EXCLUDED_AREAS = ["BT", "GY", "JE", "IM", "HS", "ZE", "KW", "IV"];
export const EXCLUDED_DISTRICTS: Record<string, [number, number][]> = {
  AB: [[31, 38], [44, 56]],
  FK: [[17, 21]],
  KA: [[27, 28]],
  PA: [[20, 49], [60, 78]],
  PH: [[17, 26], [30, 44], [49, 50]],
  PO: [[30, 41]],
  TR: [[21, 25]],
};

/** Outside the UK's VAT and customs area: excluded even when delivering to the whole UK. */
const CROWN_DEPENDENCIES = ["GY", "JE", "IM"];

const UK_POSTCODE = /^([A-Z]{1,2})(\d{1,2})[A-Z]?\s*\d[A-Z]{2}$/;

export function normalisePostcode(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length > 3 ? `${s.slice(0, -3)} ${s.slice(-3)}` : s;
}

export type PostcodeCheck = { ok: true; postcode: string } | { ok: false; reason: "invalid" | "excluded"; postcode: string };

/** Whether we deliver to a postcode, for the shop's delivery area (Admin → Shop settings). */
export function checkDeliveryPostcode(input: string, deliveryArea: DeliveryArea): PostcodeCheck {
  const postcode = normalisePostcode(input);
  const m = postcode.match(UK_POSTCODE);
  if (!m) return { ok: false, reason: "invalid", postcode };
  const [, area, digits] = m;
  const district = Number(digits);
  if (deliveryArea === "uk") return CROWN_DEPENDENCIES.includes(area) ? { ok: false, reason: "excluded", postcode } : { ok: true, postcode };
  if (EXCLUDED_AREAS.includes(area)) return { ok: false, reason: "excluded", postcode };
  if ((EXCLUDED_DISTRICTS[area] ?? []).some(([lo, hi]) => district >= lo && district <= hi)) {
    return { ok: false, reason: "excluded", postcode };
  }
  return { ok: true, postcode };
}

/** Every excluded postcode prefix (areas and districts), e.g. "BT", "AB31". For structured data and feeds. */
export function excludedPostcodePrefixes(deliveryArea: DeliveryArea): string[] {
  if (deliveryArea === "uk") return CROWN_DEPENDENCIES;
  const districts = Object.entries(EXCLUDED_DISTRICTS).flatMap(([area, ranges]) =>
    ranges.flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => `${area}${lo + i}`)),
  );
  return [...EXCLUDED_AREAS, ...districts];
}

/** What to tell a customer whose postcode we can't deliver to. */
export function postcodeMessage(check: Exclude<PostcodeCheck, { ok: true }>, deliveryArea: DeliveryArea): string {
  if (check.reason === "invalid") return "Enter a valid UK postcode.";
  return deliveryArea === "uk"
    ? `Sorry, we can't deliver to ${check.postcode}. We deliver to UK addresses only (not the Channel Islands or the Isle of Man).`
    : `Sorry, we can't deliver to ${check.postcode}. We deliver to mainland UK only.`;
}
