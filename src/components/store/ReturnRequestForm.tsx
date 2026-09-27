"use client";

import { useState, useTransition } from "react";
import { lookupOrder, submitReturnRequest, type ReturnableItem } from "@/app/(store)/returns/request/actions";
import { FREE_RETURN_REASONS, RETURN_REASONS, RETURN_REASON_LABELS, type ReturnReason } from "@/lib/catalogue";

const input = "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5";

// Two steps: find the order (number + checkout email), then choose items
// and a reason. The server re-checks the match on submit.
export default function ReturnRequestForm({ supportEmail }: { supportEmail?: string }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<ReturnableItem[] | null>(null);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();

  if (done != null) {
    return (
      <div role="status" className="rounded-2xl bg-plaster p-6">
        <h2 className="font-display text-2xl">Return request R{done} received</h2>
        <p className="mt-3">
          We&rsquo;ll email you at <strong>{email}</strong> within 2 working days with how to send the item back.
          Please keep the item and its packaging until then.
        </p>
      </div>
    );
  }

  const find = () =>
    start(async () => {
      setError(null);
      const r = await lookupOrder({ orderNumber: orderNumber.replace(/^#/, ""), email });
      if (!r.ok) return setError(r.message);
      setItems(r.items);
      if (r.items.length === 1) setChosen({ [r.items[0].id]: r.items[0].quantity });
    });

  const submit = () =>
    start(async () => {
      setError(null);
      if (!reason) return setError("Choose a reason for the return.");
      const r = await submitReturnRequest({
        orderNumber: orderNumber.replace(/^#/, ""),
        email,
        reason,
        details,
        items: Object.entries(chosen).map(([id, quantity]) => ({ id, quantity })),
      });
      if (!r.ok) return setError(r.message);
      setDone(r.number);
    });

  if (!items) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          find();
        }}
        className="max-w-md space-y-4"
      >
        <label className="block text-[15px] font-semibold">
          Order number
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} inputMode="numeric" placeholder="e.g. 1024" required className={input} />
        </label>
        <label className="block text-[15px] font-semibold">
          Email used at checkout
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={input} />
        </label>
        {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
        <button type="submit" disabled={pending} className="rounded-full bg-moss px-6 py-3 font-semibold text-white hover:bg-moss-deep disabled:opacity-60">
          {pending ? "Finding your order…" : "Find my order"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="max-w-xl space-y-6"
    >
      <fieldset>
        <legend className="text-[15px] font-semibold">What would you like to return from order #{orderNumber.replace(/^#/, "")}?</legend>
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
          {items.map((i) => {
            const on = chosen[i.id] != null;
            return (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <input
                  id={`item-${i.id}`}
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    setChosen((c) => {
                      const next = { ...c };
                      if (e.target.checked) next[i.id] = i.quantity;
                      else delete next[i.id];
                      return next;
                    })
                  }
                  className="size-5 accent-moss"
                />
                <label htmlFor={`item-${i.id}`} className="flex-1">{i.name}</label>
                {on && i.quantity > 1 && (
                  <select
                    aria-label={`How many ${i.name}`}
                    value={chosen[i.id]}
                    onChange={(e) => setChosen((c) => ({ ...c, [i.id]: Number(e.target.value) }))}
                    className="rounded-lg border border-line bg-white px-2 py-1"
                  >
                    {Array.from({ length: i.quantity }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold">Reason</legend>
        <div className="mt-2 space-y-2">
          {RETURN_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-moss" />
              {RETURN_REASON_LABELS[r]}
            </label>
          ))}
        </div>
        {reason && (
          <p className="mt-3 rounded-lg bg-plaster p-3 text-[14px]">
            {FREE_RETURN_REASONS.includes(reason)
              ? "You won't pay for this return. Photos help: reply to our email with them and we'll sort a replacement, repair or refund."
              : "You can cancel within 14 days of delivery. The return cost shown on the product page is taken off your refund."}
          </p>
        )}
      </fieldset>

      <label className="block text-[15px] font-semibold">
        {reason && reason !== "changed_mind" ? "What's wrong?" : "Anything else we should know? (optional)"}
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} maxLength={3000} className={input} />
      </label>

      {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || Object.keys(chosen).length === 0}
          className="rounded-full bg-moss px-6 py-3 font-semibold text-white hover:bg-moss-deep disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send return request"}
        </button>
        <button type="button" onClick={() => { setItems(null); setChosen({}); setError(null); }} className="text-[15px] underline">
          Use a different order
        </button>
      </div>
      {supportEmail && <p className="text-[14px] text-muted">Prefer email? Write to <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a> with your order number.</p>}
    </form>
  );
}
