"use client";

import { savedItems, toggleSaved, type ShopperItem } from "@/lib/shopperLists";
import { showToast } from "@/lib/toast";

export default function SaveButton({ item, variant = "full" }: { item: ShopperItem; variant?: "full" | "icon" }) {
  const saved = savedItems.useList().some((i) => i.productId === item.productId);
  const toggle = () => {
    toggleSaved(item);
    showToast(
      saved
        ? { title: "Removed from saved", body: item.name, image: item.image }
        : { title: "Saved for later", body: item.name, image: item.image, action: { label: "View saved items", href: "/saved" } },
    );
  };
  const heart = (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3Z" />
    </svg>
  );
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
        className={`flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white ${saved ? "text-danger" : "text-ink"}`}
      >
        {heart}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 text-[15px] font-semibold hover:underline ${saved ? "text-danger" : ""}`}
    >
      {heart}
      {saved ? "Saved" : "Save for later"}
    </button>
  );
}
