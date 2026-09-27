/** Whole days since an ISO date (Infinity if never). Admin pages are rendered per request. */
export function daysSince(iso: string | undefined, now: number = Date.now()): number {
  return iso ? (now - new Date(iso).getTime()) / 86400000 : Infinity;
}
