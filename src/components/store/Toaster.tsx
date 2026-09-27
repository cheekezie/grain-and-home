"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onToast, type Toast } from "@/lib/toast";
import { useConsent } from "@/lib/consent";
import ShopImage from "@/components/store/ShopImage";

const SHOW_MS = 4500;
const SHOW_WITH_ACTION_MS = 7000;

// Bottom-right confirmation (bottom of the screen on phones). One at a
// time; a new toast replaces the current one. Pauses while hovered or
// focused so there's time to use the link.
export default function Toaster({ consentAware = true }: { consentAware?: boolean }) {
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);
  // While the cookie banner is up, sit above it on small screens.
  const consent = useConsent();
  const bannerOpen = consentAware && consent === null;

  useEffect(() => onToast((t) => setToast({ ...t, id: ++seq.current })), []);

  useEffect(() => {
    if (!toast || paused) return;
    // Longer when there's a link to use.
    const timer = setTimeout(() => setToast(null), toast.action ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast, paused]);

  return (
    <div aria-live="polite" role="status" className={`pointer-events-none fixed inset-x-3 z-[95] flex justify-end sm:inset-x-auto sm:right-6 ${bannerOpen ? "bottom-56 sm:bottom-6" : "bottom-3 sm:bottom-6"}`}>
      {toast && (
        <div
          key={toast.id}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-line bg-page p-3 pr-4 shadow-lift motion-safe:animate-[toast-in_200ms_ease-out] sm:w-[360px]"
        >
          {toast.image && (
            <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg bg-plaster">
              <ShopImage src={toast.image} alt="" sizes="56px" className="object-contain p-1 mix-blend-multiply" />
            </span>
          )}
          <div className="min-w-0 flex-1 text-[15px]">
            <p className="flex items-center gap-1.5 font-semibold">
              <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0 text-moss" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m4 10.5 4 4 8-9" />
              </svg>
              {toast.title}
            </p>
            {toast.body && <p className="truncate text-muted">{toast.body}</p>}
            {toast.action && (
              <Link href={toast.action.href} onClick={() => setToast(null)} className="mt-0.5 inline-block font-semibold text-moss underline underline-offset-2">
                {toast.action.label}
              </Link>
            )}
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="self-start rounded-full p-1 text-muted hover:bg-plaster hover:text-ink">
            <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
