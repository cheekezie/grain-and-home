import type { Metadata } from "next";
import BasketView from "@/components/store/BasketView";
import PaymentMethods from "@/components/store/PaymentMethods";

export const metadata: Metadata = { title: "Your basket", robots: { index: false } };

export default function BasketPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl">Your basket</h1>
      <BasketView paymentMethods={<PaymentMethods compact />} />
    </div>
  );
}
