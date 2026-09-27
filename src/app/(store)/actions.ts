"use server";

import { randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getWelcomePromo } from "@/lib/promos";
import { SUBSCRIBE_CONSENT } from "@/lib/marketing";
import SubscriberModel from "@/models/Subscriber";
import StockAlertModel from "@/models/StockAlert";
import ProductModel from "@/models/Product";

const email = z.email().trim().toLowerCase().max(200);

export type SubscribeResult =
  | { ok: true; already: boolean; welcome?: { code: string; headline: string; expiresAt?: string } }
  | { ok: false; message: string };

export async function subscribe(input: string, source: string): Promise<SubscribeResult> {
  const parsed = email.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  await connectDB();
  const existing = await SubscriberModel.findOne({ email: parsed.data }).lean();
  if (existing && !existing.unsubscribedAt) {
    return { ok: true, already: true };
  }
  if (existing) {
    await SubscriberModel.updateOne({ _id: existing._id }, { $set: { consentText: SUBSCRIBE_CONSENT, source: source.slice(0, 30) }, $unset: { unsubscribedAt: 1 } });
  } else {
    await SubscriberModel.create({ email: parsed.data, source: source.slice(0, 30), consentText: SUBSCRIBE_CONSENT, unsubscribeToken: randomBytes(24).toString("base64url") });
  }
  // A welcome code only for genuinely new sign-ups.
  const w = existing ? null : await getWelcomePromo();
  return { ok: true, already: false, welcome: w ? { code: w.code, headline: w.headline, expiresAt: w.expiresAt } : undefined };
}

export async function requestStockAlert(productId: string, input: string): Promise<{ ok: boolean; message: string }> {
  const parsed = email.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  if (!isValidObjectId(productId)) return { ok: false, message: "Something went wrong. Refresh and try again." };
  await connectDB();
  if (!(await ProductModel.exists({ _id: productId, status: "published" }))) return { ok: false, message: "This product is no longer available." };
  await StockAlertModel.updateOne({ product: productId, email: parsed.data }, { $setOnInsert: { product: productId, email: parsed.data }, $unset: { notifiedAt: 1 } }, { upsert: true });
  return { ok: true, message: "We'll email you once when it's back in stock. That's all we'll use your email for." };
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false;
  await connectDB();
  const r = await SubscriberModel.updateOne({ unsubscribeToken: token, unsubscribedAt: null }, { $set: { unsubscribedAt: new Date() } });
  return r.matchedCount > 0 || !!(await SubscriberModel.exists({ unsubscribeToken: token }));
}
