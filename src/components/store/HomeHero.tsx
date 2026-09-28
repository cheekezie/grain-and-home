import Link from "next/link";
import { imageSrcSet, sizedImage } from "@/lib/shop/images";
import type { HeroSettings, ShopCategory, ShopImage, ShopLink, ShopSettings } from "@/lib/shop/types";

// Home page top, in the layout chosen in Admin → Shop settings. Every
// layout renders the headline as the page's one <h1> in real text, and
// loads its photo first at the right size: the two things search engines
// and page speed care about most. Chosen on the server, so only one
// layout's markup is ever sent.

/** Trust promises. Klarna only when Stripe actually offers it. */
export function TrustStrip({ trust, klarna, tone = "plain" }: { trust: ShopSettings["trust"]; klarna: boolean; tone?: "plain" | "band" }) {
  const items = [...trust.items];
  if (klarna && trust.klarnaReplacesLast && items.length) items[items.length - 1] = { title: "Pay later with Klarna", text: "At checkout, if eligible" };
  if (!items.length) return null;
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

function Credit({ image, className }: { image: ShopImage; className: string }) {
  if (!image.credit) return null;
  return image.creditUrl ? (
    <a href={image.creditUrl} target="_blank" rel="noopener" className={`${className} hover:underline`}>Photo: {image.credit}</a>
  ) : (
    <span className={className}>Photo: {image.credit}</span>
  );
}

function HeroPhoto({ image, sizes, className }: { image: ShopImage; sizes: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sizedImage(image.url, 2000)}
      srcSet={imageSrcSet(image.url, [900, 1400, 2000])}
      sizes={sizes}
      alt={image.alt}
      fetchPriority="high"
      className={className}
    />
  );
}

function Buttons({ primary, secondary, tone }: { primary?: ShopLink; secondary?: ShopLink; tone: "light" | "dark" }) {
  if (!primary && !secondary) return null;
  const solid = tone === "light" ? "bg-white text-ink hover:bg-plaster" : "bg-ink text-white hover:bg-ink/85";
  const outline = tone === "light" ? "border-white/60 text-white hover:bg-white/10" : "border-ink/30 text-ink hover:bg-plaster";
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      {primary && <Link href={primary.href} className={`rounded-full px-7 py-3.5 font-semibold ${solid}`}>{primary.label}</Link>}
      {secondary && <Link href={secondary.href} className={`rounded-full border px-7 py-3.5 font-semibold ${outline}`}>{secondary.label}</Link>}
    </div>
  );
}

/** Full-bleed photo with the headline low on the left (Loaf, Castlery). */
function PhotoHero({ hero, image }: { hero: HeroSettings; image: ShopImage }) {
  return (
    <div className="relative isolate flex min-h-[min(78vh,760px)] items-end overflow-hidden bg-ink">
      <HeroPhoto image={image} sizes="100vw" className="absolute inset-0 -z-10 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/70 via-ink/35 to-transparent" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/50 to-transparent to-50%" />
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-40 text-white sm:px-6 sm:pb-16">
        <h1 className="max-w-2xl font-display text-[clamp(2.6rem,6.5vw,5rem)] leading-[1.02]">{hero.headline}</h1>
        {hero.subline && <p className="mt-4 max-w-lg text-lg text-white/85">{hero.subline}</p>}
        <Buttons primary={hero.primary} secondary={hero.secondary} tone="light" />
        <Credit image={image} className="mt-8 inline-block text-[11px] text-white/70" />
      </div>
    </div>
  );
}

/**
 * Full-bleed photo with the words in a solid panel: readable over any photo,
 * busy or bright, with no gradient needed. On phones the panel sits below
 * the photo instead of covering it.
 */
