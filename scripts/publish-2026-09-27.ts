// 27 Sep 2026: publish 1-2 products per room, and add an ergonomic office
// chair from Dynamic Office Solutions. Pricing rule agreed with the owner
// (same as the console table): supplier cost = supplier's public price
// rounded up to the next £5 (trade cost to be confirmed in the trade
// account); price = cost + 33%, rounded to the nearest £5; return cost £0.
// Stock re-checked on the suppliers' sites the same day.
//
//   npx tsx scripts/publish-2026-09-27.ts
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import SupplierModel from "../src/models/Supplier";
import ProductModel from "../src/models/Product";

const pounds = (n: number) => Math.round(n * 100);
const NOTE = "Priced 27 Sep 2026: cost = supplier's public price rounded up to £5 (confirm your trade cost); price = cost + 33%, rounded to £5.";

// slug → [cost £, price £, public price seen]
const ARTISAN: Record<string, [number, number, number]> = {
  "curved-boucle-bench": [130, 175, 126],
  "curved-chestnut-bedside-table": [125, 165, 123],
  "three-drawer-drum-chest": [170, 225, 166],
  "solis-fluted-mini-sideboard": [175, 235, 173.4],
  "curved-chestnut-writing-desk": [200, 265, 197],
  "curved-oak-coffee-table": [195, 260, 194],
  "mini-chestnut-curved-media-unit": [125, 165, 125],
  "mini-classic-chestnut-cabinet": [185, 245, 183],
  "arco-groove-cabinet": [320, 425, 316],
};

async function main() {
  await connectDB();
  const now = new Date();

  for (const [slug, [cost, price, seen]] of Object.entries(ARTISAN)) {
    const p = await ProductModel.findOne({ slug });
    if (!p) { console.log("missing", slug); continue; }
    if (p.status === "published") { console.log("already live, left alone:", slug); continue; }
    p.set({
      supplierCost: pounds(cost),
      price: pounds(price),
      returnCost: 0,
      availability: "in_stock",
      availabilityCheckedAt: now,
      status: "published",
      internalNotes: `${p.internalNotes ?? ""}\n${NOTE} Public price on 27 Sep: £${seen.toFixed(2)}.`.trim(),
    });
    await p.save();
    console.log("published", slug, `£${cost} → £${price}`);
  }

  const dynamic = await SupplierModel.findOneAndUpdate(
    { name: "Dynamic Office Solutions" },
    {
      $setOnInsert: {
        name: "Dynamic Office Solutions",
        website: "https://dynamicofficeseating.co.uk",
        orderUrl: "https://dynamicofficeseating.co.uk/pages/dropshipping",
        notes: [
          "UK office furniture supplier (Northamptonshire) with a dropship programme: trade account needed, orders via their online portal.",
          "Free standard delivery, 3–5 days in most areas; next day for a small charge.",
          "Returns: notify within 14 days of delivery. Damage: notify within 3 days of delivery.",
          "Product data and images provided for resellers to use.",
          "'OE' (Office Essentials) items are their stock ranges; the non-OE versions are made to order in bespoke fabrics.",
          "Source: dynamicofficeseating.co.uk/pages/dropshipping, read 27 Sep 2026.",
        ].join("\n"),
      },
    },
    { upsert: true, new: true },
  );

  const images: string[] = JSON.parse(readFileSync("scripts/data/orlena-images.json", "utf8"));
  const alts = ["front, three-quarter view", "front view", "side view showing the adjustable arms and headrest", "back view"];
  const chair = await ProductModel.updateOne(
    { slug: "orlena-ergonomic-office-chair" },
    {
      $setOnInsert: {
        slug: "orlena-ergonomic-office-chair",
        name: "Orlena Ergonomic Office Chair with Headrest and Arms",
        category: "home-office",
        summary: "A high-back ergonomic task chair with adjustable lumbar support, seat slide, headrest and arms, for full days at a desk.",
        description: [
          "A high-back task chair built for long working days. Almost everything adjusts, so it can be set up properly for your body and your desk:",
          "",
          "• Gas-lift seat height (46–54 cm)",
          "• Seat slide, to set the seat depth to your leg length",
          "• Seat angle and backrest tilt, adjusted independently",
          "• Ratchet backrest height and height-adjustable lumbar support",
          "• Height-adjustable, pivoting headrest",
          "• Multi-adjustable, removable arms",
          "",
          "Black fabric seat and back on a polypropylene frame, with a five-star base on castors. Suitable for up to 120 kg and rated for 8 hours' use a day.",
          "",
          "Guarantee: 3 years on mechanical parts, 2 years on fabric and foam. Self-assembly required.",
        ].join("\n"),
        images: images.map((url, n) => ({ url, alt: `Orlena ergonomic office chair, ${alts[n] ?? "view"}` })),
        price: pounds(225),
        supplierCost: pounds(170),
        widthCm: 65.5,
        depthCm: 62,
        heightCm: 132,
        weightKg: 16.5,
        materials: "Fabric seat and back, polypropylene frame",
        colour: "Black",
        assembly: "required",
        deliveryType: "courier",
        deliveryEstimate: "Usually delivered in 3–5 working days",
        returnCost: 0,
        availability: "in_stock",
        availabilityCheckedAt: now,
        supplier: dynamic!._id,
        supplierSku: "DD-ORLHBBLKAHR",
        supplierUrl: "https://dynamicofficeseating.co.uk/products/oe-orlena-high-back-ergonomic-task-operator-office-chair-with-headrest",
        internalNotes: [
          "Order the 'Black / Black / With Arms' option (SKU DD-ORLHBBLKAHR). Public price on 27 Sep 2026: £167.",
          NOTE,
          "Supplier's spec lists height 116–132 cm 'without headrest' and 101–115 cm 'with headrest', which looks swapped. Height shown as 132 cm (headrest up); confirm.",
        ].join("\n"),
        status: "published",
        featured: false,
        sortOrder: 90,
      },
    },
    { upsert: true },
  );
  console.log(chair.upsertedCount ? "added chair" : "chair already exists");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
