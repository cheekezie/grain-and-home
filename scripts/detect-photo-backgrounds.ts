// Mark each product photo as a cut-out (plain white/transparent background)
// or a photo with its own background, for products saved before this was
// automatic. Saving a product in the admin does the same for its photos.
//
//   npx tsx --conditions=react-server scripts/detect-photo-backgrounds.ts
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import mongoose from "mongoose";
import { detectCutout } from "../src/lib/imageCutout";

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const products = mongoose.connection.db!.collection("products");
  const docs = await products.find({}, { projection: { name: 1, images: 1 } }).toArray();
  const tally = { cutout: 0, photo: 0, unknown: 0 };
  for (const d of docs) {
    const images = (d.images ?? []) as { url: string; alt?: string; cutout?: boolean }[];
    let changed = false;
    for (const img of images) {
      if (typeof img.cutout === "boolean") continue;
      const flag = await detectCutout(img.url);
      if (flag === undefined) tally.unknown++;
      else {
        img.cutout = flag;
        changed = true;
        tally[flag ? "cutout" : "photo"]++;
      }
    }
    if (changed) await products.updateOne({ _id: d._id }, { $set: { images } });
    const first = images[0];
    console.log(`${first?.cutout === true ? "cut-out" : first?.cutout === false ? "photo  " : "unknown"}  ${d.name}`);
  }
  console.log(tally);
  await mongoose.disconnect();
})();
