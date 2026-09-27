@AGENTS.md

# Furniture store: project notes

Rebuilt 2026-09-26 from the original Prisma/SQLite skeleton (backup of the
earlier state: ../dropship-store-backup-2026-09-26.tgz). See README.md.

- MongoDB via Mongoose (owner's preference, same as Tarmac). Models in
  `src/models/*` registered through `define.ts`. Client components must not
  import from `src/models/*`; shared lists live in `src/lib/catalogue.ts`.
- Storefront reads go through `src/lib/store.ts` → `toStoreProduct`, which
  strips supplier fields. Never pass admin/product docs to store pages.
- Prices in pence. Checkout re-reads prices/availability server-side; line
  items carry `productId` in Stripe product metadata; the webhook reads paid
  lines back via `listLineItems` (no basket in session metadata: 500-char cap).
- Orders are created only by the webhook (`src/lib/orders.ts`, idempotent).
- Mainland-UK-only: `src/lib/delivery.ts` (basket + checkout enforce; admin
  flags mismatched Stripe addresses).
- Honesty rules: no invented products, reviews, discounts or "was" prices;
  payment-method labels come from Stripe's live config, not a hard-coded list;
  no imitation brand logos.
- Admin auth: 6-digit `ADMIN_ACCESS_CODE` (owner's choice, 2026-09-27) + HMAC cookie (`store_admin`, 7 days). Brute-force limits in MongoDB `auththrottles`: 5 wrong per connection → 15 min lock; 30 wrong site-wide per hour → sign-in paused 1 hour. To unlock early: `db.auththrottles.deleteMany({})`.
- Suppliers can be trade dropshippers or retailers ordered from on the
  customer's behalf (owner's decision, 2026-09-26: Artisan, Wayfair, Amazon,
  or anywhere). Products are drafts until price + supplier cost are known.
- Returns: `ReturnRequest` model, public form `/returns/request` (order
  number + checkout email, re-checked server-side), admin `/admin/returns`
  with per-supplier `returnInstructions` and a drafted reply. No email is
  sent by the site; the owner sends replies from support@.
- Counter numbers = 1000 + seq (upsert $inc ignores schema defaults).
- Payment-method labels: failures are never cached (throw inside
  unstable_cache, catch outside).
- No postal address shown by owner's choice; only shown if env sets one.
- Home hero = full-bleed room photo + trust strip, then shop-by-room photo
  tiles (`components/store/HomeHero.tsx`, the owner's choice 2026-09-26
  over a split layout and a room mosaic). Room
  photos: Unsplash free licence, listed in `src/lib/roomPhotos.ts`; they're
  mood shots, not our products, so copy never claims otherwise.
- Payment logos: official marks only, unaltered, in `public/payment-logos`
  (sources in SOURCES.md). Never draw or approximate a brand mark. Link has
  no published official logo, so it isn't shown.
- Name: **Grain & Home** (chosen 2026-09-27; domain grainandhome.co.uk/.com
  free at the time, not yet registered). Set via NEXT_PUBLIC_STORE_NAME.
- Checkout: our own `/checkout` page collects email, phone and the full
  address (postcode checked for mainland UK + postcodes.io; address list
  only if IDEAL_POSTCODES_API_KEY is set). Stripe gets it via
  customer_email + payment_intent_data.shipping + session metadata and does
  NOT collect shipping itself; orders are built from the metadata.
  "Buy now" = `/checkout?buy=<slug>&qty=n`, basket untouched
  (success URL carries buy_now=1 so the basket isn't cleared).
- Stripe key in .env is LIVE: never complete a test payment; if a session
  is created while testing, expire it (checkout.sessions.expire).
- Promotions (2026-09-27): `PromoCode` model, admin `/admin/promos`.
  Discount maths in `lib/promoPricing.ts` (pure), rules/lookups in
  `lib/promos.ts`. Checkout recalculates and gives Stripe a single-use
  coupon for the exact amount; `usedCount` goes up in the webhook. One
  promo can be "announce" (offer bar + one-time claim pop-up) and one
  "welcome" (shown to new email subscribers). Claimed codes are kept in
  localStorage and prefilled at checkout.
- Retention: email sign-ups (`Subscriber`, CSV export with unsubscribe
  links, `/unsubscribe` is POST-only), back-in-stock requests
  (`StockAlert`, admin "Back in stock"), saved items + recently viewed
  (browser-only lists in `lib/shopperLists.ts`, prices re-read via
  `/api/products`). No emails are sent by the site.
- Cookie consent: `lib/consent.ts` (cookie `gh_consent`). No analytics or
  marketing tags exist yet; any added must wait for consent === "all".
- Address entry (2026-09-27): owner can't pay for address lookup yet.
  Address boxes are always visible for browser autofill; postcode is
  checked on blur (postcodes.io) and fills the town only if empty. The
  Ideal Postcodes pick-list stays dormant unless its key is set.
- Admin feedback: creating a record returns to its list with a toast (flash param read by AdminFlash); saving shows a "Saved" toast; deleting returns to the list with a toast. Inner pages use BackLink ("← Back to …").
