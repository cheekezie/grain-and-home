// One-off import (26 Sep 2026): suppliers the owner buys from, plus 14
// Artisan Furniture products as DRAFTS. Facts (dimensions, weight, finish,
// assembly) are from each product's page on artisanfurniture.net; the
// wording is ours. No price or supplier cost is set: Artisan's trade
// prices are only visible in a trade account. Idempotent: existing slugs
// and supplier names are left untouched.
//
//   npx tsx scripts/import-artisan-2026-09-26.ts
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import SupplierModel from "../src/models/Supplier";
import ProductModel from "../src/models/Product";

const SUPPLIERS = [
  {
    name: "Artisan Furniture",
    website: "https://www.artisanfurniture.net",
    orderUrl: "https://www.artisanfurniture.net/my-account/",
    notes: [
      "UK trade dropshipper (London; warehouse in Ipswich). Registered business required; VAT registration not required; no minimum order.",
      "Free delivery to mainland UK, quoted as within 3 working days. White-label: no Artisan branding on packaging or labels.",
      "Damaged or faulty items: raise an RMA form in the trade dashboard, with evidence.",
      "Their terms say the 14-day change-of-mind window does NOT apply to resellers: change-of-mind returns from our customers are our cost and our problem. Decide how you'll handle them (and the return cost you state) before publishing.",
      "Source: artisanfurniture.net 'How our dropshipping program works', read 26 Sep 2026.",
    ].join("\n"),
  },
  {
    name: "Wayfair UK",
    website: "https://www.wayfair.co.uk",
    orderUrl: "https://www.wayfair.co.uk",
    notes: [
      "Retail: order on the customer's behalf, delivered to their address.",
      "Delivery charges and times vary by item and seller: check on each product before quoting.",
      "We are Wayfair's customer, so returns go through our Wayfair account; our customer's rights are against us.",
    ].join("\n"),
  },
  {
    name: "Amazon UK",
    website: "https://www.amazon.co.uk",
    orderUrl: "https://www.amazon.co.uk",
    notes: [
      "Retail: order on the customer's behalf, delivered to their address.",
      "Check who sells and ships each item (Amazon or a third-party seller): delivery, packaging and returns differ.",
      "Amazon Global Store ('International Products') items are sold for personal use only; avoid those.",
    ].join("\n"),
  },
];

async function main() {
  await connectDB();
  for (const s of SUPPLIERS) {
    const r = await SupplierModel.updateOne({ name: s.name }, { $setOnInsert: s }, { upsert: true });
    console.log(r.upsertedCount ? "added supplier" : "kept supplier", s.name);
  }
  const artisan = await SupplierModel.findOne({ name: "Artisan Furniture" }).lean();
  const rows = JSON.parse(readFileSync("scripts/data/artisan-2026-09-26.json", "utf8"));
  const checked = new Date("2026-09-26T12:00:00Z");
  for (const p of rows) {
    const r = await ProductModel.updateOne(
      { slug: p.slug },
      { $setOnInsert: { ...p, supplier: artisan!._id, status: "draft", availability: "in_stock", availabilityCheckedAt: checked } },
      { upsert: true },
    );
    console.log(r.upsertedCount ? "added" : "kept", p.slug);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
