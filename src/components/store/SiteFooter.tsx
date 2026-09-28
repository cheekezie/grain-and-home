import Link from "next/link";
import { getCategories, getShopSettings } from "@/lib/shop/server";
import { businessDetailsMissing, siteConfig } from "@/lib/siteConfig";
import PaymentMethods from "./PaymentMethods";
import SubscribeForm from "./SubscribeForm";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";

export default async function SiteFooter() {
  const b = siteConfig.business;
  const [shop, categories] = await Promise.all([getShopSettings(), getCategories()]);
  return (
    <footer className="mt-24 border-t border-line bg-plaster">
      <div className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-2xl">{shop.words.newsletterHeading}</h2>
            <p className="mt-1 text-[15px] text-muted">{shop.words.newsletterText}</p>
          </div>
          <SubscribeForm source="footer" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl">{siteConfig.name}</p>
          <p className="mt-3 text-[15px] text-muted">{shop.tagline}</p>
          <div className="mt-6">
            <PaymentMethods compact />
          </div>
        </div>
        <ul className="space-y-2 text-[15px]">
          {categories.map((c) => (
            <li key={c.slug}><Link href={`/shop/${c.slug}`} className="hover:text-moss">{c.name}</Link></li>
          ))}
        </ul>
        <ul className="space-y-2 text-[15px]">
          <li><Link href="/delivery" className="hover:text-moss">Delivery</Link></li>
          <li><Link href="/returns" className="hover:text-moss">Returns and cancellations</Link></li>
          <li><Link href="/returns/request" className="hover:text-moss">Start a return</Link></li>
          <li><Link href="/terms" className="hover:text-moss">Terms of sale</Link></li>
          <li><Link href="/privacy" className="hover:text-moss">Privacy</Link></li>
          <li><Link href="/contact" className="hover:text-moss">Contact us</Link></li>
          <li><CookieSettingsButton className="hover:text-moss" /></li>
        </ul>
        <address className="text-[14px] not-italic text-muted">
          {businessDetailsMissing() ? (
            <span className="font-semibold text-danger">Business name or email not set yet (see .env.example).</span>
          ) : (
            <>
              {b.legalName}
              {b.address && <><br />{b.address}</>}
              {b.companyNumber && <><br />Company no. {b.companyNumber}</>}
              {b.vatNumber && <><br />VAT no. {b.vatNumber}</>}
              <br />
              <a href={`mailto:${b.email}`} className="hover:text-moss">{b.email}</a>
            </>
          )}
        </address>
      </div>
    </footer>
  );
}
