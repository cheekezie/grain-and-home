// Wording people agree to when they subscribe; stored with each sign-up.
export const subscribeConsent = (storeName: string, items: string) => `Email me offers and new ${items} from ${storeName}. I can unsubscribe at any time.`;

/** Promo code a customer claimed from the offer pop-up or sign-up, prefilled at checkout. */
export const CLAIMED_PROMO_KEY = "claimed-promo-v1";

export function rememberClaimedPromo(code: string) {
  try { localStorage.setItem(CLAIMED_PROMO_KEY, code); } catch { /* storage off */ }
}

export function readClaimedPromo(): string | null {
  try { return localStorage.getItem(CLAIMED_PROMO_KEY); } catch { return null; }
}

export function forgetClaimedPromo() {
  try { localStorage.removeItem(CLAIMED_PROMO_KEY); } catch { /* storage off */ }
}
