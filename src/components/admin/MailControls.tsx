"use client";

import { useState, useTransition } from "react";
import { applyEmail, checkInboxNow, emailCustomerUpdate, ignoreEmail } from "@/app/admin/actions";
import { showToast } from "@/lib/toast";
import { UPDATE_LABELS, type CustomerUpdateKind } from "@/lib/mail/templates";

export function CheckInboxButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={() => start(async () => { const r = await checkInboxNow(); showToast({ title: r.message }); })}
      className="rounded-lg bg-ink px-4 py-2 font-semibold text-white disabled:opacity-50"
    >
      {pending ? "Checking…" : "Check inbox now"}
    </button>
  );
}

type OrderOption = { id: string; label: string; items: { id: string; label: string }[] };

export function EmailActions({ id, matched, canEmail, orders }: { id: string; matched: boolean; canEmail: boolean; orders: OrderOption[] }) {
  const [pending, start] = useTransition();
  const [orderId, setOrderId] = useState("");
  const [itemId, setItemId] = useState("");
  const chosen = orders.find((o) => o.id === orderId);
  const run = (email: boolean) =>
    start(async () => {
      const r = await applyEmail(id, email, matched ? undefined : orderId || undefined, matched ? undefined : itemId || undefined);
      showToast({ title: r.message });
    });
  return (
    <div className="mt-3 space-y-2">
      {!matched && (
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor={`o-${id}`}>Order</label>
          <select id={`o-${id}`} value={orderId} onChange={(e) => { setOrderId(e.target.value); setItemId(""); }} className="rounded-lg border border-line bg-white px-2 py-1.5 text-[14px]">
            <option value="">Match to order…</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {chosen && chosen.items.length > 1 && (
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1.5 text-[14px]" aria-label="Item">
              <option value="">Which item? (for tracking)</option>
              {chosen.items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {canEmail && (
          <button type="button" disabled={pending || (!matched && !orderId)} onClick={() => run(true)} className="rounded-lg bg-moss px-3 py-1.5 text-[14px] font-semibold text-white hover:bg-moss-deep disabled:opacity-50">
            Update order and email customer
          </button>
        )}
        <button type="button" disabled={pending || (!matched && !orderId)} onClick={() => run(false)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[14px] font-semibold hover:border-ink disabled:opacity-50">
          Update order only
        </button>
        <button type="button" disabled={pending} onClick={() => start(async () => { await ignoreEmail(id); showToast({ title: "Ignored" }); })} className="rounded-lg px-3 py-1.5 text-[14px] font-semibold text-muted hover:text-ink">
          Ignore
        </button>
      </div>
    </div>
  );
}

export function CustomerUpdateForm({ orderId, trackingUrl, mailReady }: { orderId: string; trackingUrl?: string; mailReady: boolean }) {
  const [kind, setKind] = useState<CustomerUpdateKind | "confirmation">("dispatched");
  const [url, setUrl] = useState(trackingUrl ?? "");
  const [pending, start] = useTransition();
  if (!mailReady) return <p className="text-[14px] text-muted">Set up ZeptoMail (ZOHO_ZEPTOMAIL_TOKEN and ZOHO_ZEPTOMAIL_FROM) to email customers from your own address.</p>;
  return (
    <div className="space-y-3 text-[14px]">
      <label className="block font-semibold">
        What to tell them
        <select value={kind} onChange={(e) => setKind(e.target.value as CustomerUpdateKind | "confirmation")} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5">
          <option value="confirmation">Order confirmation (resend)</option>
          {(Object.keys(UPDATE_LABELS) as CustomerUpdateKind[]).map((k) => <option key={k} value={k}>{UPDATE_LABELS[k]}</option>)}
        </select>
      </label>
      {kind !== "confirmation" && (
        <label className="block font-semibold">
          Tracking link <span className="font-normal text-muted">(optional)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (a carrier link, not the supplier's site)" className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 font-mono text-[13px]" />
        </label>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { const r = await emailCustomerUpdate(orderId, kind, url); showToast({ title: r.message }); })}
        className="w-full rounded-lg bg-moss px-3 py-2 font-semibold text-white hover:bg-moss-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email the customer"}
      </button>
    </div>
  );
}
