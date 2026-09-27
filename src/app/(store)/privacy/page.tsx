import type { Metadata } from "next";
import PolicyPage from "@/components/store/PolicyPage";
import { siteConfig } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy" updated="27 September 2026">
      <h2>What we collect</h2>
      <p>When you order, we receive your name, email, phone number, delivery address and what you bought. Payments are taken by Stripe, which handles your card details; we never see them.</p>
      <p>When you look up your postcode at checkout, only the postcode is sent to a postcode lookup service (postcodes.io{process.env.IDEAL_POSTCODES_API_KEY ? ", and Ideal Postcodes to list the addresses there" : ""}) to check it and find your address.</p>
      <p>If you sign up for emails, we keep your email address and the wording you agreed to, and use it only to send offers and news about new pieces. Every email has an unsubscribe link. If you ask to hear when an item is back in stock, we keep your email for that one message.</p>
      <h2>Why</h2>
      <p>To fulfil your order: we pass your name, delivery address and phone number to the supplier delivering your furniture, and use your email and phone to keep you updated. We keep order records for as long as the law requires for tax and accounting.</p>
      <h2 id="cookies">Cookies and browser storage</h2>
      <p>Essential, always on: one cookie remembering your cookie choice, and browser storage for your basket, saved items, recently viewed pieces, a promo code you&rsquo;ve claimed, whether you&rsquo;ve seen our offer pop-up, and the delivery details you type at checkout (for that browser tab only). This stays on your device.</p>
      <p>Analytics and marketing: only if you choose &ldquo;Accept all&rdquo;. We don&rsquo;t use any yet; if we add them, we&rsquo;ll list them here and ask again. You can change your choice any time with &ldquo;Cookie settings&rdquo; at the bottom of every page. Stripe sets its own cookies on its checkout page.</p>
      <h2>Your rights</h2>
      <p>Under UK GDPR you can ask to see, correct or delete the data we hold about you{siteConfig.business.email ? <> by emailing {siteConfig.business.email}</> : ""}. You can also complain to the Information Commissioner&rsquo;s Office (ico.org.uk).</p>
    </PolicyPage>
  );
}
