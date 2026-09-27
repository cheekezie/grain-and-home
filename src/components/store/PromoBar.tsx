import type { PublicPromo } from "@/lib/promos";
import { formatLondonDay } from "@/lib/londonDate";
import { formatPrice } from "@/lib/money";
import CopyCode from "./CopyCode";

// Slim bar above the header for the announced promo code.
export default function PromoBar({ promo }: { promo: PublicPromo }) {
  return (
    <div className="bg-moss text-white">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-[14px] sm:px-6">
        <span className="font-semibold">{promo.headline}</span>
        <span>with code</span>
        <CopyCode code={promo.code} tone="dark" />
        {(promo.minSpend || promo.expiresAt) && (
          <span className="text-white/80">
            {promo.minSpend ? `on orders over ${formatPrice(promo.minSpend)}` : ""}
            {promo.minSpend && promo.expiresAt ? ", " : ""}
            {promo.expiresAt ? `ends ${formatLondonDay(promo.expiresAt)}` : ""}
          </span>
        )}
      </p>
    </div>
  );
}
