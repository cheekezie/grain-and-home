import type { Metadata } from "next";
import Link from "next/link";
import ReturnRequestForm from "@/components/store/ReturnRequestForm";
import { siteConfig } from "@/lib/siteConfig";

export const metadata: Metadata = { title: "Start a return", robots: { index: false } };

export default function ReturnRequestPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl">Start a return</h1>
      <p className="mt-3 max-w-xl text-muted">
        Tell us what you&rsquo;d like to send back. We&rsquo;ll reply by email with how to return it: most furniture is collected rather than posted.
        See <Link href="/returns" className="underline">returns and cancellations</Link> for your rights.
      </p>
      <div className="mt-8">
        <ReturnRequestForm supportEmail={siteConfig.business.email} />
      </div>
    </div>
  );
}
