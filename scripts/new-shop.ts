// Set up another shop from this codebase (see docs/NEW-SHOP.md).
//
// 1. Make its settings file, with fresh secrets:
//      npx tsx scripts/new-shop.ts create --name="Hem & Ink" --domain=hemandink.co.uk --preset=clothing
//    (add --currency=USD for a shop that doesn't sell in pounds; default GBP)
//    → shops/hem-and-ink.env (git-ignored). Fill in the lines marked TODO.
//
// 2. Check it against the real services (database, Stripe, domain…):
//      npx tsx scripts/new-shop.ts check shops/hem-and-ink.env
//    (with only one file in shops/, the file name can be left out)
//
// 3. Fill the new database from its preset (categories, wording, hero…):
//      npx tsx scripts/new-shop.ts preset shops/hem-and-ink.env
//
// Then paste the file into the Vercel project (Settings → Environment
// Variables → Import .env) and deploy.
import { randomBytes, randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import mongoose from "mongoose";
import Stripe from "stripe";

const PRESETS = ["furniture", "clothing", "beauty", "blank"];
const TODO = "TODO";

const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=").trim();

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const secret = () => randomBytes(32).toString("base64url");

/** Six digits, avoiding the obvious ones (repeats, runs). */
function accessCode(): string {
  for (;;) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const digits = [...code].map(Number);
    const repeated = new Set(digits).size <= 2;
    const run = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1) || digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
    if (!repeated && !run) return code;
  }
}

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return env;
}

const quote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

// ------------------------------------------------------------ create

function create() {
  const name = flag("name") ?? fail('Give the shop a name: --name="Hem & Ink"');
  const domain = (flag("domain") ?? fail("Give its domain: --domain=hemandink.co.uk")).replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  const preset = flag("preset") ?? "blank";
  if (!PRESETS.includes(preset)) fail(`Preset must be one of: ${PRESETS.join(", ")}`);
  const email = flag("email") ?? `support@${domain.replace(/^www\./, "")}`;
  const currency = (flag("currency") ?? "GBP").toUpperCase();
  if (!Intl.supportedValuesOf("currency").includes(currency)) fail(`"${currency}" isn't a currency code. Use one like GBP, USD, EUR, NGN.`);
  const slug = slugify(name);
  const file = join("shops", `${slug}.env`);
  if (existsSync(file) && !args.includes("--force")) fail(`${file} already exists. Use --force to replace it (its secrets will change).`);

  const lines = [
    `# ${name}: settings for its own Vercel project. Made by scripts/new-shop.ts on ${new Date().toISOString().slice(0, 10)}.`,
    `# Keep this file private. Fill in every ${TODO}, then run: npx tsx scripts/new-shop.ts check ${file}`,
    `# Preset for its database: ${preset}`,
    "",
    "# Who the shop is",
    `NEXT_PUBLIC_STORE_NAME=${quote(name)}`,
    `NEXT_PUBLIC_SITE_URL=${quote(`https://${domain}`)}`,
    `NEXT_PUBLIC_SUPPORT_EMAIL=${quote(email)}`,
    "# Currency for all prices (ISO code). Set before the shop takes orders.",
    `NEXT_PUBLIC_CURRENCY=${quote(currency)}`,
    `NEXT_PUBLIC_BUSINESS_LEGAL_NAME=${quote(`${TODO}: the business's legal name`)}`,
    'NEXT_PUBLIC_COMPANY_NUMBER=""',
    'NEXT_PUBLIC_VAT_NUMBER=""',
    'NEXT_PUBLIC_BUSINESS_ADDRESS=""',
    'NEXT_PUBLIC_SUPPORT_PHONE=""',
    "",
    `# Its own database (MongoDB Atlas → Connect → Drivers). One database per shop, e.g. /${slug}`,
    `MONGODB_URI=${quote(`${TODO}: mongodb+srv://…/${slug}`)}`,
    "",
    "# Admin sign-in (generated: keep the code somewhere safe)",
    `ADMIN_ACCESS_CODE=${quote(accessCode())}`,
    `SESSION_SECRET=${quote(secret())}`,
    "",
    "# Payments: the business's OWN Stripe account (Developers → API keys, and the webhook's signing secret)",
    `STRIPE_SECRET_KEY=${quote(`${TODO}: sk_live_…`)}`,
    `STRIPE_WEBHOOK_SECRET=${quote(`${TODO}: whsec_… from the webhook for https://${domain}/api/webhooks/stripe`)}`,
    "",
    "# Customer emails: ZeptoMail (its own mail agent and verified domain)",
    `ZOHO_ZEPTOMAIL_TOKEN=${quote(`${TODO}: Send Mail token`)}`,
    `ZOHO_ZEPTOMAIL_FROM=${quote(`orders@${domain.replace(/^www\./, "")}`)}`,
    `ZOHO_ZEPTOMAIL_FROM_NAME=${quote(name)}`,
    "",
    "# Generated secrets",
    `SETTINGS_ENCRYPTION_KEY=${quote(secret())}`,
    `CRON_SECRET=${quote(secret())}`,
    `ZOHO_MAIL_WEBHOOK_KEY=${quote(secret())}`,
    "",
    "# Optional: paid address lookup at checkout",
    'IDEAL_POSTCODES_API_KEY=""',
    "",
  ];
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, lines.join("\n"), { mode: 0o600 });
  console.log(`\n✓ Made ${file} for ${name} (preset: ${preset}, currency: ${currency}).`);
  console.log(`\nNext:`);
  console.log(`  1. Fill in the lines marked ${TODO} (database, legal name, Stripe, ZeptoMail).`);
  console.log(`  2. npx tsx scripts/new-shop.ts check ${file}`);
  console.log(`  3. npx tsx scripts/new-shop.ts preset ${file}`);
  console.log(`  4. Vercel: import the file as environment variables, add the domain, deploy.`);
  console.log(`\nThe admin access code is in the file (ADMIN_ACCESS_CODE). Keep the file private.\n`);
}

