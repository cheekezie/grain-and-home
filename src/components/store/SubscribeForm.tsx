"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { subscribe, type SubscribeResult } from "@/app/(store)/actions";
import { rememberClaimedPromo, subscribeConsent } from "@/lib/marketing";
import { siteConfig } from "@/lib/siteConfig";
import { useShopWords } from "./ShopWords";
import { formatLondonDay } from "@/lib/londonDate";

// Email sign-up for offers. If a welcome code is set up in the admin, a
// new subscriber gets it straight away (and it's prefilled at checkout).
export default function SubscribeForm({ source, tone = "light", onDone }: { source: string; tone?: "light" | "plain"; onDone?: () => void }) {
  const words = useShopWords();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [pending, start] = useTransition();

  if (result?.ok) {
    return (
      <div role="status" className="text-[15px]">
        {result.welcome ? (
          <>
            <p className="font-semibold">You&rsquo;re subscribed. Here&rsquo;s your code:</p>
            <p className="mt-2 inline-block rounded-lg border-2 border-dashed border-moss bg-white px-3 py-1.5 font-mono text-lg font-semibold tracking-wider">{result.welcome.code}</p>
            <p className="mt-2">
              {result.welcome.headline}
              {result.welcome.expiresAt && <>, until {formatLondonDay(result.welcome.expiresAt)}</>}. We&rsquo;ve saved it for checkout.
            </p>
          </>
        ) : (
          <p className="font-semibold">{result.already ? "You're already subscribed. Thanks!" : "You're subscribed. Thanks!"}</p>
        )}
        {onDone && <button type="button" onClick={onDone} className="mt-3 font-semibold text-moss underline">Continue shopping</button>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await subscribe(email, source);
          if (r.ok && r.welcome) rememberClaimedPromo(r.welcome.code);
          setResult(r);
        });
      }}
    >
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`sub-${source}`}>Email address</label>
        <input
          id={`sub-${source}`}
          type="email"
          required
          autoComplete="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`min-w-0 flex-1 rounded-full border px-4 py-2.5 ${tone === "light" ? "border-line bg-white" : "border-line bg-white"}`}
        />
        <button type="submit" disabled={pending} className="rounded-full bg-moss px-5 font-semibold text-white hover:bg-moss-deep disabled:opacity-60">
          {pending ? "…" : "Sign up"}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-muted">{subscribeConsent(siteConfig.name, words.items)} <Link href="/privacy" className="underline">Privacy</Link></p>
      {result && !result.ok && <p role="alert" className="mt-1 text-[14px] font-semibold text-danger">{result.message}</p>}
    </form>
  );
}
