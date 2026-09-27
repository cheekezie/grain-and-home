"use client";

import { useSyncExternalStore } from "react";

// Cookie consent, stored in a first-party cookie (strictly necessary, so it
// needs no consent itself). The shop works fully on "necessary": the
// basket, checkout details, saved items and pop-up memory are browser
// storage the shop needs to do what you asked. "all" allows analytics and
// marketing tags; none are installed yet, and any added later must check
// useConsent() === "all" before loading. Bump VERSION when that list
// changes materially, so everyone is asked again.

export type Consent = "all" | "necessary";
const COOKIE = "gh_consent";
const VERSION = "1";
const MAX_AGE = 60 * 60 * 24 * 182; // about 6 months
const EVENT = "gh:consent";
export const CONSENT_OPEN_EVENT = `${EVENT}:open`;

function read(): Consent | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!m) return null;
  const [version, value] = decodeURIComponent(m[1]).split(":");
  return version === VERSION && (value === "all" || value === "necessary") ? value : null;
}

export function setConsent(value: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(`${VERSION}:${value}`)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

export function reopenConsent() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** null = not chosen yet; "pending" during server render and hydration. */
export function useConsent(): Consent | null | "pending" {
  return useSyncExternalStore(subscribe, read, () => "pending");
}
