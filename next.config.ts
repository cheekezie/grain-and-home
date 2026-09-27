import type { NextConfig } from "next";
import { OPTIMISED_IMAGE_HOSTS } from "./src/lib/imageHosts";

const nextConfig: NextConfig = {
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
