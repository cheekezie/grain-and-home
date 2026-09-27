"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/money";
import QuantityStepper from "./QuantityStepper";
import ShopImage from "@/components/store/ShopImage";

export default function BasketView({ paymentMethods }: { paymentMethods?: React.ReactNode }) {
  const { items, setQuantity, removeItem, subtotal } = useCart();
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl bg-plaster p-8">
        <p className="text-lg">Your basket is empty.</p>
        <Link href="/" className="mt-3 inline-block font-semibold text-moss underline underline-offset-2">Browse furniture</Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-10 md:grid-cols-[1fr_300px]">
      <ul className="divide-y divide-line border-y border-line">
        {items.map((i) => (
          <li key={i.productId} className="flex gap-4 py-5">
            <Link href={`/products/${i.slug}`} className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-plaster">
              {i.image && (
                <ShopImage src={i.image} alt="" sizes="96px" className="object-contain p-2 mix-blend-multiply" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${i.slug}`} className="font-medium hover:text-moss">{i.name}</Link>
              <p className="tabular text-[15px] text-muted">{formatPrice(i.price)} each</p>
              <div className="mt-2 flex items-center gap-4">
                <QuantityStepper size="sm" value={i.quantity} onChange={(n) => setQuantity(i.productId, n)} label={`Quantity of ${i.name}`} />
                <button type="button" onClick={() => removeItem(i.productId)} className="text-[15px] underline hover:text-danger">
                  Remove
                </button>
              </div>
            </div>
            <p className="tabular font-semibold">{formatPrice(i.price * i.quantity)}</p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl bg-plaster p-5">
        <dl className="tabular space-y-2 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery (mainland UK)</dt><dd>Free</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold"><dt>Total</dt><dd>{formatPrice(subtotal)}</dd></div>
        </dl>
        <p className="mt-2 text-[13px] text-muted">Prices and availability are checked again at checkout.</p>
        <Link
          href="/checkout"
          className="mt-4 block w-full rounded-full bg-moss px-6 py-3.5 text-center font-semibold text-white hover:bg-moss-deep"
        >
          Checkout securely
        </Link>
        <p className="mt-2 text-[13px] text-muted">We deliver to mainland UK. You&rsquo;ll add your address next.</p>
        <div className="mt-4">{paymentMethods}</div>
      </aside>
    </div>
  );
}
