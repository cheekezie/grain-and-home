import "server-only";
import { cache } from "react";
import { connectDB } from "./db";
import PromoCodeModel from "@/models/PromoCode";
import OrderModel from "@/models/Order";
import type { PromoRule } from "./promoPricing";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Lean = Record<string, any>;

/** What the storefront may know about an announced or welcome promo. */
export interface PublicPromo {
  id: string;
  code: string;
  headline: string;
  expiresAt?: string;
  minSpend?: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categories: string[];
}

const live = () => {
  const now = new Date();
  return {
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
    ],
  };
};

export function toRule(p: Lean): PromoRule {
  return {
    code: p.code,
    headline: p.headline,
    kind: p.kind,
    value: p.value,
    scope: p.scope ?? "all",
    productIds: (p.products ?? []).map(String),
    categories: p.categories ?? [],
    minSpend: p.minSpend ?? undefined,
  };
}

function toPublic(p: Lean): PublicPromo {
  return {
    id: String(p._id),
    code: p.code,
    headline: p.headline,
    expiresAt: p.expiresAt instanceof Date ? p.expiresAt.toISOString() : undefined,
    minSpend: p.minSpend ?? undefined,
    scope: p.scope ?? "all",
    productIds: (p.products ?? []).map(String),
    categories: p.categories ?? [],
  };
}

/** The promo announced site-wide (newest if several). */
export const getAnnouncedPromo = cache(async (): Promise<PublicPromo | null> => {
  await connectDB();
  const p = await PromoCodeModel.findOne({ ...live(), announce: true }).sort({ updatedAt: -1 }).lean();
  return p ? toPublic(p) : null;
});

/** The code given to new email subscribers, if one is set up. */
export const getWelcomePromo = cache(async (): Promise<PublicPromo | null> => {
  await connectDB();
  const p = await PromoCodeModel.findOne({ ...live(), welcome: true }).sort({ updatedAt: -1 }).lean();
  return p ? toPublic(p) : null;
});

/**
 * Look up a code a customer typed. Checks it exists, is live, has uses
 * left and (if once-per-customer) that this email hasn't used it.
 */
export async function findUsablePromo(input: string, email?: string): Promise<{ ok: true; rule: PromoRule } | { ok: false; message: string }> {
  const code = input.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return { ok: false, message: "That code doesn't look right. Check and try again." };
  await connectDB();
  const p = await PromoCodeModel.findOne({ code }).lean();
  if (!p || !p.active) return { ok: false, message: `${code} isn't a valid code.` };
  const now = new Date();
  if (p.startsAt && p.startsAt > now) return { ok: false, message: `${code} isn't active yet.` };
  if (p.expiresAt && p.expiresAt <= now) return { ok: false, message: `${code} has expired.` };
  if (p.maxUses && (p.usedCount ?? 0) >= p.maxUses) return { ok: false, message: `${code} has been fully used.` };
  if (p.oncePerCustomer && email) {
    const used = await OrderModel.exists({ customerEmail: email.trim().toLowerCase(), promoCode: code, status: { $ne: "cancelled" } });
    if (used) return { ok: false, message: `You've already used ${code}.` };
  }
  return { ok: true, rule: toRule(p) };
}
