import { connectDB } from "@/lib/db";
import { toStoreProduct } from "@/lib/serialize";
import { categoryName } from "@/lib/catalogue";
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
  const docs = await ProductModel.find({ status: "published", availability: { $ne: "discontinued" }, price: { $gt: 0 } }).sort({ category: 1, sortOrder: 1 }).lean();
  const items = docs.map(toStoreProduct).filter((p) => p.images.length > 0).map((p) => {
    const [main, ...more] = p.images;
    return [
      "<item>",
      tag("id", p.id),
      `<title>${esc(p.name.slice(0, 150))}</title>`,
      `<description>${esc((p.description || p.summary).slice(0, 5000))}</description>`,
      `<link>${esc(absoluteUrl(`/products/${p.slug}`))}</link>`,
      tag("image_link", main.url),
      ...more.slice(0, 10).map((i) => tag("additional_image_link", i.url)),
      tag("availability", AVAILABILITY[p.availability] ?? "in_stock"),
      tag("price", gbp(p.price)),
      tag("condition", "new"),
      // Brand: the shop's name (owner's decision, 27 Sep 2026). No barcodes on this stock.
      tag("brand", siteConfig.name),
      tag("identifier_exists", "no"),
      tag("google_product_category", "436"), // Furniture
      tag("product_type", `Furniture > ${categoryName(p.category)}`),
      tag("material", p.materials || undefined),
      tag("color", p.colour || undefined),
      p.widthCm ? tag("product_width", `${p.widthCm} cm`) : "",
      p.depthCm ? tag("product_length", `${p.depthCm} cm`) : "",
      p.heightCm ? tag("product_height", `${p.heightCm} cm`) : "",
      p.weightKg ? tag("product_weight", `${p.weightKg} kg`) : "",
      p.weightKg ? tag("shipping_weight", `${p.weightKg} kg`) : "",
      "<g:shipping><g:country>GB</g:country><g:price>0.00 GBP</g:price></g:shipping>",
      "</item>",
    ].filter(Boolean).join("");
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(siteConfig.name)}</title>
<link>${esc(absoluteUrl("/"))}</link>
<description>${esc(siteConfig.tagline)}</description>
${items.join("\n")}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
