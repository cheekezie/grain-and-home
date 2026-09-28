// Money for the shop's currency, set per shop in its environment
// (NEXT_PUBLIC_CURRENCY, e.g. GBP, USD, EUR, NGN; default GBP). Amounts are
// stored as whole numbers in the currency's minor unit (pence, cents, kobo;
// the whole unit for currencies without one, like JPY), which is also what
// Stripe expects.
//
// Set it once, before the shop takes orders: earlier orders keep the
// currency they were paid in, but prices are just numbers.

const LOCALES: Record<string, string> = {
  GBP: "en-GB",
  USD: "en-US",
  EUR: "en-IE",
  NGN: "en-NG",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
  CAD: "en-CA",
  AUD: "en-AU",
  NZD: "en-NZ",
  INR: "en-IN",
  AED: "en-AE",
  JPY: "ja-JP",
};

function setup() {
  const code = (process.env.NEXT_PUBLIC_CURRENCY || "GBP").trim().toUpperCase();
  const locale = process.env.NEXT_PUBLIC_LOCALE?.trim() || LOCALES[code] || "en-GB";
  try {
    // Only real, circulating currencies (not codes like XXX, "no currency").
    if (!Intl.supportedValuesOf("currency").includes(code)) throw new RangeError(code);
    return { code, locale, format: new Intl.NumberFormat(locale, { style: "currency", currency: code }) };
  } catch {
    console.error(`[money] Unknown currency "${code}" (NEXT_PUBLIC_CURRENCY): using GBP.`);
    return { code: "GBP", locale: "en-GB", format: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }) };
  }
}

const { code, locale, format } = setup();

/** ISO code, e.g. "GBP". */
export const CURRENCY = code;
export const CURRENCY_LOCALE = locale;
/** Digits after the decimal point (2 for GBP, 0 for JPY). */
export const MINOR_DIGITS = format.resolvedOptions().maximumFractionDigits ?? 2;
const FACTOR = 10 ** MINOR_DIGITS;
/** "£", "$", "₦"… */
export const CURRENCY_SYMBOL = format.formatToParts(0).find((p) => p.type === "currency")?.value ?? code;

/** The symbol made safe for a RegExp ("$" needs escaping). */
export const escapeSymbol = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Minor units to "£1,234.50". */
export function formatPrice(minor: number): string {
  return format.format(minor / FACTOR);
}

/** Short form for chart axes: "£120", "£1.5k". */
export function formatCompact(minor: number): string {
  const major = minor / FACTOR;
  if (Math.abs(major) < 1000) return `${CURRENCY_SYMBOL}${Math.round(major)}`;
  const k = Math.round(major / 100) / 10;
  return `${CURRENCY_SYMBOL}${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

/** Minor units to a plain number in the main unit (for feeds, CSV, structured data). */
export const toMajor = (minor: number) => minor / FACTOR;

/** "£12.50" / "12.5" / "1,250" typed in the admin, to minor units. NaN if unreadable. */
export function parsePounds(input: string): number {
  const cleaned = input.replace(/[^\d.]/g, "");
  const pattern = MINOR_DIGITS ? new RegExp(`^\\d+(\\.\\d{1,${MINOR_DIGITS}})?$`) : /^\d+$/;
  if (!pattern.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * FACTOR);
}

/** Minor units to the admin's input format, e.g. "12.50". */
export function penceToPounds(minor: number | undefined | null): string {
  return minor == null ? "" : (minor / FACTOR).toFixed(MINOR_DIGITS);
}

/** Gross margin as a percentage of the selling price. */
export function marginPercent(price: number, cost: number | undefined | null): number | null {
  if (cost == null || price <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}
