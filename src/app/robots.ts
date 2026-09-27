import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/basket", "/checkout", "/success", "/saved"] }, sitemap: `${siteConfig.url}/sitemap.xml` };
}
