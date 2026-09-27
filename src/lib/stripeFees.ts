import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";

/**
 * The actual fee Stripe charged on a payment (pence), from the charge's
 * balance transaction. null if it isn't available yet (e.g. Klarna can
 * settle later) or Stripe can't be reached; callers retry later.
 */
export async function fetchStripeFee(paymentIntentId: string): Promise<number | null> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null | undefined;
    return bt && typeof bt === "object" ? bt.fee : null;
  } catch (e) {
    console.error("[stripe-fee] couldn't read fee:", (e as Error).message);
    return null;
  }
}
