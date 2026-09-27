import "server-only";
import { unstable_cache } from "next/cache";
import { stripe } from "./stripe";

// Which payment methods checkout actually offers, read from the Stripe
// account's default payment method configuration: `available` means
// switched on in the Dashboard AND the capability is active. So the site
// only ever advertises what Stripe Checkout will really show. Cached for an
// hour when read successfully; returns [] if Stripe isn't configured, and the UI then shows only
// "Secure checkout by Stripe".

export interface PaymentMark {
  label: string;
  /** Official mark in /public/payment-logos (sources in SOURCES.md). */
  logo: string;
  /** Width:height, so every mark can share one height. */
  ratio: number;
  /** Plain wordmarks sit on a white card; marks with their own shape don't. */
  card?: boolean;
}

const mark = (label: string, file: string, ratio: number, card = false): PaymentMark => ({ label, logo: `/payment-logos/${file}`, ratio, card });

// Stripe payment method key → the marks shown for it. Link has no published
// official logo, so it's deliberately absent.
const MARKS: [key: string, marks: PaymentMark[]][] = [
  // Stripe accepts these card brands in the UK by default.
  ["card", [mark("Visa", "visa.svg", 1.6, true), mark("Mastercard", "mastercard.svg", 1.6, true), mark("American Express", "amex.svg", 1)]],
  ["apple_pay", [mark("Apple Pay", "apple-pay.svg", 166 / 106)]],
  ["google_pay", [mark("Google Pay", "google-pay.svg", 512 / 272)]],
  ["klarna", [mark("Klarna", "klarna.svg", 1448 / 609)]],
  ["revolut_pay", [mark("Revolut Pay", "revolut-pay.svg", 2.6, true)]],
  ["amazon_pay", [mark("Amazon Pay", "amazon-pay.svg", 2.6, true)]],
];

// Failures throw inside the cache so they're never stored: an outage or a
// key being added mustn't leave the site showing nothing for an hour.
const readFromStripe = unstable_cache(
  async (): Promise<PaymentMark[]> => {
    const list = await stripe.paymentMethodConfigurations.list({ limit: 20 });
    const config = list.data.find((c) => c.is_default) ?? list.data[0];
    if (!config) throw new Error("No payment method configuration on the account");
    const c = config as unknown as Record<string, { available?: boolean } | undefined>;
    return MARKS.filter(([key]) => c[key]?.available).flatMap(([, marks]) => marks);
  },
  ["stripe-payment-marks-v2"],
  { revalidate: 3600 },
);

export async function getPaymentMethods(): Promise<PaymentMark[]> {
  try {
    return await readFromStripe();
  } catch (e) {
    console.error("[payment-methods] couldn't read Stripe configuration:", (e as Error).message);
    return [];
  }
}
