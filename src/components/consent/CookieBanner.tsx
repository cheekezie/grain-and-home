"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_OPEN_EVENT, setConsent, useConsent } from "@/lib/consent";

// Accept and reject are the same size and weight: UK guidance (ICO) is that
// refusing has to be as easy as agreeing.
export default function CookieBanner() {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  if (consent === "pending" || (consent !== null && !reopened)) return null;

  const choose = (value: "all" | "necessary") => {
    setConsent(value);
    setReopened(false);
  };

  return (
    <div role="region" aria-label="Cookie choices" className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-5 shadow-lift sm:flex sm:items-end sm:gap-6">
        <div className="text-[15px]">
          <p className="font-semibold">Cookies and your choices</p>
          <p className="mt-1 text-muted">
            We use essential cookies and browser storage to run the shop, like your basket and checkout. With your permission
            we&rsquo;d also use analytics and marketing cookies to improve the shop and our offers.{" "}
            <Link href="/privacy#cookies" className="font-semibold text-moss underline underline-offset-2">Details</Link>
          </p>
        </div>
        <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
          <button type="button" onClick={() => choose("necessary")} className="flex-1 rounded-full border-2 border-moss px-4 py-2 text-[15px] font-semibold text-moss hover:bg-moss-soft sm:flex-none">
            Essential only
          </button>
          <button type="button" onClick={() => choose("all")} className="flex-1 rounded-full border-2 border-moss bg-moss px-4 py-2 text-[15px] font-semibold text-white hover:bg-moss-deep sm:flex-none">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
