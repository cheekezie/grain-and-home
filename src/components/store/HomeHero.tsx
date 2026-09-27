import Link from "next/link";
import { CATEGORIES } from "@/lib/catalogue";
import { HERO_PHOTO, ROOM_PHOTOS, unsplash } from "@/lib/roomPhotos";

// Home page top: a full-bleed room photo with one headline (Loaf/Castlery
// pattern, chosen by the owner 2026-09-26), the reasons to trust us right
// under it, then photo tiles for every room.

/** Trust promises. Klarna only when Stripe actually offers it. */
export function TrustStrip({ klarna, tone = "plain" }: { klarna: boolean; tone?: "plain" | "band" }) {
  const items = [
    { title: "Free delivery", text: "To mainland UK addresses" },
    { title: "14 days to change your mind", text: "From the day it arrives" },
    klarna ? { title: "Pay later with Klarna", text: "At checkout, if eligible" } : { title: "Secure checkout", text: "Payments by Stripe" },
  ];
  return (
    <ul className={`grid gap-x-8 gap-y-3 sm:grid-cols-3 ${tone === "band" ? "mx-auto max-w-7xl px-4 py-5 sm:px-6" : ""}`}>
      {items.map((i) => (
        <li key={i.title} className="flex items-baseline gap-2.5 text-[15px]">
          <span aria-hidden className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-moss" />
          <span><span className="font-semibold">{i.title}</span> <span className="text-muted">{i.text}</span></span>
        </li>
      ))}
    </ul>
  );
}

/** Full-bleed room photo with the headline low on the left (Loaf, Castlery). */
export function HeroRoom({ klarna }: { klarna: boolean }) {
  const photo = HERO_PHOTO;
  return (
    <section>
      <div className="relative isolate flex min-h-[min(78vh,760px)] items-end overflow-hidden bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={unsplash(photo.src, 2000)}
          srcSet={[900, 1400, 2000].map((w) => `${unsplash(photo.src, w)} ${w}w`).join(", ")}
          sizes="100vw"
          alt={photo.alt}
          fetchPriority="high"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/70 via-ink/35 to-transparent" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/50 to-transparent to-50%" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-40 text-white sm:px-6 sm:pb-16">
          <h1 className="max-w-2xl font-display text-[clamp(2.6rem,6.5vw,5rem)] leading-[1.02]">Solid wood furniture, made for real rooms.</h1>
          <p className="mt-4 max-w-lg text-lg text-white/85">Bedside tables, sideboards, desks and more, delivered free across mainland UK.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/shop/living-room" className="rounded-full bg-white px-7 py-3.5 font-semibold text-ink hover:bg-plaster">Shop living room</Link>
            <Link href="/shop/bedroom" className="rounded-full border border-white/60 px-7 py-3.5 font-semibold text-white hover:bg-white/10">Shop bedroom</Link>
          </div>
          <a href={photo.page} target="_blank" rel="noopener" className="mt-8 inline-block text-[11px] text-white/70 hover:underline">
            Photo: {photo.credit} / Unsplash
          </a>
        </div>
      </div>
      <div className="border-b border-line bg-plaster"><TrustStrip klarna={klarna} tone="band" /></div>
    </section>
  );
}

/** Shop-by-room tiles, each with a room photo. */
export function RoomTiles({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <h2 className="font-display text-3xl">Shop by room</h2>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
        {CATEGORIES.map((c) => {
          const photo = ROOM_PHOTOS[c.slug];
          const n = counts[c.slug] ?? 0;
          return (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}`} className="group block">
                <span className="block overflow-hidden rounded-2xl bg-plaster">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unsplash(photo.src, 700)} alt="" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                </span>
                <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-display text-xl group-hover:text-moss">{c.name}</span>
                  <span className="tabular text-[14px] text-muted">{n ? `${n} piece${n > 1 ? "s" : ""}` : "Coming soon"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-right text-[11px] text-muted">Room photos from Unsplash</p>
    </section>
  );
}
