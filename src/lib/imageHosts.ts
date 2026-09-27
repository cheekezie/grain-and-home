// Hosts whose product photos Next.js resizes and converts (WebP/AVIF at
// the size shown). Photos from anywhere else still display, just as-is.
// Used by next.config.ts and ShopImage.
export const OPTIMISED_IMAGE_HOSTS = [
  { protocol: "https", hostname: "www.artisanfurniture.net", pathname: "/wp-content/uploads/**" },
  { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" },
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
  { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
] as const;

export function isOptimisable(url: string): boolean {
  try {
    const u = new URL(url);
    return OPTIMISED_IMAGE_HOSTS.some((h) => u.protocol === `${h.protocol}:` && u.hostname === h.hostname && u.pathname.startsWith(h.pathname.replace("/**", "")));
  } catch {
    return false;
  }
}
