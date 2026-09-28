import type { NextConfig } from "next";
import { OPTIMISED_IMAGE_HOSTS } from "./src/lib/imageHosts";

// The shop's real address. Any other address serving this deployment
// (the free *.vercel.app one, preview builds) tells search engines not to
// index it, so Google only ever lists the real domain.
const siteHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host;
  } catch {
    return "";
  }
})();
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nextConfig: NextConfig = {
  async headers() {
    if (!siteHost || siteHost.startsWith("localhost")) return [];
    return [{ source: "/:path*", missing: [{ type: "host", value: `^${escapeRegex(siteHost)}$` }], headers: [{ key: "X-Robots-Tag", value: "noindex" }] }];
  },
  async redirects() {
    // Room pages became Categories (Sep 2026).
    return [
      { source: "/admin/rooms", destination: "/admin/categories", permanent: true },
      { source: "/admin/rooms/:slug", destination: "/admin/categories", permanent: true },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: OPTIMISED_IMAGE_HOSTS.map((h) => ({ ...h })),
    formats: ["image/avif", "image/webp"],
    // Supplier photos rarely change; keep resized copies for a day.
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
