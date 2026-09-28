import type { Metadata } from "next";
import type { StoreProduct } from "./types";
import { siteConfig } from "./siteConfig";
import { excludedPostcodePrefixes } from "./delivery";
import { googleDetails } from "./shop/details";
import type { DetailField, DeliveryArea } from "./shop/types";
import { CURRENCY, MINOR_DIGITS, toMajor } from "./money";

// Search-engine helpers: absolute URLs, Open Graph/Twitter cards, and
// schema.org structured data. Everything states only what's true on the
// page: no ratings or reviews until real ones exist.

export const absoluteUrl = (path: string) => new URL(path, siteConfig.url).toString();

/** Open Graph + Twitter card for a page (child metadata replaces the parent's openGraph, so this sets it all). Pass the hero's share image when a page has no photo of its own. */
export function shareMeta({ title, description, path, image, type = "website" }: { title: string; description: string; path: string; image?: string; type?: "website" | "article" }): Pick<Metadata, "openGraph" | "twitter" | "alternates"> {
  const images = image ? [image] : undefined;
  return {
    alternates: { canonical: path },
    openGraph: { type, siteName: siteConfig.name, locale: "en_GB", url: path, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

const money = (minor: number) => toMajor(minor).toFixed(MINOR_DIGITS);
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

export function productJsonLd(p: StoreProduct, shop: { categoryName: string; deliveryArea: DeliveryArea; details: DetailField[] }) {
  const g = googleDetails(shop.details, p.details);
  const url = absoluteUrl(`/products/${p.slug}`);
  const days = parseDeliveryDays(p.deliveryEstimate);
  const shipping = [
    {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: 0, currency: CURRENCY },
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
      // Say plainly where we don't deliver.
      "@type": "OfferShippingDetails",
      doesNotShip: true,
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB", postalCodePrefix: excludedPostcodePrefixes(shop.deliveryArea) },
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
        ? { returnFees: "https://schema.org/ReturnShippingFees", returnShippingFeesAmount: { "@type": "MonetaryAmount", value: Number(money(p.returnCost)), currency: CURRENCY } }
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
    category: shop.categoryName,
    ...(g.material && { material: g.material }),
    ...(g.color && { color: g.color }),
    ...(g.size && { size: g.size }),
    ...(g.pattern && { pattern: g.pattern }),
    ...(g.gender && { audience: { "@type": "PeopleAudience", suggestedGender: g.gender } }),
    ...(g.dims?.w && { width: cm(g.dims.w) }),
    ...(g.dims?.d && { depth: cm(g.dims.d) }),
    ...(g.dims?.h && { height: cm(g.dims.h) }),
    ...(g.weightKg && { weight: { "@type": "QuantitativeValue", value: g.weightKg, unitCode: "KGM" } }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: CURRENCY,
      // With options the lowest price is the "from" price; each option's own price is in the Google feed.
      price: money(p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.price),
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

export function organisationJsonLd(tagline: string) {
  const b = siteConfig.business;
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: siteConfig.name,
      url: absoluteUrl("/"),
      description: tagline,
      ...(b.legalName && b.legalName !== siteConfig.name && { legalName: b.legalName }),
      ...(b.email && { email: b.email, contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: b.email, areaServed: "GB", availableLanguage: "English" } }),
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: absoluteUrl("/") },
  ];
}
