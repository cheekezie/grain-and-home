"use client";

import { createContext, useContext } from "react";
import type { ShopClientWords } from "@/lib/shop/types";

// The shop's own words (what a product is called, where it delivers) for
// client components: basket, checkout, pop-ups. Set once in the store layout.
const Ctx = createContext<ShopClientWords>({ item: "item", items: "items", browse: "Browse the shop", deliveryArea: "uk" });

export function ShopWordsProvider({ value, children }: { value: ShopClientWords; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShopWords = () => useContext(Ctx);
