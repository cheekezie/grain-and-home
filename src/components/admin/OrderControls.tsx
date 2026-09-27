"use client";

import { useState, useTransition } from "react";
import { addOrderNote, changeOrderStatus, saveOrderItemRefs } from "@/app/admin/actions";
import { NEXT_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/catalogue";

const ACTION_LABEL: Record<OrderStatus, string> = {
  paid: "Mark paid",
  ordered: "Mark as ordered from supplier",
  dispatched: "Mark as dispatched",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
  refunded: "Mark as refunded",
};

export function StatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATUSES[status];
  if (next.length === 0) return <p className="text-[15px] text-muted">No further steps.</p>;

  return (
    <div className="space-y-3">
      <label className="block text-[14px] font-semibold" htmlFor="status-note">Note for the timeline (optional)</label>
      <textarea
        id="status-note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Ordered on supplier portal, their ref 55812"
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px]"
      />
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await changeOrderStatus(orderId, s, note);
                if (!r.ok) setError(r.message ?? "Couldn't update.");
                else setNote("");
              })
            }
            className={`rounded-full px-4 py-2 text-[15px] font-semibold disabled:opacity-60 ${
              s === "cancelled" || s === "refunded" ? "border border-line hover:border-danger hover:text-danger" : "bg-moss text-white hover:bg-moss-deep"
            }`}
          >
            {ACTION_LABEL[s]}
          </button>
        ))}
      </div>
      {next.includes("refunded") && (
        <p className="text-[13px] text-muted">Refund the payment in Stripe first; this only records it here.</p>
      )}
      {error && <p role="alert" className="text-[14px] font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function ItemRefs({ orderId, itemId, supplierOrderRef, trackingUrl }: { orderId: string; itemId: string; supplierOrderRef?: string; trackingUrl?: string }) {
  const [ref, setRef] = useState(supplierOrderRef ?? "");
  const [track, setTrack] = useState(trackingUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = ref !== (supplierOrderRef ?? "") || track !== (trackingUrl ?? "");
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
      <label className="text-[13px]">
        <span className="font-semibold">Supplier order ref</span>
        <input value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 font-mono text-[14px]" />
      </label>
      <label className="text-[13px]">
        <span className="font-semibold">Tracking link</span>
        <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 font-mono text-[14px]" />
      </label>
      <button
        type="button"
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            const r = await saveOrderItemRefs(orderId, itemId, { supplierOrderRef: ref, trackingUrl: track });
            setMsg(r.message ?? null);
          })
        }
        className="rounded-lg bg-ink px-3 py-1.5 text-[14px] font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {msg && <p role="status" className="text-[13px] sm:col-span-3">{msg}</p>}
    </div>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="order-note">Add a note</label>
      <input
        id="order-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note, e.g. Customer asked for delivery after 2pm"
        className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-[15px]"
      />
      <button
        type="button"
        disabled={!note.trim() || pending}
        onClick={() => start(async () => { await addOrderNote(orderId, note); setNote(""); })}
        className="rounded-xl bg-ink px-4 font-semibold text-white disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the text is on screen to copy by hand */
        }
      }}
      className="rounded-lg border border-line px-2.5 py-1 text-[13px] font-semibold hover:border-ink"
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function statusLabel(s: OrderStatus) {
  return ORDER_STATUS_LABELS[s];
}
