"use client";

import { useCart } from "@/lib/CartContext";
import { showToast } from "@/lib/toast";

// One-tap "add 1 to basket" on product cards, confirmed with a toast.
export default function QuickAdd({ item }: { item: { productId: string; slug: string; name: string; price: number; image: string | null } }) {
  const { addItem } = useCart();
  return (
    <button
      type="button"
      onClick={() => {
        addItem(item, 1);
        showToast({ title: "Added to your basket", body: item.name, image: item.image, action: { label: "View basket", href: "/basket" } });
      }}
      aria-label={`Add ${item.name} to basket`}
      className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-moss"
    >
      <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M10 4v12M4 10h12" />
      </svg>
      Add
    </button>
  );
}
