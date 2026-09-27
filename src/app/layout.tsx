import type { Metadata } from "next";
import { Suspense } from "react";
import { Figtree, Young_Serif } from "next/font/google";
import NavigationProgress from "@/components/NavigationProgress";
import { siteConfig } from "@/lib/siteConfig";
import { DEFAULT_SHARE_IMAGE } from "@/lib/seo";
import "./globals.css";

const youngSerif = Young_Serif({ variable: "--font-young-serif", subsets: ["latin"], weight: "400" });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name}: furniture delivered across mainland UK`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.tagline,
  openGraph: { type: "website", siteName: siteConfig.name, locale: "en_GB", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", images: [DEFAULT_SHARE_IMAGE] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${youngSerif.variable} ${figtree.variable}`}>
      <body className="min-h-dvh" suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
