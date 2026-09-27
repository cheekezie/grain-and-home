import ProductCard from "@/components/store/ProductCard";
import { HeroRoom, RoomTiles } from "@/components/store/HomeHero";
import { getPaymentMethods } from "@/lib/paymentMethods";
import { RecentlyViewed } from "@/components/store/ShopperRows";
import JsonLd from "@/components/JsonLd";
import { organisationJsonLd, shareMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/siteConfig";
import type { Metadata } from "next";
import { getCategoryCounts, getFeatured } from "@/lib/store";

export const revalidate = 300;

export const metadata: Metadata = {
  ...shareMeta({ title: `${siteConfig.name}: furniture delivered across mainland UK`, description: siteConfig.tagline, path: "/" }),
};

export default async function HomePage() {
  const [featured, counts, marks] = await Promise.all([getFeatured(), getCategoryCounts(), getPaymentMethods()]);
  const klarna = marks.some((m) => m.label === "Klarna");

  return (
    <>
      <JsonLd data={organisationJsonLd()} />
      <HeroRoom klarna={klarna} />
      <RoomTiles counts={counts} />
      <RecentlyViewed title="Pick up where you left off" />

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <h2 className="font-display text-3xl">Our picks</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} eager={i < 4} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
