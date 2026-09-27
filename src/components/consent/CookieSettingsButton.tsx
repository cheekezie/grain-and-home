"use client";

import { reopenConsent } from "@/lib/consent";

export default function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={reopenConsent} className={className}>
      Cookie settings
    </button>
  );
}
