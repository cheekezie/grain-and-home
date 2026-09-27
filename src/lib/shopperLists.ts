"use client";

import { createLocalList } from "./localList";

// Kept in this browser only. Prices aren't stored: saved and recently
// viewed items are re-read from the shop so prices are always current.
export interface ShopperItem {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
}

export const savedItems = createLocalList<ShopperItem>("saved-v1", 60);
export const recentItems = createLocalList<ShopperItem>("recent-v1", 12);

export function toggleSaved(item: ShopperItem) {
  const list = savedItems.get();
  savedItems.write(list.some((i) => i.productId === item.productId) ? list.filter((i) => i.productId !== item.productId) : [item, ...list]);
}

export function recordViewed(item: ShopperItem) {
  recentItems.write([item, ...recentItems.get().filter((i) => i.productId !== item.productId)]);
}
