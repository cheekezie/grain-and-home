import type { Metadata } from "next";
import CheckoutForm from "@/components/store/CheckoutForm";
import PaymentMethods from "@/components/store/PaymentMethods";
import { PURCHASABLE } from "@/lib/catalogue";
import { getProduct } from "@/lib/store";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// /checkout             → the basket
// /checkout?buy=slug&qty=n → "Buy now": just that product, basket untouched
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const { buy, qty } = await searchParams;
  let buyNow = null;
  if (typeof buy === "string" && buy) {
    const p = await getProduct(buy);
    if (p && (PURCHASABLE as readonly string[]).includes(p.availability)) {
      const quantity = Math.min(20, Math.max(1, Number(qty) || 1));
      buyNow = { productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, quantity };
    }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl">Checkout</h1>
      <CheckoutForm
        buyNow={buyNow}
        buyRequested={typeof buy === "string"}
        addressList={!!process.env.IDEAL_POSTCODES_API_KEY?.trim()}
        paymentMethods={<PaymentMethods compact />}
      />
    </div>
  );
}
