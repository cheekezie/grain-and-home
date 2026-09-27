import type { Metadata } from "next";
import type { StoreProduct } from "./types";
import { siteConfig } from "./siteConfig";
import { categoryName } from "./catalogue";
import { excludedPostcodePrefixes } from "./delivery";
import { unsplash } from "./roomPhotos";

// Search-engine helpers: absolute URLs, Open Graph/Twitter cards, and
// schema.org structured data. Everything states only what's true on the
// page: no ratings or reviews until real ones exist.

export const absoluteUrl = (path: string) => new URL(path, siteConfig.url).toString();

/** Default share image: the home page room photo, cropped to 1200×630. */
export const DEFAULT_SHARE_IMAGE = `${unsplash("photo-1631510390389-c1e4fb20ff31", 1200)}&h=630`;

/** Open Graph + Twitter card for a page (child metadata replaces the parent's openGraph, so this sets it all). */
export function shareMeta({ title, description, path, image, type = "website" }: { title: string; description: string; path: string; image?: string; type?: "website" | "article" }): Pick<Metadata, "openGraph" | "twitter" | "alternates"> {
  const images = [image ?? DEFAULT_SHARE_IMAGE];
  return {
    alternates: { canonical: path },
    openGraph: { type, siteName: siteConfig.name, locale: "en_GB", url: path, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

const money = (pence: number) => (pence / 100).toFixed(2);
const cm = (v?: number) => (v ? { "@type": "QuantitativeValue", value: v, unitCode: "CMT" } : undefined);

/** "Usually delivered in 3–5 working days" → { min: 3, max: 5 } */
function parseDeliveryDays(text: string): { min: number; max: number } | null {
  const m = text.match(/(\d+)\s*(?:–|-|to)\s*(\d+)\s*(?:working\s+)?days?/i) ?? text.match(/(\d+)\s*(?:working\s+)?days?/i);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2] ?? m[1]);
  return min <= max ? { min, max } : null;
}

const AVAILABILITY: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  discontinued: "https://schema.org/Discontinued",
};

export function productJsonLd(p: StoreProduct) {
  const url = absoluteUrl(`/products/${p.slug}`);
  const days = parseDeliveryDays(p.deliveryEstimate);
  const shipping = [
    {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "GBP" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
      ...(days && {
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: days.min, maxValue: days.max, unitCode: "DAY" },
        },
      }),
    },
    {
      // Mainland UK only: say plainly where we don't deliver.
      "@type": "OfferShippingDetails",
      doesNotShip: true,
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB", postalCodePrefix: excludedPostcodePrefixes() },
    },
  ];
  const returnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "GB",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    ...(p.returnCost === 0
      ? { returnFees: "https://schema.org/FreeReturn" }
      : p.returnCost != null
        ? { returnFees: "https://schema.org/ReturnShippingFees", returnShippingFeesAmount: { "@type": "MonetaryAmount", value: Number(money(p.returnCost)), currency: "GBP" } }
        : {}),
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || p.summary,
    url,
    sku: p.slug,
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: siteConfig.name },
    category: categoryName(p.category),
    ...(p.materials && { material: p.materials }),
    ...(p.colour && { color: p.colour }),
    ...(p.widthCm && { width: cm(p.widthCm) }),
    ...(p.depthCm && { depth: cm(p.depthCm) }),
    ...(p.heightCm && { height: cm(p.heightCm) }),
    ...(p.weightKg && { weight: { "@type": "QuantitativeValue", value: p.weightKg, unitCode: "KGM" } }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "GBP",
      price: money(p.price),
      availability: AVAILABILITY[p.availability] ?? AVAILABILITY.in_stock,
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: siteConfig.name },
      shippingDetails: shipping,
      hasMerchantReturnPolicy: returnPolicy,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function organisationJsonLd() {
  const b = siteConfig.business;
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: siteConfig.name,
      url: absoluteUrl("/"),
      description: siteConfig.tagline,
      ...(b.legalName && b.legalName !== siteConfig.name && { legalName: b.legalName }),
      ...(b.email && { email: b.email, contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: b.email, areaServed: "GB", availableLanguage: "English" } }),
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: absoluteUrl("/") },
  ];
}
