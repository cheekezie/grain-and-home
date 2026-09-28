// Set up a shop's settings and categories from a preset, and move products
// saved before shop settings existed (Sep 2026) onto the new product details.
// Safe to run more than once: it never overwrites settings, categories or
// details that already exist.
//
//   npx tsx scripts/shop-setup.ts --preset=furniture      (Grain & Home)
//   npx tsx scripts/shop-setup.ts --preset=clothing       (a new clothing shop)
//
// Presets: furniture, clothing, beauty, blank (src/lib/shop/presets.ts).
// A new shop can also pick its preset in Admin → Shop settings.
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { PRESETS } from "../src/lib/shop/presets";
import ShopSettingsModel from "../src/models/ShopSettings";
import CategoryModel from "../src/models/Category";
import ProductModel from "../src/models/Product";

const key = process.argv.find((a) => a.startsWith("--preset="))?.split("=")[1];
const preset = key ? PRESETS[key] : undefined;
if (!preset) {
  console.error(`Choose a preset: --preset=${Object.keys(PRESETS).join("|")}`);
  process.exit(1);
}

const ASSEMBLY: Record<string, string> = { required: "Self-assembly required", partial: "Some assembly required", none: "Arrives assembled" };

async function main() {
  await connectDB();
  const db = mongoose.connection.db!;

  // 1. Settings
  if (await ShopSettingsModel.exists({ _id: "shop" })) console.log("Settings: already set, left as they are.");
  else {
    await ShopSettingsModel.create({ _id: "shop", settings: preset!.settings });
    console.log(`Settings: set from the ${preset!.label} preset.`);
  }

  // 2. Categories, with any words written on the old Room pages.
  const rooms = new Map((await db.collection("roomcontents").find().toArray()).map((r) => [r.slug as string, r]));
  for (const c of preset!.categories) {
    const room = rooms.get(c.slug);
    const words = { intro: (room?.intro as string) || c.intro, metaDescription: (room?.metaDescription as string) || c.metaDescription, guide: (room?.guide as string) || c.guide };
    const existing = await CategoryModel.findOne({ slug: c.slug }).lean();
    if (!existing) {
      await CategoryModel.create({ ...c, ...words });
      console.log(`Category: added ${c.name}${room ? " (with its room page words)" : ""}.`);
    } else {
      // Fill only what's still empty.
      const fill = Object.fromEntries(Object.entries(words).filter(([k, v]) => v && !(existing as Record<string, unknown>)[k]));
      if (Object.keys(fill).length) {
        await CategoryModel.updateOne({ _id: existing._id }, { $set: fill });
        console.log(`Category: ${c.name} filled in ${Object.keys(fill).join(", ")}.`);
      }
    }
  }

  // 3. Products with the old fixed furniture fields: copy them into details.
  // The old fields are left in place (unused) so nothing is lost.
  const old = await db
    .collection("products")
    .find({ $or: ["widthCm", "depthCm", "heightCm", "weightKg", "materials", "colour", "assembly"].map((f) => ({ [f]: { $exists: true } })) })
    .toArray();
  let moved = 0;
  for (const p of old) {
    const details: Record<string, unknown> = { ...((p.details as Record<string, unknown>) ?? {}) };
    const dims = Object.fromEntries((["w", "d", "h"] as const).map((k, i) => [k, p[["widthCm", "depthCm", "heightCm"][i]]]).filter(([, v]) => typeof v === "number"));
    if (details.dimensions === undefined && Object.keys(dims).length) details.dimensions = dims;
    if (details.weight === undefined && typeof p.weightKg === "number") details.weight = p.weightKg;
    if (details.materials === undefined && p.materials) details.materials = p.materials;
    if (details.colour === undefined && p.colour) details.colour = p.colour;
    if (details.assembly === undefined && ASSEMBLY[p.assembly as string]) details.assembly = ASSEMBLY[p.assembly as string];
    if (JSON.stringify(details) !== JSON.stringify(p.details ?? {})) {
      await ProductModel.updateOne({ _id: p._id }, { $set: { details } });
      moved++;
    }
  }
  console.log(`Products: ${moved} moved onto product details (${old.length - moved} already done).`);

  // 4. Anything pointing at a category that doesn't exist.
  const slugs = (await CategoryModel.find().select("slug").lean()).map((c) => c.slug as string);
  const orphans = await ProductModel.find({ category: { $nin: slugs } }).select("name category").lean();
  for (const o of orphans) console.log(`Warning: “${o.name}” is in “${o.category}”, which isn't a category. Add it or move the product.`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
