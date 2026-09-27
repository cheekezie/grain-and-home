"use client";

import { useState, useTransition } from "react";
import { addReturnNote, changeReturnStatus } from "@/app/admin/actions";
import { RETURN_STATUSES, RETURN_STATUS_LABELS, type ReturnStatus } from "@/lib/catalogue";

const ACTION_LABEL: Record<ReturnStatus, string> = {
  new: "Reopen",
  instructions_sent: "Mark instructions sent",
  on_its_way: "Mark as being returned",
  closed: "Close",
};

export function ReturnStatusActions({ id, status }: { id: string; status: ReturnStatus }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <label className="block text-[14px] font-semibold" htmlFor="return-note">Note for the timeline (optional)</label>
      <textarea
        id="return-note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Supplier collection booked for 3 Oct, their RMA 8812"
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px]"
      />
      <div className="flex flex-wrap gap-2">
        {RETURN_STATUSES.filter((s) => s !== status).map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await changeReturnStatus(id, s, note); setNote(""); })}
            className={`rounded-full px-4 py-2 text-[15px] font-semibold disabled:opacity-60 ${s === "new" || s === "closed" ? "border border-line hover:border-ink" : "bg-moss text-white hover:bg-moss-deep"}`}
          >
            {ACTION_LABEL[s]}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-muted">Refunds are made in Stripe from the order page, then recorded there.</p>
    </div>
  );
}

export function ReturnNoteForm({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="rn">Add a note</label>
      <input id="rn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-[15px]" />
      <button type="button" disabled={!note.trim() || pending} onClick={() => start(async () => { await addReturnNote(id, note); setNote(""); })} className="rounded-xl bg-ink px-4 font-semibold text-white disabled:opacity-40">Add</button>
    </div>
  );
}

export { RETURN_STATUS_LABELS };
