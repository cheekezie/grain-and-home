// Reading supplier emails: what happened (status), tracking links, and
// which of our orders it's about. Pure functions, no I/O, so they can be
// tested with sample emails.

export type DetectedStatus = "ordered" | "dispatched" | "out_for_delivery" | "delivered" | "cancelled" | "unknown";

/** Order matters: the first rule that matches wins. */
const STATUS_RULES: [DetectedStatus, RegExp][] = [
  ["cancelled", /\b(has been|was|been|is) cancell?ed\b|\bcancell?ation (confirmed|of your order)\b|\border cancell?ed\b/i],
  ["delivered", /\b(has|have) been delivered\b|\bwas delivered\b|\bdelivered today\b|\bsuccessfully delivered\b|\byour (order|parcel|delivery|item)s? (was|has been|have been) delivered\b/i],
  ["out_for_delivery", /\bout for delivery\b|\bdelivering (your parcel |your order )?today\b|\barriving today\b/i],
  ["dispatched", /\bdispatched\b|\bhas shipped\b|\bhave shipped\b|\b(is|are) on (its|their|the) way\b|\bhas left (our|the) (warehouse|depot)\b|\bshipment (notification|confirmation)\b|\btracking (number|information|details)\b/i],
  ["ordered", /\border confirm(ation|ed)\b|\bthank(s| you) for (your|the) order\b|\bwe('ve| have) received your order\b|\border (placed|received)\b/i],
];

export function detectStatus(subject: string, text: string): DetectedStatus {
  const hay = `${subject}\n${text}`;
  for (const [status, re] of STATUS_RULES) if (re.test(hay)) return status;
  return "unknown";
}

/** Carrier and tracking-platform domains whose links are safe to give customers (they don't name the supplier). */
const CARRIER_DOMAINS = [
  "royalmail.com", "parcelforce.com", "dpd.co.uk", "dpdlocal.co.uk", "evri.com", "hermes-europe.co.uk", "dhl.com", "dhl.co.uk",
  "ups.com", "fedex.com", "yodel.co.uk", "xdp.co.uk", "tnt.com", "arrowxl.co.uk", "panther.co.uk", "whistl.co.uk", "inpost.co.uk",
  "parcel2go.com", "17track.net", "aftership.com", "narvar.com", "parcelperform.com", "metapack.com", "sorted.com", "tracking.dpd.de",
];

// Links that are never tracking pages (unsubscribe, socials, app stores…).
const SKIP = /unsubscribe|privacy|preferences|facebook|instagram|twitter|pinterest|youtube|tiktok|survey|app-store|apps\.apple|play\.google|mailto:/i;
// Account/help links are skipped too, unless they're clearly about tracking.
const SKIP_UNLESS_TRACKING = /account|login|sign-?in|help|faq|terms|review/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const onDomain = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith(`.${d}`));

export interface TrackingLinks {
  /** Carrier/platform links: fine to send to the customer. */
  carrier: string[];
  /** Tracking pages on the supplier's own site: would reveal the supplier. */
  supplierHosted: string[];
}

export function extractTrackingLinks(html: string, text: string, supplierDomains: string[]): TrackingLinks {
  const urls = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) urls.add(m[1].replace(/&amp;/g, "&"));
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) urls.add(m[0]);
  const carrier: string[] = [];
  const supplierHosted: string[] = [];
  for (const u of urls) {
    if (!/^https?:\/\//i.test(u) || SKIP.test(u)) continue;
    if (SKIP_UNLESS_TRACKING.test(u) && !/track/i.test(u)) continue;
    const host = hostOf(u);
    if (!host) continue;
    if (onDomain(host, CARRIER_DOMAINS)) carrier.push(u);
    else if (onDomain(host, supplierDomains) && /track|delivery|shipment|parcel/i.test(u)) supplierHosted.push(u);
  }
  return { carrier: carrier.slice(0, 3), supplierHosted: supplierHosted.slice(0, 3) };
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const MIN_REF = 5;

/** Regex for a reference allowing spaces/dashes between characters, as a whole token. */
function refPattern(ref: string): RegExp {
  const chars = norm(ref).split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![A-Z0-9])${chars.join("[\\s-]?")}(?![A-Z0-9])`, "i");
}

/**
 * Which of our open orders is this email about? We know the supplier
 * order numbers we saved, so we look for any of them in the email, rather
 * than guessing where each supplier puts its order number.
 */
export function findOrderRef<T extends { ref: string }>(subject: string, text: string, candidates: T[]): T | null {
  const hay = `${subject}\n${text}`;
  const hits = candidates.filter((c) => norm(c.ref).length >= MIN_REF && refPattern(c.ref).test(hay));
  if (hits.length === 0) return null;
  return hits.sort((a, b) => norm(b.ref).length - norm(a.ref).length)[0];
}

/** Best guess at the supplier's order number, shown when an email can't be matched. */
export function orderNumberHint(subject: string, text: string): string | null {
  const m = `${subject}\n${text}`.match(/order\s*(?:number|no\.?|#|ref(?:erence)?)?\s*[:#]?\s*([A-Z]{0,4}\d[A-Z0-9-]{4,})/i);
  return m ? m[1] : null;
}

/** Plain text from an email's HTML (for the webhook, which sends HTML only). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}
