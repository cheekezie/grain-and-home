import "server-only";

// Exchange rates for turning a supplier's foreign-currency catalogue prices
// into the shop's currency. Frankfurter serves the European Central Bank's
// daily reference rates (about 30 currencies; no key). A reference rate is
// an estimate of what the supplier will charge, so wherever it's used the
// admin says which rate and date it came from.

export interface FxRate {
  /** 1 unit of `from` in `to`. */
  rate: number;
  /** The ECB date the rate is for, "2026-09-29". */
  date: string;
  from: string;
  to: string;
}

export async function fxRate(from: string, to: string): Promise<FxRate | null> {
  if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10), from, to };
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null; // e.g. a currency the ECB doesn't publish (NGN)
    const body = (await res.json()) as { date?: string; rates?: Record<string, number> };
    const rate = body.rates?.[to];
    return typeof rate === "number" && rate > 0 && body.date ? { rate, date: body.date, from, to } : null;
  } catch (e) {
    console.error(`[fx] ${from}→${to} failed`, e);
    return null;
  }
}
