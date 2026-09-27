// Admin dates are typed as calendar days in UK time. A promo "expires on
// 30 Sep" means it works until 23:59:59 on 30 Sep in London (BST or GMT).

function londonOffsetMinutes(at: Date): number {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = part.match(/GMT([+-]\d+)?(?::(\d+))?/);
  const h = m?.[1] ? Number(m[1]) : 0;
  return h * 60 + (m?.[2] ? Math.sign(h || 1) * Number(m[2]) : 0);
}

/** "2026-09-30" → that day at hh:mm:ss London time, as a Date. */
export function londonDateTime(day: string, time: "start" | "end"): Date {
  const [y, mo, d] = day.split("-").map(Number);
  const [hh, mm, ss] = time === "start" ? [0, 0, 0] : [23, 59, 59];
  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));
  return new Date(guess.getTime() - londonOffsetMinutes(guess) * 60_000);
}

/** Date → "2026-09-30" as the London calendar day. */
export function londonDay(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

export function formatLondonDay(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long" }).format(new Date(date));
}
