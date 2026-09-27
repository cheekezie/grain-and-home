# Grain & Home

A UK furniture shop run by manual dropshipping: customers pay on the site
(Stripe Checkout), you place the order with the supplier on their behalf,
and the admin tracks each order through to delivery. Suppliers are UK trade
dropshippers; they're never named on the shop.

Stack: Next.js 16, MongoDB (Mongoose), Stripe Checkout, Tailwind.

## Run it locally

1. `npm install`
2. Start MongoDB locally (`mongod`), or point `MONGODB_URI` at Atlas.
3. Copy `.env.example` to `.env.local` and fill it in (see Stripe below).
4. `npm run dev`, then open `/admin/login` and sign in with the 6-digit `ADMIN_ACCESS_CODE`.

## Stripe setup (including Klarna)

1. **Keys:** Stripe Dashboard → Developers → API keys. Put the secret key in
   `STRIPE_SECRET_KEY` and the publishable key in
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (in `.env.local`). Use **test** keys
   until launch.
2. **Payment methods:** Dashboard → Settings → Payment methods. Turn on
   **Klarna** (and Apple Pay, Google Pay, etc. as you like). Checkout offers
   whatever is switched on here: no code change needed. Klarna only appears
   when the order is eligible (GBP, UK customer, within Klarna's amount
   limits), which Stripe decides automatically.
3. **Webhook** (turns paid checkouts into orders):
   - Production: Dashboard → Developers → Webhooks → Add endpoint
     `https://YOUR-DOMAIN/api/webhooks/stripe`, events
     `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
     Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
   - Locally: install the Stripe CLI and run
     `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, then use
     the `whsec_…` it prints.
4. **Check it:** `npm run stripe:check` shows the mode (test/live), which
   payment methods checkout will offer (✓/✗, including Klarna), and whether a
   webhook endpoint exists.
5. **Receipts:** turn on Dashboard → Settings → Customer emails → Successful
   payments, so customers get a receipt (the site doesn't send email itself).

The "We accept" labels on product pages, the basket and the footer come from
Stripe's live settings (hourly), so they only ever list methods checkout
will really offer.

## Daily workflow (admin)

- **Overview:** what needs doing: new paid orders to place, orders not
  dispatched after 3 days, deliveries outside mainland UK, stale stock checks,
  live products that are out of stock.
- **Orders:** open a paid order → "Open supplier page" for each line → place
  the order on the supplier's site using "Copy address" → save the supplier's
  order reference → "Mark as ordered from supplier". Add tracking links when
  you get them → "Mark as dispatched" → "Mark as delivered". Refunds are made
  in Stripe (link on the order), then "Mark as refunded".
- **Stock check:** work through each supplier's list and click each product's
  current status. One click records it and today's date. Out-of-stock
  products stay listed but can't be bought.
- **Products:** each product has its own supplier: a trade dropshipper
  (Artisan Furniture) or a retailer you order from on the customer's behalf
  (Wayfair UK, Amazon UK). Price and supplier cost in pounds (margin shown
  live). A product can be saved as a draft without a price; it can't be
  published without a price, supplier cost, photo, supplier and return cost
  (UK law requires the return cost for goods that can't be posted).
- **Returns:** customers use the form at `/returns/request` (order number +
  checkout email). Requests appear under Returns with a badge. Each request
  shows the supplier's return instructions (set on the supplier's page) and
  a drafted reply to copy or open in your email. Refund in Stripe, then
  mark the order refunded.

## Before launch

- Business details in env: `NEXT_PUBLIC_BUSINESS_LEGAL_NAME` and
  `NEXT_PUBLIC_SUPPORT_EMAIL` (currently Grain & Home / support@grainandhome.co.uk);
  company/VAT numbers and `NEXT_PUBLIC_BUSINESS_ADDRESS` are optional and
  shown only when set.
- Register grainandhome.co.uk (and .com) and set up the support@grainandhome.co.uk mailbox: return replies are sent from it.
- Add return instructions to each supplier (Admin → Suppliers).
- Have the Terms, Returns, Delivery and Privacy pages reviewed.
- Check the mainland-UK postcode exclusions in `src/lib/delivery.ts` match
  your suppliers' delivery areas.
- Use supplier photos only where the supplier allows resellers to.
- Switch Stripe to live keys and a live webhook; run `npm run stripe:check`.
- Choose the name: set `NEXT_PUBLIC_STORE_NAME` (everything reads from
  `src/lib/siteConfig.ts`).

## Products imported 26 Sep 2026

`scripts/import-artisan-2026-09-26.ts` added the suppliers (Artisan
Furniture, Wayfair UK, Amazon UK) and 14 Artisan products as drafts. Specs
are from artisanfurniture.net; descriptions are our own wording. Each
draft's internal notes list what to confirm before publishing (trade price,
image use, a few listing inconsistencies).

## Checkout

Basket → `/checkout` (or straight there with **Buy now** on a product,
which leaves the basket untouched) → Stripe payment.

The checkout page collects email, phone and the full delivery address.
Street addresses come from the customer's browser autofill (all address
boxes are always shown with standard autocomplete tokens, so Chrome,
Safari and Edge fill them in one tap) or are typed. The postcode is
checked for mainland UK and on postcodes.io (free), which also fills in
the town. Stripe receives the address and doesn't ask for it again.

Optional, paid (not used while there's no revenue): set
`IDEAL_POSTCODES_API_KEY` to add the "pick your address from a list"
step (Royal Mail data, about 4.5p per lookup, 50 free on sign-up). The
code for it is already in place. No free UK street-address source was
found (OS Places is excluded from Ordnance Survey's free allowance;
getAddress.io now covers Australia).
