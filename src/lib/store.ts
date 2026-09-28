import "server-only";
import { cache } from "react";
import { connectDB } from "./db";
import ProductModel from "@/models/Product";
import { toStoreProduct } from "./serialize";

// Storefront reads: published products only, supplier fields stripped.
const PUBLISHED = { status: "published" } as const;
// Out-of-stock products stay visible (marked unavailable); discontinued ones are hidden.
const LISTED = { ...PUBLISHED, availability: { $ne: "discontinued" } };

export const getFeatured = cache(async () => {
  await connectDB();
  const docs = await ProductModel.find({ ...LISTED, featured: true }).sort({ sortOrder: 1, updatedAt: -1 }).limit(8).lean();
  return docs.map(toStoreProduct);
});

export const getCategoryProducts = cache(async (category: string) => {
  await connectDB();
  const docs = await ProductModel.find({ ...LISTED, category }).sort({ sortOrder: 1, name: 1 }).lean();
  return docs.map(toStoreProduct);
});

export const getCategoryCounts = cache(async () => {
  await connectDB();
  const rows = await ProductModel.aggregate<{ _id: string; n: number }>([{ $match: LISTED }, { $group: { _id: "$category", n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n])) as Record<string, number>;
});

export const getProduct = cache(async (slug: string) => {
  await connectDB();
  const doc = await ProductModel.findOne({ ...PUBLISHED, slug }).lean();
  return doc ? toStoreProduct(doc) : null;
});

export const getAllListedSlugs = cache(async () => {
  await connectDB();
  const docs = await ProductModel.find(LISTED).select("slug category updatedAt images").lean();
  return docs.map((d) => ({
    slug: d.slug as string,
    category: d.category as string,
    updatedAt: (d.updatedAt as Date | undefined)?.toISOString(),
    images: ((d.images ?? []) as { url: string }[]).map((i) => i.url).slice(0, 5),
  }));
});

/** "You might also like": other products from the same category, then elsewhere. */
export const getRelated = cache(async (productId: string, category: string, limit = 4) => {
  await connectDB();
  const same = await ProductModel.find({ ...LISTED, category, _id: { $ne: productId }, availability: { $nin: ["out_of_stock", "discontinued"] } })
    .sort({ featured: -1, sortOrder: 1 })
    .limit(limit)
    .lean();
  const more = same.length < limit
    ? await ProductModel.find({ ...LISTED, category: { $ne: category }, _id: { $ne: productId }, availability: { $nin: ["out_of_stock", "discontinued"] } })
        .sort({ featured: -1, updatedAt: -1 })
        .limit(limit - same.length)
        .lean()
    : [];
  return [...same, ...more].map(toStoreProduct);
});

/** A pack's pieces, in order, with their options: what the pack page offers to choose. Supplier fields stripped. */
export const getPackPieces = cache(async (slots: string[]) => {
  if (!slots.length) return [];
  await connectDB();
  const docs = await ProductModel.find({ _id: { $in: [...new Set(slots)] } }).lean();
  const byId = new Map(docs.map((d) => [String(d._id), toStoreProduct(d)]));
  return slots.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
});

/**
 * Live packs that contain this product, for "Save with a pack" on its page.
 * `saving` is the least the customer saves against buying the pieces
 * separately: each piece at its cheapest in-stock choice within the pack's
 * fixed options, so the figure is always true.
 */
export const getPacksContaining = cache(async (productId: string) => {
  await connectDB();
  const packs = await ProductModel.find({ ...LISTED, packSlots: productId }).sort({ featured: -1, sortOrder: 1 }).limit(4).lean();
  if (!packs.length) return [];
  const ids = [...new Set(packs.flatMap((p) => ((p.packSlots ?? []) as unknown[]).map(String)))];
  const pieces = new Map((await ProductModel.find({ _id: { $in: ids } }).lean()).map((d) => [String(d._id), toStoreProduct(d)]));
  const buyable = (a: string) => a === "in_stock" || a === "low_stock";
  return packs.map((doc) => {
    const pack = toStoreProduct(doc);
    let separate = 0;
    let known = true;
    const counts = new Map<string, number>();
    pack.packSlots.forEach((slot, i) => {
      const piece = pieces.get(slot);
      if (!piece) return void (known = false);
      counts.set(piece.name, (counts.get(piece.name) ?? 0) + 1);
      const preset = pack.packPresets[i] ?? {};
      const prices = piece.variants.length
        ? piece.variants.filter((v) => buyable(v.availability) && piece.options.every((o, k) => !preset[o.name] || v.values[k] === preset[o.name])).map((v) => v.price)
        : [piece.price];
      if (!prices.length || prices.some((x) => typeof x !== "number")) known = false;
      else separate += Math.min(...prices);
    });
    return {
      product: pack,
      contents: [...counts].map(([name, n]) => (n > 1 ? `${n} × ${name}` : name)),
      saving: known && separate > pack.price ? separate - pack.price : 0,
    };
  });
});
