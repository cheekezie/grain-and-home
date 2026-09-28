"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicPromo } from "@/lib/promos";
import { useConsent } from "@/lib/consent";
import { formatLondonDay } from "@/lib/londonDate";
import { formatPrice } from "@/lib/money";
import { rememberClaimedPromo } from "@/lib/marketing";
import SubscribeForm from "./SubscribeForm";
import { useShopWords } from "./ShopWords";

const SEEN_KEY = "promo-dialog-seen-v1";
const DELAY_MS = 6000;
const QUIET_PATHS = ["/basket", "/checkout", "/success", "/returns", "/unsubscribe"];

// One-time pop-up for the announced promo ("claim offer") or, if none, the
// welcome code for email sign-ups. Shown once per promo, after a short
// delay, never over the cookie banner and never during checkout.
export default function PromoDialog({ announced, welcome }: { announced: PublicPromo | null; welcome: PublicPromo | null }) {
  const words = useShopWords();
  const promo = announced ?? welcome;
  const kind = announced ? "claim" : "welcome";
  const path = usePathname();
  const consent = useConsent();
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const seenId = promo ? `${kind}:${promo.id}` : null;

  useEffect(() => {
    if (!seenId || consent === "pending" || consent === null) return;
    if (QUIET_PATHS.some((p) => path.startsWith(p))) return;
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === seenId; } catch { seen = true; }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [seenId, consent, path]);

  useEffect(() => {
    if (!open) return;
    try { if (seenId) localStorage.setItem(SEEN_KEY, seenId); } catch { /* storage off */ }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, seenId]);

  if (!open || !promo) return null;

  const terms = [
    promo.minSpend && `On orders over ${formatPrice(promo.minSpend)}.`,
    promo.scope !== "all" && `Applies to selected ${words.items}.`,
    promo.expiresAt && `Ends ${formatLondonDay(promo.expiresAt)}.`,
  ].filter(Boolean).join(" ");

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="promo-title">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full max-w-md rounded-2xl bg-page p-6 shadow-lift sm:p-8">
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full px-3 py-1 text-[14px] font-semibold hover:bg-plaster">
          Close
        </button>
        {kind === "claim" ? (
          <>
            <p className="text-[14px] font-semibold text-moss">Offer</p>
            <h2 id="promo-title" className="mt-1 font-display text-3xl leading-tight">{promo.headline}</h2>
            <p className="mt-3 text-[15px]">Use code <span className="font-mono font-semibold tracking-wider">{promo.code}</span> at checkout.</p>
            {terms && <p className="mt-1 text-[14px] text-muted">{terms}</p>}
            <button
              type="button"
              onClick={async () => {
                rememberClaimedPromo(promo.code);
                try { await navigator.clipboard.writeText(promo.code); } catch { /* fine */ }
                setClaimed(true);
              }}
              className="mt-6 w-full rounded-full bg-moss px-6 py-3.5 font-semibold text-white hover:bg-moss-deep"
            >
              {claimed ? "Claimed: we'll add it at checkout" : "Claim offer"}
            </button>
            {claimed && (
              <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full text-[15px] font-semibold text-moss underline">
                Continue shopping
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-[14px] font-semibold text-moss">Join our list</p>
            <h2 id="promo-title" className="mt-1 font-display text-3xl leading-tight">{promo.headline}</h2>
            <p className="mt-3 text-[15px]">Sign up for offers and new {words.items}, and we&rsquo;ll give you a code straight away.</p>
            {terms && <p className="mt-1 text-[14px] text-muted">{terms}</p>}
            <div className="mt-5"><SubscribeForm source="popup" onDone={() => setOpen(false)} /></div>
          </>
        )}
      </div>
    </div>
  );
}
