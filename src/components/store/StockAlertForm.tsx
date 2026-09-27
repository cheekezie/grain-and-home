"use client";

import { useState, useTransition } from "react";
import { requestStockAlert } from "@/app/(store)/actions";

export default function StockAlertForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (result?.ok) return <p role="status" className="mt-6 rounded-xl bg-moss-soft p-4 text-[15px]">{result.message}</p>;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); start(async () => setResult(await requestStockAlert(productId, email))); }}
      className="mt-6 rounded-xl bg-plaster p-4"
    >
      <p className="font-semibold">Out of stock with our supplier right now</p>
      <p className="mt-1 text-[15px] text-muted">Leave your email and we&rsquo;ll tell you once when it&rsquo;s back.</p>
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="stock-email">Email address</label>
        <input id="stock-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5" />
        <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 font-semibold text-white disabled:opacity-60">{pending ? "…" : "Notify me"}</button>
      </div>
      {result && !result.ok && <p role="alert" className="mt-2 text-[14px] font-semibold text-danger">{result.message}</p>}
    </form>
  );
}
