"use client";

import Link from "next/link";
import { savedItems } from "@/lib/shopperLists";

export default function SavedLink() {
  const n = savedItems.useList().length;
  return (
    <Link href="/saved" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[15px] font-medium hover:bg-plaster" aria-label={`Saved items: ${n}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill={n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3Z" />
      </svg>
      <span className="hidden sm:inline">Saved</span>
      {n > 0 && <span className="tabular text-[13px]">{n}</span>}
    </Link>
  );
}
