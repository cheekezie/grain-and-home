// Checks the Stripe setup: which key is in use, which payment methods
// checkout will offer (including Klarna), and whether a webhook endpoint
// exists for this site.
//
//   npm run stripe:check
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!/^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(key)) {
    console.log("✗ STRIPE_SECRET_KEY is missing or a placeholder. Add it to .env.local.");
    process.exit(1);
  }
  const stripe = new Stripe(key);
  console.log(`Mode: ${key.startsWith("sk_live_") ? "LIVE (real payments)" : "test (no real payments)"}`);

  const account = await stripe.accounts.retrieveCurrent();
  console.log(`Account: ${account.settings?.dashboard?.display_name ?? account.id}, country ${account.country}, charges enabled: ${account.charges_enabled}`);

  const configs = await stripe.paymentMethodConfigurations.list({ limit: 20 });
  const c = (configs.data.find((x) => x.is_default) ?? configs.data[0]) as unknown as Record<string, { available?: boolean; display_preference?: { value?: string } }>;
  const keys = ["card", "apple_pay", "google_pay", "link", "paypal", "klarna", "afterpay_clearpay", "revolut_pay"];
  console.log("\nPayment methods (offered at checkout = on in Dashboard AND capability active):");
  for (const k of keys) {
    const m = c?.[k];
    if (!m) continue;
    console.log(`  ${m.available ? "✓" : "✗"} ${k.padEnd(18)} setting: ${m.display_preference?.value ?? "?"}`);
  }
  if (!c?.klarna?.available) {
    console.log("\n  Klarna is NOT being offered. Turn it on: Stripe Dashboard → Settings → Payment methods → Klarna.");
  }

  const hooks = await stripe.webhookEndpoints.list({ limit: 20 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const ours = hooks.data.filter((h) => h.url.includes("/api/webhooks/stripe"));
  console.log(`\nWebhook endpoints for /api/webhooks/stripe: ${ours.length ? ours.map((h) => `${h.url} [${h.enabled_events.join(", ")}]`).join("; ") : "none"}`);
  if (!ours.length) console.log(`  For production add ${site || "https://your-domain"}/api/webhooks/stripe with events checkout.session.completed and checkout.session.async_payment_succeeded. Locally use: stripe listen --forward-to localhost:3000/api/webhooks/stripe`);
  console.log(`\nSTRIPE_WEBHOOK_SECRET: ${/^whsec_[A-Za-z0-9]{20,}$/.test(process.env.STRIPE_WEBHOOK_SECRET ?? "") ? "set" : "missing or placeholder"}`);
}

main().catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
