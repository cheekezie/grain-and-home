import type { Metadata } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, DM_Sans, Figtree, Fraunces, Instrument_Sans, Manrope, Young_Serif } from "next/font/google";
import NavigationProgress from "@/components/NavigationProgress";
import { siteConfig } from "@/lib/siteConfig";
import { getShopSettings } from "@/lib/shop/server";
import { shareImage } from "@/lib/shop/images";
import { themeStyle } from "@/lib/shop/theme";
import "./globals.css";

const youngSerif = Young_Serif({ variable: "--font-young-serif", subsets: ["latin"], weight: "400" });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
// Other font pairs a shop can choose (Shop settings → Look). Not preloaded:
// a browser only downloads the ones the page actually uses.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], preload: false });
const instrumentSans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"], preload: false });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], preload: false });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], preload: false });
const fontVars = [youngSerif, figtree, fraunces, instrumentSans, bricolage, dmSans, manrope].map((f) => f.variable).join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopSettings();
  const image = shareImage(shop.hero.image?.url);
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: `${siteConfig.name}: ${shop.seoTitle}`, template: `%s | ${siteConfig.name}` },
    description: shop.tagline,
    openGraph: { type: "website", siteName: siteConfig.name, locale: "en_GB", ...(image && { images: [image] }) },
    twitter: { card: "summary_large_image", ...(image && { images: [image] }) },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { theme } = await getShopSettings();
  return (
    <html lang="en-GB" className={fontVars} style={themeStyle(theme) as React.CSSProperties}>
      <body className="min-h-dvh" suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
