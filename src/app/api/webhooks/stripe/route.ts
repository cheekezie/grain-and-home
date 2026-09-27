import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createOrderFromSession } from "@/lib/orders";

export const runtime = "nodejs";

// Stripe's confirmation that a checkout was paid: the source of truth for
// creating orders (not the browser's redirect to /success). Bank-based
// methods can complete later, hence async_payment_succeeded too.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await createOrderFromSession(event.data.object as Stripe.Checkout.Session);
  }
  return NextResponse.json({ received: true });
}
