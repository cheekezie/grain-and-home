import { getPaymentMethods } from "@/lib/paymentMethods";

// Accepted payment methods as their official marks (unaltered, sources in
// public/payment-logos/SOURCES.md), straight from the Stripe account's
// live settings, so we only show what checkout really offers.
export default async function PaymentMethods({ compact = false }: { compact?: boolean }) {
  const marks = await getPaymentMethods();
  const h = compact ? 24 : 28;
  return (
    <div>
      {marks.length > 0 && (
        <>
          <p className={`font-semibold ${compact ? "text-[13px]" : "text-[14px]"}`}>We accept</p>
          <ul className="mt-2 flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
            {marks.map((m) => (
              <li
                key={m.label}
                className={m.card ? "flex items-center justify-center rounded-[5px] border border-line bg-white px-1.5" : "flex"}
                style={{ height: h, width: Math.round(h * m.ratio) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.logo} alt={m.label} title={m.label} className="max-h-full max-w-full object-contain" style={m.card ? { height: h * 0.55 } : { height: h }} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={`mt-2 text-muted ${compact ? "text-[12px]" : "text-[13px]"}`}>Secure checkout by Stripe. We never see your card details.</p>
    </div>
  );
}
