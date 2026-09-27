"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartContext";

export default function BasketLink() {
  const { count } = useCart();
  return (
    <Link href="/basket" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[15px] font-medium hover:border-ink">
      Basket
      <span className="tabular min-w-5 rounded-full bg-ink px-1.5 text-center text-[13px] text-white" aria-label={`${count} items`}>
        {count}
      </span>
    </Link>
  );
}
