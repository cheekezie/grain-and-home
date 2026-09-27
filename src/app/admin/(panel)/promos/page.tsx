import AdminList, { PageHead } from "@/components/admin/AdminList";
import { adminPromos } from "@/lib/admin/queries";
import { headlineMismatch, promoState } from "@/lib/admin/promoForm";
import { formatPrice } from "@/lib/money";
import { formatLondonDay } from "@/lib/londonDate";

export const metadata = { title: "Promo codes" };

export default async function PromosPage() {
  const promos = await adminPromos();
  return (
    <div className="w-full">
      <PageHead title="Promo codes" newHref="/admin/promos/new" newLabel="Add promo code" />
      <p className="mt-4 max-w-2xl text-[15px] text-muted">
        Codes customers enter at checkout. Tick &ldquo;Announce&rdquo; on one to show it in the offer bar and pop-up, or &ldquo;Welcome&rdquo; to give it to new email subscribers.
      </p>
      <AdminList
        empty="No promo codes yet."
        rows={promos.map((p) => {
          const state = promoState(p);
          return {
            href: `/admin/promos/${p.id}`,
            title: `${p.code}: ${p.headline}`,
            sub: [
              state,
              p.kind === "percent" ? `${p.value}% off` : `${formatPrice(p.value)} off`,
              p.scope === "all" ? "everything" : p.scope === "products" ? `${p.productIds.length} products` : p.categories.join(", "),
              p.expiresAt && `ends ${formatLondonDay(p.expiresAt)}`,
              p.announce && "announced",
              p.welcome && "welcome code",
            ].filter(Boolean).join(" · "),
            meta: `Used ${p.usedCount}${p.maxUses ? ` of ${p.maxUses}` : ""} time${p.usedCount === 1 ? "" : "s"}`,
            issues: [
              p.announce && state !== "Live" ? `Announced but ${state.toLowerCase()}, so it isn't showing` : null,
              headlineMismatch(p),
            ].filter((x): x is string => !!x),
          };
        })}
      />
    </div>
  );
}
