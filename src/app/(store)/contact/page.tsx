import type { Metadata } from "next";
import PolicyPage from "@/components/store/PolicyPage";
import { siteConfig } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Contact us", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const b = siteConfig.business;
  return (
    <PolicyPage title="Contact us" updated="26 September 2026">
      <p>For questions about an order, include your order number and we&rsquo;ll reply as soon as we can.</p>
      <ul>
        <li>Email: {b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : "[to be added]"}</li>
        {b.phone && <li>Phone: {b.phone}</li>}
        {b.address && <li>Address: {b.address}</li>}
      </ul>
      <p>Want to send something back? <a href="/returns/request">Start a return</a>.</p>
    </PolicyPage>
  );
}
