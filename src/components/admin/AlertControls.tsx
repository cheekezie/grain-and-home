"use client";

import { useTransition } from "react";
import { markStockAlertsNotified } from "@/app/admin/actions";

export function MarkNotified({ productId, count }: { productId: string; count: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => markStockAlertsNotified(productId))}
      className="rounded-lg bg-ink px-3 py-1.5 text-[14px] font-semibold text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : `Mark ${count} as emailed`}
    </button>
  );
}
