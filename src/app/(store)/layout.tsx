import { CartProvider } from "@/lib/CartContext";
import SiteHeader from "@/components/store/SiteHeader";
import SiteFooter from "@/components/store/SiteFooter";
import PromoBar from "@/components/store/PromoBar";
import PromoDialog from "@/components/store/PromoDialog";
import CookieBanner from "@/components/consent/CookieBanner";
import Toaster from "@/components/store/Toaster";
import { getAnnouncedPromo, getWelcomePromo } from "@/lib/promos";
import { getClientWords } from "@/lib/shop/server";
import { ShopWordsProvider } from "@/components/store/ShopWords";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [announced, welcome, words] = await Promise.all([getAnnouncedPromo(), getWelcomePromo(), getClientWords()]);
  return (
    <ShopWordsProvider value={words}>
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-page focus:px-3 focus:py-2">
          Skip to content
        </a>
        {announced && <PromoBar promo={announced} />}
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <PromoDialog announced={announced} welcome={welcome} />
      <Toaster />
      <CookieBanner />
    </CartProvider>
    </ShopWordsProvider>
  );
}
