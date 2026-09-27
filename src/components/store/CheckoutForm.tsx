"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/money";
import { checkDeliveryPostcode } from "@/lib/delivery";
import type { CartItem } from "@/lib/types";
import QuantityStepper from "./QuantityStepper";
import { forgetClaimedPromo, readClaimedPromo } from "@/lib/marketing";

type Delivery = { email: string; name: string; phone: string; line1: string; line2: string; city: string; postcode: string };
type Address = { line1: string; line2: string; city: string; postcode: string };
type AppliedPromo = { code: string; headline: string; discount: number };
type PromoCheck = { ok: true; code: string; headline: string; discount: number } | { ok: false; message: string };

async function checkPromo(code: string, email: string, items: { productId: string; quantity: number }[]): Promise<PromoCheck> {
  try {
    const res = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, email, items }) });
    return (await res.json()) as PromoCheck;
  } catch {
    return { ok: false, message: "Couldn't check the code. Check your connection and try again." };
  }
}

type Lookup =
  | { ok: true; postcode: string; area?: string; town?: string; addresses: Address[] }
  | { ok: false; reason: "invalid" | "excluded" | "not_found" | "unavailable"; postcode: string; message?: string };

const EMPTY: Delivery = { email: "", name: "", phone: "", line1: "", line2: "", city: "", postcode: "" };
const SAVED = "checkout-delivery-v1";
const input = "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5";

