"use client";

import { useState } from "react";
import { rememberClaimedPromo } from "@/lib/marketing";

// A promo code you can tap to copy; copying also saves it for checkout.
export default function CopyCode({ code, tone = "light" }: { code: string; tone?: "light" | "dark" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        rememberClaimedPromo(code);
        try { await navigator.clipboard.writeText(code); } catch { /* shown on screen anyway */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      aria-label={`Copy code ${code}`}
      className={`rounded-md border border-dashed px-2 py-0.5 font-mono font-semibold tracking-wider ${tone === "dark" ? "border-white/70 hover:bg-white/10" : "border-moss bg-white text-ink hover:bg-moss-soft"}`}
    >
      {copied ? "Copied" : code}
    </button>
  );
}
