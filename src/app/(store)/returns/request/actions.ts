"use server";

import { z } from "zod";
import { connectDB } from "@/lib/db";
import OrderModel from "@/models/Order";
import ReturnRequestModel from "@/models/ReturnRequest";
import { nextSequence } from "@/models/Counter";
import { RETURN_REASONS } from "@/lib/catalogue";

// The customer proves the order is theirs with its number plus the email
// used at checkout. Nothing beyond item names is revealed before that match.

const lookupSchema = z.object({
  orderNumber: z.coerce.number().int().positive(),
  email: z.email().trim().toLowerCase(),
});

export type ReturnableItem = { id: string; name: string; quantity: number };
export type LookupResult = { ok: true; orderNumber: number; items: ReturnableItem[] } | { ok: false; message: string };

async function findOrder(orderNumber: number, email: string) {
  await connectDB();
  const order = await OrderModel.findOne({ number: orderNumber }).lean();
  if (!order || String(order.customerEmail).toLowerCase() !== email) return null;
  return order;
}

export async function lookupOrder(input: { orderNumber: string; email: string }): Promise<LookupResult> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter your order number and the email you used at checkout." };
  const order = await findOrder(parsed.data.orderNumber, parsed.data.email);
  if (!order) {
    return { ok: false, message: "We couldn't find an order with that number and email. Check your order confirmation, or contact us." };
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    return { ok: false, message: "This order has already been cancelled or refunded. Contact us if something's not right." };
  }
  return {
    ok: true,
    orderNumber: order.number,
    items: (order.items ?? []).map((i) => ({ id: String(i._id), name: i.name, quantity: i.quantity })),
  };
}

const submitSchema = lookupSchema.extend({
  reason: z.enum(RETURN_REASONS),
  details: z.string().trim().max(3000).default(""),
  items: z
    .array(z.object({ id: z.string(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Choose at least one item")
    .max(30),
});

export type SubmitResult = { ok: true; number: number } | { ok: false; message: string };

export async function submitReturnRequest(input: unknown): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const d = parsed.data;
  if (d.reason !== "changed_mind" && d.details.length < 10) {
    return { ok: false, message: "Tell us briefly what's wrong, so we can sort it out quickly." };
  }
  const order = await findOrder(d.orderNumber, d.email);
  if (!order) return { ok: false, message: "We couldn't match that order. Start again or contact us." };

  const byId = new Map((order.items ?? []).map((i) => [String(i._id), i]));
  const items = [];
  for (const sel of d.items) {
    const line = byId.get(sel.id);
    if (!line) return { ok: false, message: "One of the items isn't on this order." };
    items.push({ orderItem: line._id, name: line.name, quantity: Math.min(sel.quantity, line.quantity) });
  }

  const number = await nextSequence("return");
  await ReturnRequestModel.create({
    number,
    order: order._id,
    orderNumber: order.number,
    email: d.email,
    reason: d.reason,
    details: d.details,
    items,
    events: [{ note: "Request submitted by the customer." }],
  });
  return { ok: true, number };
}
