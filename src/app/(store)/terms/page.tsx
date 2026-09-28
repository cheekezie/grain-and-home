import type { Metadata } from "next";
import PolicyPage from "@/components/store/PolicyPage";
import { siteConfig } from "@/lib/siteConfig";
import { getShopSettings } from "@/lib/shop/server";
import { deliveryAreaName } from "@/lib/shop/types";

export const metadata: Metadata = { title: "Terms of sale", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const b = siteConfig.business;
  const shop = await getShopSettings();
  return (
    <PolicyPage title="Terms of sale" updated="26 September 2026">
      <h2>Who we are</h2>
      <p>
        {b.legalName && b.legalName !== siteConfig.name ? <>{siteConfig.name} is run by {b.legalName}</> : <>This shop is run by {siteConfig.name}</>}
        {b.companyNumber && <>, company number {b.companyNumber}</>}
        {b.address && <>, {b.address}</>}. Contact:{" "}
        {b.email ?? "[email]"}
        {b.phone && <>, {b.phone}</>}.
      </p>
      <h2>Your order</h2>
      <p>When you pay, we accept your order and email your receipt. {shop.delivery.twoPerson ? `Our ${shop.words.goods} is supplied and delivered by trusted UK trade partners on our behalf.` : "Our products are made or supplied, and delivered, by trusted partners on our behalf."} If an item turns out to be unavailable after you&rsquo;ve paid, we&rsquo;ll tell you promptly and refund you in full.</p>
      <h2>Prices</h2>
      <p>Prices include VAT and delivery to {deliveryAreaName(shop.delivery.area)}. If we&rsquo;ve made an obvious pricing mistake we&rsquo;ll contact you before your order goes ahead.</p>
      <h2>Delivery, cancellations and returns</h2>
      <p>See our Delivery and Returns pages. Nothing in these terms affects your statutory rights.</p>
      <h2>Law</h2>
      <p>These terms are governed by the law of England and Wales. You can bring claims in the courts of the UK nation where you live.</p>
    </PolicyPage>
  );
}
