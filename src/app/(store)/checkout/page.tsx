import type { Metadata } from "next";
import CheckoutForm from "@/components/store/CheckoutForm";
import PaymentMethods from "@/components/store/PaymentMethods";
import BackLink from "@/components/store/BackLink";
import { getPackPieces, getProduct } from "@/lib/store";
import { variantLabel } from "@/lib/variants";
import { imageFor } from "@/lib/variantImages";
import { PURCHASABLE } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// /checkout             → the basket
// /checkout?buy=slug&qty=n[&v=variant] → "Buy now": just that product, basket untouched
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const { buy, qty, v, p: packChoices } = await searchParams;
  let buyNow = null;
  if (typeof buy === "string" && buy) {
    const p = await getProduct(buy);
    const quantity = Math.min(20, Math.max(1, Number(qty) || 1));
    const variant = p?.variants.length ? p.variants.find((x) => x.id === v) : undefined;
    const ok = (a: string) => (PURCHASABLE as readonly string[]).includes(a);
    const pieces = p?.packSlots.length ? await getPackPieces(p.packSlots) : [];
    if (p && pieces.length && ok(p.availability)) {
      // A pack: the choice for each piece (checked again at payment).
      const choices = (typeof packChoices === "string" ? packChoices : "").split("|");
      const labels = pieces.map((x, i) => {
        const pv = x.variants.find((y) => y.id === choices[i]);
        return x.variants.length ? (pv && ok(pv.availability) ? `${x.name}, ${variantLabel(pv.values)}` : null) : ok(x.availability) ? x.name : null;
      });
      if (labels.every(Boolean)) {
        buyNow = { productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, quantity, choices: pieces.map((_, i) => choices[i] ?? ""), pieces: labels as string[] };
      }
    } else if (p && ok(p.availability) && !p.variants.length) {
      buyNow = { productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, quantity };
    } else if (p && ok(p.availability) && variant && ok(variant.availability)) {
      buyNow = { productId: p.id, variantId: variant.id, variant: variantLabel(variant.values), slug: p.slug, name: p.name, price: variant.price, image: imageFor(p.images, variant.values)?.url ?? null, quantity };
    }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      {buyNow ? <BackLink href={`/products/${buyNow.slug}`}>Back to {buyNow.name}</BackLink> : <BackLink href="/basket">Back to basket</BackLink>}
      <h1 className="mt-2 font-display text-4xl">Checkout</h1>
      <CheckoutForm
        buyNow={buyNow}
        buyRequested={typeof buy === "string"}
        addressList={!!process.env.IDEAL_POSTCODES_API_KEY?.trim()}
        paymentMethods={<PaymentMethods compact />}
      />
    </div>
  );
}
