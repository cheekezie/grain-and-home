"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import QuantityStepper from "@/components/store/QuantityStepper";
import { showToast } from "@/lib/toast";

export default function AddToCartForm({
  productId,
  slug,
  name,
  price,
  image,
  purchasable,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  purchasable: boolean;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!purchasable) {
    return null; // the product page shows the back-in-stock form instead
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[15px] text-muted">Quantity</span>
        <QuantityStepper value={quantity} onChange={setQuantity} label={`Quantity of ${name}`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Buy now skips the basket entirely: straight to checkout with just this item. */}
        <button
          type="button"
          onClick={() => router.push(`/checkout?buy=${encodeURIComponent(slug)}&qty=${quantity}`)}
          className="rounded-full bg-moss px-8 py-3.5 text-[16px] font-semibold text-white hover:bg-moss-deep"
        >
          Buy now
        </button>
        <button
          type="button"
          onClick={() => {
            addItem({ productId, slug, name, price, image }, quantity);
            setAdded(true);
            showToast({
              title: "Added to your basket",
              body: quantity > 1 ? `${quantity} × ${name}` : name,
              image,
              action: { label: "View basket", href: "/basket" },
            });
          }}
          className="rounded-full border-2 border-ink px-8 py-3 text-[16px] font-semibold hover:bg-ink hover:text-white"
        >
          Add to basket
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-[15px]">
        {added && (
          <>
            Added to your basket. <Link href="/basket" className="font-semibold text-moss underline underline-offset-2">View basket</Link>
          </>
        )}
      </p>
    </div>
  );
}