// ------------------------------------------------------------ check

type Result = { ok: boolean; warn?: boolean; label: string; detail?: string };

async function check(file: string) {
  if (!existsSync(file)) fail(`No such file: ${file}`);
  const env = parseEnv(readFileSync(file, "utf8"));
  const results: Result[] = [];
  const add = (ok: boolean, label: string, detail?: string, warn = false) => results.push({ ok, label, detail, warn });
  const has = (k: string) => !!env[k] && !env[k].startsWith(TODO);

  // Values that must be filled in.
  for (const k of ["NEXT_PUBLIC_STORE_NAME", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPPORT_EMAIL", "NEXT_PUBLIC_BUSINESS_LEGAL_NAME", "MONGODB_URI", "ADMIN_ACCESS_CODE", "SESSION_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ZOHO_ZEPTOMAIL_TOKEN", "ZOHO_ZEPTOMAIL_FROM", "SETTINGS_ENCRYPTION_KEY", "CRON_SECRET", "ZOHO_MAIL_WEBHOOK_KEY"]) {
    add(has(k), k, has(k) ? undefined : "missing or still TODO");
  }

  // Formats.
  let host = "";
  try {
    const u = new URL(env.NEXT_PUBLIC_SITE_URL);
    host = u.host;
    add(u.protocol === "https:" && !host.startsWith("localhost"), "Site address is https on a real domain", env.NEXT_PUBLIC_SITE_URL);
  } catch {
    add(false, "Site address is a valid URL", env.NEXT_PUBLIC_SITE_URL);
  }
  add(/^\d{6}$/.test(env.ADMIN_ACCESS_CODE ?? ""), "Admin access code is 6 digits");
  const currency = (env.NEXT_PUBLIC_CURRENCY || "GBP").toUpperCase();
  add(Intl.supportedValuesOf("currency").includes(currency), "Currency is a real currency code", currency);
  add((env.SESSION_SECRET ?? "").length >= 32, "Session secret is long enough");
  add((env.SETTINGS_ENCRYPTION_KEY ?? "").length >= 32, "Encryption key is long enough");
  add(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.NEXT_PUBLIC_SUPPORT_EMAIL ?? ""), "Support email looks right", env.NEXT_PUBLIC_SUPPORT_EMAIL);
  const fromDomain = (env.ZOHO_ZEPTOMAIL_FROM ?? "").split("@")[1];
  add(!!fromDomain && host.replace(/^www\./, "").endsWith(fromDomain), "Emails are sent from the shop's own domain", env.ZOHO_ZEPTOMAIL_FROM, true);

  // Database.
  if (has("MONGODB_URI")) {
    try {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
      const db = mongoose.connection.db!;
      add(true, "Database connects", db.databaseName);
      const settings = await db.collection("shopsettings").findOne({ _id: "shop" as never });
      const categories = await db.collection("categories").countDocuments();
      add(!!settings, "Shop settings exist", settings ? `preset: ${(settings as { settings?: { preset?: string } }).settings?.preset ?? "?"}, ${categories} categories` : "run the preset step", !settings);
      const products = await db.collection("products").countDocuments({ status: "published" });
      add(products > 0, "Live products", `${products}`, products === 0);
      await mongoose.disconnect();
    } catch (e) {
      add(false, "Database connects", (e as Error).message.split("\n")[0]);
    }
  }

  // Stripe: the key works, which mode it's in, and the webhook for this domain.
  if (has("STRIPE_SECRET_KEY")) {
    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY);
      const account = await stripe.accounts.retrieveCurrent();
      const live = env.STRIPE_SECRET_KEY.startsWith("sk_live_");
      add(true, "Stripe key works", `${account.settings?.dashboard?.display_name ?? account.id}, ${live ? "LIVE" : "test mode"}`);
      add(live, "Stripe is in live mode", live ? undefined : "test key: fine for a trial, switch before launch", !live);
      const stripeDefault = account.default_currency?.toUpperCase();
      add(!stripeDefault || stripeDefault === currency, "Shop currency matches Stripe's", `shop ${currency}, Stripe account ${stripeDefault ?? "?"}${stripeDefault && stripeDefault !== currency ? " (payouts convert, with fees)" : ""}`, true);
      const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
      const want = `https://${host}/api/webhooks/stripe`;
      const hook = hooks.data.find((h) => h.url === want);
      add(!!hook, "Stripe webhook for this domain", hook ? `${hook.status}, events: ${hook.enabled_events.join(", ")}` : `add ${want} with checkout.session.completed and checkout.session.async_payment_succeeded`);
      if (hook) {
        const events = new Set(hook.enabled_events);
        add(events.has("checkout.session.completed") || events.has("*"), "Webhook sends checkout.session.completed");
      }
    } catch (e) {
      add(false, "Stripe key works", (e as Error).message.split("\n")[0]);
    }
  }

  // Domain: does it answer yet?
  if (host) {
    try {
      const res = await fetch(`https://${host}/robots.txt`, { signal: AbortSignal.timeout(8000) });
      add(res.ok, "Domain is live", `https://${host} answered ${res.status}`, !res.ok);
    } catch {
      add(false, "Domain is live", `https://${host} doesn't answer yet (fine before the first deploy)`, true);
    }
  }

  console.log(`\nChecking ${file}\n`);
  for (const r of results) console.log(`${r.ok ? "✓" : r.warn ? "!" : "✗"} ${r.label}${r.detail ? `: ${r.detail}` : ""}`);
  const errors = results.filter((r) => !r.ok && !r.warn).length;
  const warnings = results.filter((r) => !r.ok && r.warn).length;
  console.log(`\n${errors ? `${errors} to fix` : "Ready"}${warnings ? `, ${warnings} to look at` : ""}. ZeptoMail sending is tested from the shop's admin once deployed.\n`);
  process.exit(errors ? 1 : 0);
}

