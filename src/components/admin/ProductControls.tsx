"use client";

import { useState, useTransition } from "react";
import { setAvailability, setProductStatus } from "@/app/admin/actions";
import { AVAILABILITY, AVAILABILITY_LABELS, type Availability } from "@/lib/catalogue";

export function PublishToggle({ id, status }: { id: string; status: "draft" | "published" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = status === "published" ? "draft" : "published";
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await setProductStatus(id, next);
            if (!r.ok) setError(r.message ?? "Couldn't change this.");
          })
        }
        className={`rounded-lg px-3 py-1.5 text-[14px] font-semibold disabled:opacity-60 ${status === "published" ? "border border-line bg-white hover:border-ink" : "bg-moss text-white hover:bg-moss-deep"}`}
      >
        {pending ? "…" : status === "published" ? "Unpublish" : "Publish"}
      </button>
      {error && <span role="alert" className="mt-1 max-w-48 text-right text-[13px] text-danger">{error}</span>}
    </span>
  );
}

/** One click per status: records availability and stamps the check date. */
export function AvailabilityButtons({ id, current }: { id: string; current: Availability }) {
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Set availability" className="flex flex-wrap gap-1.5">
      {AVAILABILITY.map((a) => (
        <button
          key={a}
          type="button"
          disabled={pending}
          aria-pressed={a === current}
          onClick={() => start(() => setAvailability(id, a))}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold disabled:opacity-60 ${
            a === current ? (a === "out_of_stock" || a === "discontinued" ? "bg-danger text-white" : "bg-moss text-white") : "border border-line bg-white hover:border-ink"
          }`}
          title={a === current ? "Confirm still " + AVAILABILITY_LABELS[a].toLowerCase() : undefined}
        >
          {AVAILABILITY_LABELS[a]}
        </button>
      ))}
    </div>
  );
}
