import type { Metadata } from "next";
import BasketView from "@/components/store/BasketView";
import PaymentMethods from "@/components/store/PaymentMethods";
import BackLink from "@/components/store/BackLink";

export const metadata: Metadata = { title: "Your basket", robots: { index: false } };

export default function BasketPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <BackLink href="/">Continue shopping</BackLink>
      <h1 className="mt-2 font-display text-4xl">Your basket</h1>
      <BasketView paymentMethods={<PaymentMethods compact />} />
    </div>
  );
}
