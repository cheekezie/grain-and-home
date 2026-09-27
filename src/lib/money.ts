const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** Pence to "£1,234.50". */
export function formatPrice(pence: number): string {
  return gbp.format(pence / 100);
}

/** "£12.50" / "12.5" / "12" typed in the admin, to pence. NaN if unreadable. */
export function parsePounds(input: string): number {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 100);
}

export function penceToPounds(pence: number | undefined | null): string {
  return pence == null ? "" : (pence / 100).toFixed(2);
}

/** Gross margin as a percentage of the selling price. */
export function marginPercent(price: number, cost: number | undefined | null): number | null {
  if (cost == null || price <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}
