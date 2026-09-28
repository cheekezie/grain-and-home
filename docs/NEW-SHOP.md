# Launching another shop

Every shop runs this same code as its **own Vercel project**, with its own
database, Stripe account, email sender and domain. A push to `main` updates
every shop. Nothing about one shop is in the code: who it is lives in its
environment variables, and what it sells and says lives in its database
(Admin → Shop settings).

Time: about an hour, most of it waiting for domain and email verification.

## 1. Make the shop's settings file

```sh
npx tsx scripts/new-shop.ts create --name="Hem & Ink" --domain=hemandink.co.uk --preset=clothing
```

This writes `shops/hem-and-ink.env` (git-ignored, private). It already has:
the name, site address, support email, a fresh 6-digit admin access code and
every secret. Presets: `furniture`, `clothing`, `beauty`, `blank`.

Keep the file somewhere safe: it holds the admin code and secrets.

## 2. Accounts to set up (fill in each `TODO` in the file as you go)

- [ ] **Domain.** Register it (e.g. hemandink.co.uk). Leave DNS for step 4.
- [ ] **Legal name.** `NEXT_PUBLIC_BUSINESS_LEGAL_NAME`, plus company/VAT number and
      address if the business has them (shown in the footer and terms).
- [ ] **Database.** MongoDB Atlas → the existing cluster is fine → Connect → Drivers.
      Use a database name for this shop, e.g. `…mongodb.net/hem-and-ink`.
      Network access must allow Vercel (0.0.0.0/0 or Atlas's Vercel integration):
      the site reads its settings while building.
      → `MONGODB_URI`
- [ ] **Stripe.** The business's **own** Stripe account (it's the seller: payouts,
      disputes and tax are its own).
      - Developers → API keys → secret key → `STRIPE_SECRET_KEY`
      - Settings → Payment methods: switch on Klarna, Apple Pay etc. as wanted
      - Developers → Webhooks → Add endpoint `https://<domain>/api/webhooks/stripe`,
        events `checkout.session.completed` and `checkout.session.async_payment_succeeded`
        → signing secret → `STRIPE_WEBHOOK_SECRET`.
        **Without it, paid orders never reach the admin.**
      - Settings → Customer emails → Successful payments: on (Stripe's receipt)
- [ ] **Customer emails.** ZeptoMail → add a mail agent for the shop → verify the
      domain (DNS records) → Send Mail token → `ZOHO_ZEPTOMAIL_TOKEN`.
      `ZOHO_ZEPTOMAIL_FROM` is already `orders@<domain>`.
- [ ] **Support mailbox.** Create the support email (e.g. hello@<domain>) in Zoho Mail.

## 3. Check and fill the database

```sh
npx tsx scripts/new-shop.ts check shops/hem-and-ink.env
npx tsx scripts/new-shop.ts preset shops/hem-and-ink.env
npx tsx scripts/new-shop.ts check shops/hem-and-ink.env
```

`create` prints these exact commands with the file name filled in. With
only one file in `shops/`, you can leave the file name off (`check`,
`preset`); with several, the script lists them.

`check` connects to the database and Stripe (read-only) and reports what's
missing: ✗ must be fixed, ! is worth a look (e.g. no products yet, domain not
live before the first deploy). `preset` fills the new database with the
preset's categories, wording, hero, product details and filters; it never
overwrites a shop that's already set up.

## 4. Deploy

- [ ] Vercel → Add New → Project → import the **same** GitHub repository.
- [ ] Settings → Environment Variables → **Import .env** → paste the file.
- [ ] Deploy. Then Settings → Domains → add the domain and set the DNS records Vercel shows.
- [ ] Run `check` again: "Domain is live" should now pass.

The shop's `*.vercel.app` address tells search engines not to index it; only
the real domain is indexed.

## 5. In the new shop's admin (https://<domain>/admin, the code from the file)

- [ ] **Shop settings → General**: tagline, hero (photo + layout), promises, wording,
      delivery area, Look (colours, fonts, card style).
- [ ] **Shop settings → Navigation / Product details** if the preset needs changes.
- [ ] **Categories**: photos, intros, Google descriptions, buying guides.
- [ ] **Suppliers**: each supplier, its return instructions and email domains.
- [ ] **Supplier emails → Settings**: the ordering inbox (and the Zoho webhook).
- [ ] **Products**: add them. Photos are checked automatically for plain
      backgrounds; tag colour photos with their Variant.
- [ ] Send yourself a test customer email (Supplier emails → Settings) and
      place one real low-value order, then refund it.

## 6. Search engines

- [ ] Google Search Console: add the domain, submit `https://<domain>/sitemap.xml`.
- [ ] Google Merchant Center: scheduled fetch of `https://<domain>/feed/google.xml`,
      plus the returns policy and shipping settings.
- [ ] Have the Terms, Returns, Delivery and Privacy pages reviewed for this business.