// ------------------------------------------------------------ preset

function preset(file: string) {
  if (!existsSync(file)) fail(`No such file: ${file}`);
  const text = readFileSync(file, "utf8");
  const env = parseEnv(text);
  const key = flag("preset") ?? text.match(/^# Preset for its database: (\w+)/m)?.[1] ?? fail("Say which preset: --preset=clothing");
  if (!env.MONGODB_URI || env.MONGODB_URI.startsWith(TODO)) fail("Fill in MONGODB_URI first.");
  const run = spawnSync("npx", ["tsx", "scripts/shop-setup.ts", `--preset=${key}`], {
    stdio: "inherit",
    // Only the database from this file; nothing from the local .env files leaks in.
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", NODE_ENV: "production", MONGODB_URI: env.MONGODB_URI, DOTENV_CONFIG_QUIET: "true" },
  });
  process.exit(run.status ?? 1);
}

// ------------------------------------------------------------

/**
 * The shop file to use: the one given, or (if none was given) the only file
 * in shops/. With several, list them so the right one can be picked.
 */
function shopFile(): string {
  const given = args.slice(1).find((a) => !a.startsWith("--"));
  if (given) return given;
  const files = existsSync("shops") ? readdirSync("shops").filter((f) => f.endsWith(".env")) : [];
  if (files.length === 1) {
    console.log(`Using shops/${files[0]}`);
    return join("shops", files[0]);
  }
  if (!files.length) fail("No shop files yet. Make one first: npx tsx scripts/new-shop.ts create --name=… --domain=… --preset=…");
  fail(`Which shop? Add one of these to the command:\n${files.map((f) => `  shops/${f}`).join("\n")}\n\ne.g. npx tsx scripts/new-shop.ts ${command} shops/${files[0]}`);
}

if (command === "create") create();
else if (command === "check") check(shopFile());
else if (command === "preset") preset(shopFile());
else {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
  process.exit(command ? 1 : 0);
}
