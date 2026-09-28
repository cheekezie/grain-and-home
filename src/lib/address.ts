import "server-only";
import { checkDeliveryPostcode } from "./delivery";
import type { DeliveryArea } from "./shop/types";

// Postcode lookup for the checkout address form.
//
// - Always: postcodes.io (free, open data, no key) confirms the postcode
//   exists and gives its area, e.g. "Westminster, London". It has no street
//   addresses.
// - When IDEAL_POSTCODES_API_KEY is set: Ideal Postcodes (Royal Mail PAF,
//   pay per lookup) returns every address at the postcode for the customer
//   to pick. Without a key, customers type their street address.

export interface LookupAddress {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
}

export type LookupResult =
  | { ok: true; postcode: string; area?: string; town?: string; addresses: LookupAddress[] }
  | { ok: false; reason: "invalid" | "excluded" | "not_found" | "unavailable"; postcode: string };

const TIMEOUT = 4000;

/**
 * Best-guess town from postcodes.io (it has no Royal Mail post town):
 * London for London postcodes, else the parish or district name, tidied.
 * Customers can edit it; the postcode is what the courier really uses.
 */
function guessTown(r: { region?: string; parish?: string; admin_district?: string }): string | undefined {
  if (r.region === "London") return "London";
  const clean = (s?: string) => s?.replace(/, unparished area$/, "").replace(/^(.+), City of$/, "$1").trim() || undefined;
  return clean(r.parish) ?? clean(r.admin_district);
}

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  return { status: res.status, body: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}

export async function lookupPostcode(input: string, deliveryArea: DeliveryArea): Promise<LookupResult> {
  const check = checkDeliveryPostcode(input, deliveryArea);
  if (!check.ok) return check;
  const { postcode } = check;
  const compact = postcode.replace(" ", "");

  let area: string | undefined;
  let town: string | undefined;
  try {
    const r = await getJson(`https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`);
    if (r.status === 404) return { ok: false, reason: "not_found", postcode };
    const res = r.body?.result as { admin_district?: string; region?: string; country?: string; parish?: string } | undefined;
    if (res) town = guessTown(res);
    const district = res?.admin_district?.replace(/^(.+), City of$/, "$1");
    if (res) area = [district, res.region ?? res.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  } catch {
    // Lookup is a convenience: if it's down, the customer types the address.
  }

  const key = process.env.IDEAL_POSTCODES_API_KEY?.trim();
  if (!key) return { ok: true, postcode, area, town, addresses: [] };
  try {
    const r = await getJson(`https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(compact)}?api_key=${encodeURIComponent(key)}`);
    const list = (r.body?.result as Record<string, string>[] | undefined) ?? [];
    const addresses = list.map((a) => {
      const lines = [a.line_1, a.line_2, a.line_3].filter(Boolean);
      return { line1: lines[0] ?? "", line2: lines.slice(1).join(", "), city: a.post_town ?? "", postcode: a.postcode ?? postcode };
    });
    if (r.status !== 200) console.error("[address] Ideal Postcodes lookup failed:", r.status, r.body?.code);
    return { ok: true, postcode, area, town: addresses[0]?.city || town, addresses };
  } catch (e) {
    console.error("[address] Ideal Postcodes lookup error:", (e as Error).message);
    return { ok: true, postcode, area, town, addresses: [] };
  }
}
