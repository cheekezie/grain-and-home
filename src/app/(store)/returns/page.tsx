import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/store/PolicyPage";
import { siteConfig } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Returns and cancellations", alternates: { canonical: "/returns" } };

// Follows the Consumer Contracts Regulations 2013 as summarised on GOV.UK:
// 14 days to cancel from delivery, 14 more to return, refund within 14 days
// of getting the goods back (or proof of return), standard delivery cost
// refunded, and the return cost stated up front for goods that can't be posted.
export default function ReturnsPage() {
  const email = siteConfig.business.email;
  return (
    <PolicyPage title="Returns and cancellations" updated="26 September 2026">
      <h2>Changing your mind</h2>
      <p>You can cancel your order for any reason within <strong>14 days of the day it&rsquo;s delivered</strong>. Use our <Link href="/returns/request">return form</Link>, or email{email ? <> <a href={`mailto:${email}`}>{email}</a></> : " us"} with your order number. You don&rsquo;t need to give a reason.</p>
      <p>You then have another 14 days to return the item. Because furniture usually can&rsquo;t go by post, we&rsquo;ll email you how to send it back, usually a collection or drop-off arranged for you. The cost of returning each item is shown on its product page before you buy, and is taken off your refund. Items need to be in the condition you received them, with reasonable handling to inspect them.</p>
      <h2>Your refund</h2>
      <p>We refund the price you paid, including standard delivery, within 14 days of the item reaching us (or of you showing it&rsquo;s been sent back), to your original payment method.</p>
      <h2>Faulty, damaged or not as described</h2>
      <p>If something arrives damaged, faulty or not as described, you don&rsquo;t pay for the return. <Link href="/returns/request">Tell us</Link>, with photos if you can, and we&rsquo;ll arrange a repair, replacement or refund. This is in addition to your rights under the Consumer Rights Act 2015.</p>
      <h2>Made-to-order items</h2>
      <p>Items made or customised to your choices (for example a sofa in a fabric you selected) can&rsquo;t be cancelled once production starts, unless they&rsquo;re faulty. We&rsquo;ll say clearly on the product page if this applies.</p>
      <p><Link href="/contact">Contact us</Link> if you have any questions.</p>
    </PolicyPage>
  );
}
