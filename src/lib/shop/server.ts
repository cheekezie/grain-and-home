import "server-only";
import { cache } from "react";
import { connectDB } from "@/lib/db";
import ShopSettingsModel from "@/models/ShopSettings";
import CategoryModel from "@/models/Category";
import { PRESETS } from "./presets";
import type { ShopCategory, ShopClientWords, ShopSettings } from "./types";

// Reads the shop's settings and categories. Pages are cached (ISR), and
// every admin save refreshes them, so reading on render is cheap.

const OBJECT_KEYS = ["hero", "home", "trust", "words", "delivery", "nav", "google"] as const;

/** Stored settings over the blank preset, so a setting added later always has a value. */
export function withDefaults(stored: Partial<ShopSettings> | null | undefined): ShopSettings {
  const base = PRESETS.blank.settings;
  if (!stored) return base;
  const out = { ...base, ...stored } as ShopSettings;
  for (const k of OBJECT_KEYS) {
    (out as unknown as Record<string, unknown>)[k] = { ...(base[k] as object), ...((stored[k] as object | undefined) ?? {}) };
  }
  out.details = Array.isArray(stored.details) ? stored.details : base.details;
  return out;
}

export const getShopSettings = cache(async (): Promise<ShopSettings & { configured: boolean }> => {
  await connectDB();
  const doc = (await ShopSettingsModel.findById("shop").lean()) as { settings?: Partial<ShopSettings> } | null;
  return { ...withDefaults(doc?.settings), configured: !!doc };
});

type LeanCategory = Record<string, unknown> & { _id: unknown };

export function toCategory(c: LeanCategory): ShopCategory {
  const img = c.image as ShopCategory["image"] | undefined;
  return {
    id: String(c._id),
    slug: c.slug as string,
    name: c.name as string,
    blurb: (c.blurb as string) ?? "",
    pageTitle: (c.pageTitle as string) ?? "",
    intro: (c.intro as string) ?? "",
    metaDescription: (c.metaDescription as string) ?? "",
    guide: (c.guide as string) ?? "",
    image: img?.url ? { url: img.url, alt: img.alt ?? "", credit: img.credit || undefined, creditUrl: img.creditUrl || undefined, ...(img.cutout && { cutout: true }) } : undefined,
    sortOrder: (c.sortOrder as number) ?? 100,
  };
}

export const getCategories = cache(async (): Promise<ShopCategory[]> => {
  await connectDB();
  const docs = await CategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  return docs.map((d) => toCategory(d as LeanCategory));
});

export const getCategory = cache(async (slug: string) => (await getCategories()).find((c) => c.slug === slug) ?? null);

/** slug → name, for labels (falls back to the slug for a deleted category). */
export const getCategoryNames = cache(async () => {
  const map = new Map((await getCategories()).map((c) => [c.slug, c.name]));
  return (slug: string) => map.get(slug) ?? slug;
});

export const getClientWords = cache(async (): Promise<ShopClientWords> => {
  const s = await getShopSettings();
  return { item: s.words.item, items: s.words.items, browse: s.words.browse, deliveryArea: s.delivery.area };
});