// Kept for this browser tab only, so returning from Stripe or refreshing
// doesn't lose what was typed. Never sent anywhere but our checkout.
function loadSaved(): Delivery {
  try {
    const raw = sessionStorage.getItem(SAVED);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export default function CheckoutForm({
  buyNow,
  buyRequested,
  paymentMethods,
  addressList = false,
}: {
  buyNow: CartItem | null;
  buyRequested: boolean;
  /** True when a paid address lookup is configured (pick-from-list). */
  addressList?: boolean;
  paymentMethods: React.ReactNode;
}) {
  const cart = useCart();
  const [buyQty, setBuyQty] = useState(buyNow?.quantity ?? 1);
  const [d, setD] = useState<Delivery>(() => (typeof window === "undefined" ? EMPTY : loadSaved()));
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [looking, setLooking] = useState(false);
  // Showing the list of addresses found for the postcode.
  const [choosing, setChoosing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filledFromLookup, setFilledFromLookup] = useState(false);
  // Promo: a code claimed from the offer pop-up or sign-up is prefilled.
  const [claimed, setClaimed] = useState(() => (typeof window === "undefined" ? "" : (readClaimedPromo() ?? "")));
  const [promoInput, setPromoInput] = useState(claimed);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, setPromoPending] = useState(false);

  const items = buyNow ? [{ ...buyNow, quantity: buyQty }] : cart.items;
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const lines = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  const linesKey = JSON.stringify(lines);
  const discount = promo?.discount ?? 0;

  // Apply a claimed code on arrival, and re-check an applied code whenever
  // the order changes (quantities, basket), since the discount depends on it.
  const codeToCheck = promo?.code ?? claimed;
  useEffect(() => {
    if (!codeToCheck || items.length === 0) return;
    let cancelled = false;
    checkPromo(codeToCheck, "", JSON.parse(linesKey)).then((r) => {
      if (cancelled) return;
      if (r.ok) setPromo({ code: r.code, headline: r.headline, discount: r.discount });
      else { setPromo(null); setClaimed(""); setPromoError(r.message); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, codeToCheck]);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoPending(true);
    setPromoError(null);
    const r = await checkPromo(code, d.email, lines);
    setPromoPending(false);
    if (r.ok) setPromo({ code: r.code, headline: r.headline, discount: r.discount });
    else { setPromo(null); setPromoError(r.message); }
  };

  const removePromo = () => {
    setPromo(null);
    setClaimed("");
    setPromoInput("");
    setPromoError(null);
    forgetClaimedPromo();
  };

  const set = (k: keyof Delivery, v: string) =>
    setD((prev) => {
      const next = { ...prev, [k]: v };
      try { sessionStorage.setItem(SAVED, JSON.stringify(next)); } catch { /* storage off: fine */ }
      return next;
    });

  const findAddress = async () => {
    const pc = checkDeliveryPostcode(d.postcode);
    if (!pc.ok) {
      setLookup({ ok: false, reason: pc.reason, postcode: pc.postcode });
      return;
    }
    setLooking(true);
    try {
      const res = await fetch(`/api/address-lookup?postcode=${encodeURIComponent(pc.postcode)}`);
      const data = (await res.json()) as Lookup;
      setLookup(data);
      if (data.ok) {
        if (data.addresses.length === 1) {
          pick(data.addresses[0]);
        } else if (data.addresses.length > 1) {
          // The usual UK pattern: postcode, then pick your address.
          set("postcode", data.postcode);
          setChoosing(true);
        } else {
          // Fill what we know (postcode, town) and open the address boxes,
          // so only the house number and street are left to type.
          setD((prev) => {
            const next = { ...prev, postcode: data.postcode, city: prev.city || data.town || "" };
            try { sessionStorage.setItem(SAVED, JSON.stringify(next)); } catch { /* fine */ }
            return next;
          });
          setFilledFromLookup(false);
          if (data.addresses.length === 0) setTimeout(() => document.getElementById("address-line1")?.focus(), 0);
        }
      }
    } catch {
      setLookup({ ok: true, postcode: pc.postcode, addresses: [] });
    } finally {
      setLooking(false);
    }
  };

  const pick = (a: Address) => {
    setFilledFromLookup(true);
    setChoosing(false);
    setD((prev) => {
      const next = { ...prev, line1: a.line1, line2: a.line2, city: a.city, postcode: a.postcode };
      try { sessionStorage.setItem(SAVED, JSON.stringify(next)); } catch { /* fine */ }
      return next;
    });
  };

  const pay = async () => {
    setError(null);
    const pc = checkDeliveryPostcode(d.postcode);
    if (!pc.ok) return setError(pc.reason === "invalid" ? "Enter a valid UK postcode." : `Sorry, we can't deliver to ${pc.postcode}. We deliver to mainland UK only.`);
    if (!d.line1.trim() || !d.city.trim()) {
      return setError("Enter your full delivery address.");
    }
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: buyNow ? "buy_now" : "basket",
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          delivery: { ...d, postcode: pc.postcode },
          promoCode: promo?.code,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; promo?: boolean };
      if (data.promo) {
        // The code stopped working (expired, used up): drop it, show why.
        setPromo(null);
        setPromoError(data.error ?? "That code can't be used.");
        setPending(false);
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout couldn't start. Try again.");
      window.location.href = data.url;
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg && !/json|fetch|network|unexpected/i.test(msg) ? msg : "Checkout couldn't start. Check your connection and try again.");
      setPending(false);
    }
  };

  // Rendered only once hydrated: the basket and any saved details live in
  // browser storage, so the server can't render them.
  if (!cart.ready) return <div className="mt-8 h-64 animate-pulse rounded-2xl bg-plaster" aria-label="Loading your basket" />;

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl bg-plaster p-8">
        <p className="text-lg">{buyRequested ? "That item isn't available to buy right now." : "Your basket is empty."}</p>
        <Link href="/" className="mt-3 inline-block font-semibold text-moss underline underline-offset-2">Browse furniture</Link>
      </div>
    );
  }

  const lookupMessage =
    lookup && !lookup.ok
      ? lookup.reason === "invalid"
        ? "Enter a valid UK postcode, e.g. SW1A 1AA."
        : lookup.reason === "excluded"
          ? `Sorry, we can't deliver to ${lookup.postcode}. We deliver to mainland UK only.`
          : lookup.reason === "not_found"
            ? `We couldn't find ${lookup.postcode}. Check it, or carry on and type your address.`
            : (lookup.message ?? "Postcode check isn't available right now. Carry on and type your address.")
      : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        pay();
      }}
      className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="text-xl font-semibold">Contact</legend>
          <label className="block text-[15px] font-semibold">
            Email
            <input type="email" name="email" required autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} className={input} />
            <span className="mt-1 block text-[13px] font-normal text-muted">For your order confirmation and delivery updates.</span>
          </label>
          <label className="block text-[15px] font-semibold">
            Phone
            <input type="tel" name="tel" required autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
            <span className="mt-1 block text-[13px] font-normal text-muted">The courier uses it to arrange delivery.</span>
          </label>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xl font-semibold">Delivery address</legend>
          <p className="text-[14px] text-muted">
            We deliver free to mainland UK addresses. Your browser can fill this in for you: tap a box and choose a saved address.
          </p>
          <label className="block text-[15px] font-semibold">
            Full name
            <input name="name" required autoComplete="shipping name" value={d.name} onChange={(e) => set("name", e.target.value)} className={input} />
          </label>
          <div>
            <label htmlFor="postcode" className="block text-[15px] font-semibold">Postcode</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="postcode"
                name="postal-code"
                required
                autoComplete="shipping postal-code"
                value={d.postcode}
                onChange={(e) => { set("postcode", e.target.value.toUpperCase()); setLookup(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findAddress(); } }}
                onBlur={() => { if (!lookup && checkDeliveryPostcode(d.postcode).ok) findAddress(); }}
                placeholder="e.g. SW1A 1AA"
                className="w-full max-w-[12rem] rounded-lg border border-line bg-white px-3 py-2.5 uppercase"
              />
              {/* Only when a real address lookup is set up; otherwise the
                  postcode is checked quietly when the box is left. */}
              {addressList && (
                <button type="button" onClick={findAddress} disabled={looking || !d.postcode.trim()} className="rounded-lg bg-ink px-4 font-semibold text-white disabled:opacity-50">
                  {looking ? "Finding…" : "Find address"}
                </button>
              )}
            </div>
            {lookupMessage && <p role="alert" className="mt-2 text-[14px] font-semibold text-danger">{lookupMessage}</p>}
            {lookup?.ok && lookup.area && (
              <p className="mt-2 text-[14px] text-muted">
                {lookup.postcode}: {lookup.area}. We deliver here.
                {lookup.addresses.length === 0 && !d.line1 && " Add your house number and street below."}
              </p>
            )}
          </div>

          {choosing && lookup?.ok && lookup.addresses.length > 1 && (
            <div>
              <p id="address-list-label" className="text-[15px] font-semibold">Select your address</p>
              <p className="text-[14px] text-muted">{lookup.addresses.length} addresses found for {lookup.postcode}</p>
              <ul role="list" aria-labelledby="address-list-label" className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line bg-white">
                {lookup.addresses.map((a, n) => (
                  <li key={n}>
                    <button type="button" onClick={() => pick(a)} className="block w-full px-3 py-2.5 text-left text-[15px] hover:bg-plaster focus:bg-plaster">
                      {[a.line1, a.line2, a.city].filter(Boolean).join(", ")}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => { setChoosing(false); setFilledFromLookup(false); set("city", lookup.town ?? d.city); }} className="mt-2 text-[15px] font-semibold text-moss underline underline-offset-2">
                My address isn&rsquo;t listed
              </button>
            </div>
          )}

          {!choosing && (
            <div className="space-y-4">
              {filledFromLookup && (
                <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-moss-soft px-3 py-2 text-[14px]">
                  <span>Address filled in. Check it&rsquo;s right, and add a flat number if needed.</span>
                  {lookup?.ok && lookup.addresses.length > 1 && (
                    <button type="button" onClick={() => setChoosing(true)} className="font-semibold underline">Choose a different address</button>
                  )}
                </p>
              )}
              <label className="block text-[15px] font-semibold">
                Address line 1
                <input id="address-line1" name="address-line1" required autoComplete="shipping address-line1" placeholder="House number and street" value={d.line1} onChange={(e) => set("line1", e.target.value)} className={input} />
              </label>
              <label className="block text-[15px] font-semibold">
                Address line 2 <span className="font-normal text-muted">(optional)</span>
                <input name="address-line2" autoComplete="shipping address-line2" placeholder="Flat, building" value={d.line2} onChange={(e) => set("line2", e.target.value)} className={input} />
              </label>
              <label className="block text-[15px] font-semibold">
                Town or city
                <input name="address-level2" required autoComplete="shipping address-level2" value={d.city} onChange={(e) => set("city", e.target.value)} className={input} />
              </label>
            </div>
          )}
        </fieldset>
      </div>

      <aside className="h-fit rounded-2xl bg-plaster p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">{buyNow ? "Buying now" : "Your order"}</h2>
        <ul className="mt-3 divide-y divide-line">
          {items.map((i) => (
            <li key={i.productId} className="flex gap-3 py-3">
              <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg bg-white">
                {i.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="absolute inset-0 size-full object-contain p-1.5" />
                )}
              </span>
              <div className="min-w-0 flex-1 text-[15px]">
                <p className="font-medium">{i.name}</p>
                {buyNow ? (
                  <div className="mt-1.5"><QuantityStepper size="sm" value={buyQty} onChange={setBuyQty} label={`Quantity of ${i.name}`} /></div>
                ) : (
                  <p className="tabular text-muted">Qty {i.quantity}</p>
                )}
              </div>
              <p className="tabular text-[15px] font-semibold">{formatPrice(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        {!buyNow && <Link href="/basket" className="text-[14px] underline">Edit basket</Link>}
        <dl className="tabular mt-2 space-y-2 border-t border-line pt-3 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
          {promo && (
            <div className="flex justify-between text-moss">
              <dt>Discount <span className="font-mono text-[13px]">{promo.code}</span></dt>
              <dd>−{formatPrice(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between"><dt>Delivery (mainland UK)</dt><dd>Free</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold"><dt>Total</dt><dd>{formatPrice(subtotal - discount)}</dd></div>
        </dl>

        <div className="mt-4 border-t border-line pt-4">
          {promo ? (
            <p className="flex items-center justify-between gap-2 text-[14px]">
              <span><span className="font-semibold">{promo.code}</span> applied: {promo.headline}</span>
              <button type="button" onClick={removePromo} className="underline">Remove</button>
            </p>
          ) : (
            <>
              <label htmlFor="promo" className="text-[14px] font-semibold">Promo code</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="promo"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 font-mono uppercase"
                />
                <button type="button" onClick={applyPromo} disabled={promoPending || !promoInput.trim()} className="rounded-lg border border-ink px-3 font-semibold disabled:opacity-50">
                  {promoPending ? "…" : "Apply"}
                </button>
              </div>
              {promoError && <p role="alert" className="mt-1.5 text-[14px] font-semibold text-danger">{promoError}</p>}
            </>
          )}
        </div>
        {error && <p role="alert" className="mt-4 text-[15px] font-semibold text-danger">{error}</p>}
        <button type="submit" disabled={pending} className="mt-4 w-full rounded-full bg-moss px-6 py-3.5 font-semibold text-white hover:bg-moss-deep disabled:opacity-60">
          {pending ? "Going to payment…" : "Continue to payment"}
        </button>
        <p className="mt-2 text-[13px] text-muted">You&rsquo;ll pay securely on Stripe. Prices and stock are checked again there.</p>
        <div className="mt-4">{paymentMethods}</div>
      </aside>
    </form>
  );
}
