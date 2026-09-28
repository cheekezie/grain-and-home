@AGENTS.md

# Store: project notes (one codebase, many shops)

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
- Delivery area is a shop setting (mainland UK or whole UK):
  `src/lib/delivery.ts` `checkDeliveryPostcode(pc, area)` (basket + checkout
  enforce; admin flags mismatched addresses).
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
- Home hero: layout chosen per shop (photo / split / text,
  `components/store/HomeHero.tsx`, picked on the server so only one is
  sent; every layout renders the headline as the one h1 and loads its photo
  first). Grain & Home uses the full-bleed photo (owner's choice
  2026-09-26). Its room photos are Unsplash (free licence), stored on the
  Category records; they're mood shots, not our products.
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
- Insights (`/admin/insights`, 2026-09-27): revenue = what customers paid on orders not cancelled/refunded; profit = revenue - supplier cost snapshot on the order - real Stripe fee (`Order.stripeFee`, from the charge's balance transaction, backfilled on page load) - fees kept on refunds. Product margins come from product price/cost. CSV at /admin/insights/export. Note: pricing rule 'cost + 33 0s a 33% markup = 25% margin.
- SEO (2026-09-27): `lib/seo.ts` (JSON-LD, share metadata), `/feed/google.xml` (Merchant Center), `Category` model + Admin → Categories (was Room pages), `ShopImage` (next/image for hosts in `lib/imageHosts.ts`, plain <img> otherwise). Never add ratings/reviews to structured data unless they're real.
- Delivery emails (2026-09-27): Supplier.whiteLabel/orderEmail/senderDomains/autoCustomerUpdates. `lib/mail/*`: parse.ts (pure: status, tracking, order-ref matching), templates.ts, send.ts (Zoho SMTP via nodemailer), inbox.ts (IMAP via imapflow, UID state in MailSync), orderUpdates.ts. SupplierEmail model + Admin → Supplier emails. Supplier-hosted tracking links are never sent to customers. Tested end to end against a local SMTP catcher; not yet against real Zoho.
- Order confirmation email (2026-09-27): sent from Zoho right after the webhook creates the order (`confirmNewOrder`, never fails the webhook), resendable from the order page. Lines show pre-discount prices (`items.listUnitPrice` from Stripe amount_subtotal) with the discount once. Supplier 'order confirmed' emails stay internal; 'Being prepared' is manual only.
- Email sending uses the ZeptoMail API (`lib/mail/send.ts`, header `Zoho-enczapikey`, env ZOHO_ZEPTOMAIL_*), matching Attesta Tickets/Eduspace; the owner found Zoho Mail SMTP gets blocked. Inbox reading stays Zoho Mail IMAP (MAIL_*). nodemailer removed.
- Zoho Mail outgoing webhook (2026-09-27): POST /api/webhooks/zoho-mail?key=ZOHO_MAIL_WEBHOOK_KEY; stores Zoho's x-hook-secret from the first call (WebhookSecret model, id zoho-mail) and verifies x-hook-signature = base64(HMAC-SHA256(raw body)) after. Webhook and IMAP share `recordSupplierEmail(IncomingEmail)`; duplicates across routes caught by `dedupeKey` (sender+subject+minute). To reconnect Zoho from scratch: delete the webhooksecrets doc.
- Ordering inbox lives in the database (2026-09-27, owner's choice): `MailboxSettings` (id ordering-inbox), edited in Admin → Supplier emails; app password AES-256-GCM encrypted via `lib/secretBox.ts` with env SETTINGS_ENCRYPTION_KEY. `lib/mail/inboxSettings.ts` has getInboxConfig/orderingInbox/testImapLogin. MAIL_* env vars are no longer read.
- Supplier emails page: settings (ordering inbox, webhook, backup) live in a modal (components/admin/Modal.tsx); the list is paginated 25 per page (components/admin/Pagination.tsx, reusable).

## Shop settings: one codebase, many shops (branch shop-settings, 2026-09-28)

The owner will run several shops from this code (Grain & Home furniture, a
Tapstitch print-on-demand clothing shop, maybe beauty), each as its own
Vercel project + database + Stripe account from the same repo. So nothing
shop-specific is in code any more:
- `ShopSettings` (one doc, _id "shop", `src/lib/shop/types.ts`): tagline,
  home title, hero, trust points, wording (item/items/goods/browse/category
  labels…), delivery area + "large items" (two-person delivery, collected
  returns), nav (auto = categories, or custom with dropdowns), product
  detail fields, Google category. Read with `getShopSettings()`
  (`src/lib/shop/server.ts`, merged over the blank preset so new settings
  always have a value). Client components get `ShopClientWords` from
  `ShopWordsProvider` (store layout).
- `Category` model replaces the hard-coded CATEGORIES list and RoomContent.
  Products/promos refer to categories by slug; renaming a slug moves them.
- Product details are shop-defined (`details` Mixed on Product, keyed by
  field key; `src/lib/shop/details.ts` formats, validates, maps to Google
  attrs). The old widthCm/…/assembly fields were copied into details by
  `scripts/shop-setup.ts` and left in the documents (unused).
- Presets (`src/lib/shop/presets.ts`): furniture = Grain & Home's exact
  wording and photos; clothing, beauty, blank have no photos (text hero).
  New shop: Admin → Shop settings shows a preset picker, or run
  `npx tsx scripts/shop-setup.ts --preset=<key>` (idempotent, never
  overwrites).
- Verified before merging: every storefront page, product JSON-LD, the
  feed and robots rendered identical to main (old code on a worktree
  against the same DB). Only intended differences: /shop index added to the
  sitemap, category share images now the category's own photo.
- `siteConfig` reads NEXT_PUBLIC_* by literal name (process.env[k] is empty
  in browser code; the fallback name had been masking it).
- Non-canonical hosts (*.vercel.app, previews) get X-Robots-Tag: noindex
  via next.config headers, keyed on NEXT_PUBLIC_SITE_URL.
- EditorForm submits via onSubmit + startTransition, not `action`: React's
  post-action form reset made controlled selects show their first option.
- Nav links and hero buttons are picked in two steps (kind: category /
  page / product / website, then which one); internal links are checked on
  save (`brokenLinks` in actions.ts; fixed pages in `lib/shop/pages.ts`).

## Product options (phase 2, 2026-09-28)
- `Product.options` [{name, values, google?}] (max 3) and `Product.variants`
  (one per combination, max 100): id from the values (`variantId`, e.g.
  "m--black"; stable while values don't change), own availability, and
  optional price / supplierCost / supplierSku (empty = product's). Helpers in
  `lib/variants.ts` (client-safe). The editor regenerates variants from the
  options, keeping what was set (`syncVariants`, also in the zod transform).
- Server side, every basket line resolves through `lib/productLines.ts`
  `resolveLine(product, variantId)`: checkout, promo preview and order
  creation. A product marked unavailable overall stops all its variants.
- Basket lines are keyed `productId:variantId` (`lineKey` in CartContext).
  Stripe line metadata carries productId + variantId; Stripe line name is
  "Name (M / Black)"; order items store name (with the choice), variant,
  variantId and the variant's supplier code/cost. Admin order shows
  "Order this option". Buy now: `/checkout?buy=slug&qty=n&v=variantId`.
- Product cards: "From £x" and no quick-add for products with options.
  Feed: one item per variant with item_group_id, size/colour from the
  options' google mapping, link `?v=` (product page preselects it).

## Packs (phase 3, 2026-09-28)
- A pack is a Product with `packSlots` (product ids, one per piece, repeats
  allowed, 2–12). No options of its own; the customer picks each piece's
  options on the pack page (`components/PackForm.tsx`). Pieces may be drafts
  (sold only in packs); a pack can't contain a pack.
- Pack supplierCost = its pieces' supplierCost added up, set on save and
  refreshed when a piece is saved (`refreshPackCosts`). A product inside a
  pack can't be deleted. Publishing a pack needs no supplier of its own.
- Basket line: `choices` (variant id per piece, "" for no options) +
  `pieces` labels; lineKey includes the choices. Stripe metadata
  `packChoices` = choices joined by "|". Server: `resolvePack` in
  `lib/productLines.ts` (price = pack's; buyable only if every piece is).
- Orders: `stripeLinesToItems` (pure, in `lib/orders.ts`) splits a pack line
  into one order item per piece (own supplier, code, cost, variant; name
  "Pack: Piece, M / Black"; shared `packGroup`, `packName`). What was paid
  is shared across pieces by their own prices, whole pence, remainder on
  the first, so the pieces add up to Stripe's amount. The confirmation
  email groups a pack back into one line.
- Pack presets (2026-09-28): `packPresets` (per piece, same order as
  packSlots) fixes options for the customer, e.g. { Colour: "Black" }; they
  choose the rest. Shown as text on the pack page; `matchesPreset` in
  `resolvePack` refuses choices that break them; saving drops values the
  piece doesn't have and needs at least one matching combination.
- Product card styles (Shop settings → Look → Product cards, `theme.cards`):
  panel (default: whole product on the panel colour), fill (photo covers
  the card; for model shots), masonry (repeating card heights so columns stagger, photos cropped to fit; `ProductGrid` /
  `gridClasses.ts` switch the layout to CSS columns). ProductCard is an async
  server component that reads the style itself. Every style puts the photo
  on the panel colour with mix-blend-multiply, so white or transparent
  backgrounds take the panel colour.
- Photo backgrounds are detected, not ticked: on product save each photo is
  fetched once and its edge checked (`lib/imageCutout.ts`, sharp):
  white/transparent edge = `images[].cutout: true`. Panel cards show
  cut-outs whole on the panel and let photos with their own background
  (cutout false) fill the card; unknown (fetch failed) stays whole. Older
  products: `npx tsx --conditions=react-server scripts/detect-photo-backgrounds.ts`.
- Colour photos: `images[].forValue` tags a photo with an option value
  (admin: "Variant" on each photo). `imageFor` (lib/variantImages.ts) picks
  it for the gallery (AddToCartForm sends a `product-choice` window event,
  ProductGallery listens), basket/buy-now lines, pack rows, order lines and
  the feed's variant listings. Galleries whose first photo has its own
  background use a 4:5 frame and fill it.
- Inner shop pages start with a back link (`components/store/BackLink.tsx`):
  product → its category, basket → shop, checkout → basket or the product.
- New shops (phase 4, 2026-09-28): `scripts/new-shop.ts` create / check /
  preset, checklist in docs/NEW-SHOP.md. Shop env files go in `shops/`
  (git-ignored). `.env.example` is now committed (template only: no keys).
  Clothing shop name chosen: **Hem & Ink** (hemandink.co.uk and .com free on
  2026-09-28; nearest existing name "Hem & Thread", US; no trademark search).
- Currency per shop (2026-09-28): `NEXT_PUBLIC_CURRENCY` (ISO code, default
  GBP; validated against Intl.supportedValuesOf). `lib/money.ts` formats,
  parses and converts minor units for it (0 decimals for JPY etc.), and
  checkout, promos, emails, feed, JSON-LD, Insights, CSV and admin fields use
  it. Only the currency: postcodes, delivery area and legal wording stay UK.
  `new-shop create --currency=…`; `check` warns if Stripe's default differs.
- Note: Grain & Home's Stripe account is the owner's "Sintax" account, and no
  live webhook exists yet for grainandhome.co.uk (needed before launch). Insights margins use each product's own price/cost (not per
  variant); best-sellers count pack pieces under their own products. The
  Google feed lists a pack as one item without size.

## Look, filters, 404 (2026-09-28)
- Hero layouts: photo, panel (photo with the words in a solid panel;
  stacked below the photo on phones), split, text.
- Theme (Shop settings → Look, `lib/shop/theme.ts`): accent / text / page /
  panel colours and a font pair (classic = Grain & Home's, soft, modern,
  clean). Applied as CSS variables on <html> (`themeStyle`); only what's set,
  shades mixed with color-mix. Contrast is enforced on save (white on accent,
  text on page and panel ≥ 4.5:1). All pairs are declared in app/layout.tsx;
  only classic is preloaded. globals.css reads --display-font / --body-font.
- Category filters: detail fields with `filterable` (select/text) and product
  options, when a category has ≥2 values; plus "In stock only". Cards are
  server-rendered and passed into `CategoryGrid` (client) which only hides
  them, so all products stay in the HTML. No facets = the original plain grid.
- Shop 404: `(store)/not-found.tsx` inside the shop layout, and
  `(store)/[...missing]` sends unknown URLs to it.