function PanelHero({ hero, image }: { hero: HeroSettings; image: ShopImage }) {
  return (
    <div className="relative isolate bg-plaster md:flex md:min-h-[min(72vh,700px)] md:items-end">
      <div className="relative aspect-[4/3] md:absolute md:inset-0 md:-z-10 md:aspect-auto">
        <HeroPhoto image={image} sizes="100vw" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="mx-auto w-full max-w-7xl md:px-6 md:pb-12">
        <div className="bg-page px-4 py-8 sm:px-6 md:max-w-xl md:rounded-2xl md:p-10 md:shadow-lift">
          <h1 className="font-display text-[clamp(2.3rem,5vw,3.75rem)] leading-[1.05]">{hero.headline}</h1>
          {hero.subline && <p className="mt-3 text-lg text-muted">{hero.subline}</p>}
          <Buttons primary={hero.primary} secondary={hero.secondary} tone="dark" />
          <Credit image={image} className="mt-6 inline-block text-[11px] text-muted" />
        </div>
      </div>
    </div>
  );
}

/** Headline on the left, photo on the right; stacked on phones. */
function SplitHero({ hero, image }: { hero: HeroSettings; image: ShopImage }) {
  return (
    <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-8 sm:px-6 md:grid-cols-2 md:gap-14 md:pt-12">
      <div className="order-2 md:order-1">
        <h1 className="font-display text-[clamp(2.4rem,5.5vw,4.25rem)] leading-[1.04]">{hero.headline}</h1>
        {hero.subline && <p className="mt-4 max-w-lg text-lg text-muted">{hero.subline}</p>}
        <Buttons primary={hero.primary} secondary={hero.secondary} tone="dark" />
      </div>
      <div className="order-1 md:order-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-plaster md:aspect-[4/5]">
          <HeroPhoto image={image} sizes="(min-width: 768px) 50vw, 100vw" className="absolute inset-0 size-full object-cover" />
        </div>
        <Credit image={image} className="mt-2 inline-block text-[11px] text-muted" />
      </div>
    </div>
  );
}

/** Just the words: for a shop without its own photography yet. */
function TextHero({ hero }: { hero: HeroSettings }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 md:pt-24">
      <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6.5vw,5rem)] leading-[1.02]">{hero.headline}</h1>
      {hero.subline && <p className="mt-4 max-w-xl text-lg text-muted">{hero.subline}</p>}
      <Buttons primary={hero.primary} secondary={hero.secondary} tone="dark" />
    </div>
  );
}

export function Hero({ hero, trust, klarna }: { hero: HeroSettings; trust: ShopSettings["trust"]; klarna: boolean }) {
  const image = hero.image?.url ? hero.image : undefined;
  return (
    <section>
      {hero.layout === "photo" && image ? (
        <PhotoHero hero={hero} image={image} />
      ) : hero.layout === "panel" && image ? (
        <PanelHero hero={hero} image={image} />
      ) : hero.layout === "split" && image ? (
        <SplitHero hero={hero} image={image} />
      ) : (
        <TextHero hero={hero} />
      )}
      <div className="border-b border-line bg-plaster"><TrustStrip trust={trust} klarna={klarna} tone="band" /></div>
    </section>
  );
}

/** Category tiles. Without a photo a tile shows the category's short line instead. */
export function CategoryTiles({ categories, counts, heading, note, words, headingLevel = "h2" }: {
  headingLevel?: "h1" | "h2";
  categories: ShopCategory[];
  counts: Record<string, number>;
  heading: string;
  note: string;
  words: { item: string; items: string };
}) {
  if (!categories.length) return null;
  const Heading = headingLevel;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <Heading className="font-display text-3xl">{heading}</Heading>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
        {categories.map((c) => {
          const n = counts[c.slug] ?? 0;
          return (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}`} className="group block">
                <span className="block overflow-hidden rounded-2xl bg-plaster">
                  {c.image ? (
                    // Cut-outs sit whole on the panel colour (their white background
                    // blends into it); photos that fill the frame cover the tile.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sizedImage(c.image.url, 700)}
                      alt=""
                      className={`aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none ${
                        c.image.cutout ? "object-contain p-6 mix-blend-multiply" : "object-cover"
                      }`}
                    />
                  ) : (
                    <span className="flex aspect-[4/3] items-end p-5 text-[15px] text-muted">{c.blurb}</span>
                  )}
                </span>
                <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-display text-xl group-hover:text-moss">{c.name}</span>
                  <span className="tabular text-[14px] text-muted">{n ? `${n} ${n > 1 ? words.items : words.item}` : "Coming soon"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {note && <p className="mt-4 text-right text-[11px] text-muted">{note}</p>}
    </section>
  );
}
