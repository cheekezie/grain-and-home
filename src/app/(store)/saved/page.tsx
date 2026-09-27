import type { Metadata } from "next";
import { SavedList } from "@/components/store/ShopperRows";

export const metadata: Metadata = { title: "Saved items", robots: { index: false } };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl">Saved items</h1>
      <SavedList />
    </div>
  );
}
