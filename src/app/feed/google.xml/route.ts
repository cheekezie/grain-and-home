import { connectDB } from "@/lib/db";
import { toStoreProduct } from "@/lib/serialize";
import { getCategoryNames, getShopSettings } from "@/lib/shop/server";
import { googleDetails } from "@/lib/shop/details";
import { variantLabel } from "@/lib/variants";
import { imageFor } from "@/lib/variantImages";
import { siteConfig } from "@/lib/siteConfig";
import { absoluteUrl } from "@/lib/seo";
import ProductModel from "@/models/Product";

// Google Merchant Center product feed (free listings on Google Shopping).
// Add it in Merchant Center as a scheduled fetch of
// https://<your domain>/feed/google.xml. Live products only; out-of-stock
// ones stay in the feed marked out_of_stock, discontinued ones drop out.
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tag = (name: string, value: string | number | undefined | null) => (value === undefined || value === null || value === "" ? "" : `<g:${name}>${esc(String(value))}</g:${name}>`);
const gbp = (pence: number) => `${(pence / 100).toFixed(2)} GBP`;

const AVAILABILITY: Record<string, string> = { in_stock: "in_stock", low_stock: "in_stock", out_of_stock: "out_of_stock" };

export async function GET() {
  await connectDB();
  const [shop, categoryName] = await Promise.all([getShopSettings(), getCategoryNames()]);
  const docs = await ProductModel.find({ status: "published", availability: { $ne: "discontinued" }, price: { $gt: 0 } }).sort({ category: 1, sortOrder: 1 }).lean();
  // A product with options is one listing per combination, grouped by
  // item_group_id, each with its own price, stock and size/colour.
  const items = docs.map(toStoreProduct).filter((p) => p.images.length > 0).flatMap((p) => (p.variants.length ? p.variants : [null]).map((v) => {
    // A variant's listing leads with its own colour's photo.
    const lead = v ? imageFor(p.images, v.values) ?? p.images[0] : p.images[0];
    const [main, ...more] = [lead, ...p.images.filter((i) => i !== lead)];
    const g = googleDetails(shop.details, p.details);
    // The variant's choices fill the Google attributes their option is linked to.
    if (v) p.options.forEach((o, i) => { if (o.google === "size") g.size = v.values[i]; else if (o.google === "color") g.color = v.values[i]; else if (o.google === "material") g.material = v.values[i]; else if (o.google === "pattern") g.pattern = v.values[i]; });
    const type = [shop.google.productTypeRoot, categoryName(p.category)].filter(Boolean).join(" > ");
    const productUp = p.availability === "in_stock" || p.availability === "low_stock";
    const availability = v && productUp ? v.availability : p.availability;
    return [
      "<item>",
      tag("id", v ? `${p.id}-${v.id}` : p.id),
      v ? tag("item_group_id", p.id) : "",
      `<title>${esc((v ? `${p.name} (${variantLabel(v.values)})` : p.name).slice(0, 150))}</title>`,
      `<description>${esc((p.description || p.summary).slice(0, 5000))}</description>`,
      `<link>${esc(absoluteUrl(`/products/${p.slug}${v ? `?v=${encodeURIComponent(v.id)}` : ""}`))}</link>`,
      tag("image_link", main.url),
      ...more.slice(0, 10).map((i) => tag("additional_image_link", i.url)),
      tag("availability", AVAILABILITY[availability] ?? "out_of_stock"),
      tag("price", gbp(v ? v.price : p.price)),
      tag("condition", "new"),
      // Brand: the shop's name (owner's decision, 27 Sep 2026). No barcodes on this stock.
      tag("brand", siteConfig.name),
      tag("identifier_exists", "no"),
      tag("google_product_category", shop.google.category || undefined),
      tag("product_type", type || undefined),
      tag("material", g.material),
      tag("color", g.color),
      tag("size", g.size),
      tag("pattern", g.pattern),
      tag("gender", g.gender),
      tag("age_group", g.ageGroup),
      g.dims?.w ? tag("product_width", `${g.dims.w} cm`) : "",
      g.dims?.d ? tag("product_length", `${g.dims.d} cm`) : "",
      g.dims?.h ? tag("product_height", `${g.dims.h} cm`) : "",
      g.weightKg ? tag("product_weight", `${g.weightKg} kg`) : "",
      g.weightKg ? tag("shipping_weight", `${g.weightKg} kg`) : "",
      "<g:shipping><g:country>GB</g:country><g:price>0.00 GBP</g:price></g:shipping>",
      "</item>",
    ].filter(Boolean).join("");
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(siteConfig.name)}</title>
<link>${esc(absoluteUrl("/"))}</link>
<description>${esc(shop.tagline)}</description>
${items.join("\n")}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
