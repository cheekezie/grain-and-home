"use client";

import { useState } from "react";
import EditorForm, { useNestedFieldError } from "./EditorForm";
import { CheckboxField, LinesField, Section, SelectField, TextField } from "./fields";
import { ImageField, type ImageValue } from "./editors";
import type { FormState } from "@/lib/admin/schemas";
import { STORE_PAGES } from "@/lib/shop/pages";
import { DEFAULT_THEME, FONT_PAIRS, FONT_PAIR_KEYS, FONT_VARS, type FontPair } from "@/lib/shop/theme";
import {
  DELIVERY_AREA_LABELS,
  DELIVERY_AREAS,
  DETAIL_KIND_LABELS,
  DETAIL_KINDS,
  GOOGLE_ATTRS,
  HERO_LAYOUT_LABELS,
  HERO_LAYOUTS,
  type DeliveryArea,
  type DetailKind,
  type HeroLayout,
  type ShopWords,
} from "@/lib/shop/types";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

type PageOption = { href: string; label: string; group: string };
export type LinkTargets = { categories: { name: string; slug: string }[]; products: { name: string; slug: string }[] };

const KINDS = [
  { value: "Categories", label: "A category", one: "category" },
  { value: "Pages", label: "A page", one: "page" },
  { value: "Products", label: "A product", one: "product" },
  { value: "Elsewhere", label: "Another website", one: "" },
] as const;
type LinkKind = (typeof KINDS)[number]["value"];

/** "Goes to", in two steps: what kind of place, then which one (only that kind is listed). */
function LinkPicker({ label, path, value, onChange, pages }: { label: string; path: string; value: string; onChange: (v: string) => void; pages: PageOption[] }) {
  const [kind, setKind] = useState<LinkKind>(() => (pages.find((p) => p.href === value)?.group as LinkKind | undefined) ?? (value ? "Elsewhere" : "Categories"));
  const choices = pages.filter((p) => p.group === kind);
  const one = KINDS.find((k) => k.value === kind)!.one;
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <SelectField
        label={label}
        path={`${path}.kind`}
        value={kind}
        onChange={(n) => {
          setKind(n as LinkKind);
          onChange("");
        }}
        options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
      />
      {kind === "Elsewhere" ? (
        <TextField label="Website address" path={path} value={value} onChange={onChange} mono placeholder="https://…" />
      ) : (
        <SelectField
          label={`Which ${one}`}
          path={path}
          value={value}
          onChange={onChange}
          options={[
            ...(choices.some((c) => c.href === value) ? [] : [{ value: "", label: choices.length ? `Choose a ${one}…` : `No ${one}s yet` }]),
            ...choices.map((c) => ({ value: c.href, label: c.label })),
          ]}
        />
      )}
    </div>
  );
}

const pageOptions = ({ categories, products }: LinkTargets): PageOption[] => [
  ...categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name, group: "Categories" })),
  ...STORE_PAGES.map((p) => ({ ...p, group: "Pages" })),
  ...products.map((p) => ({ href: `/products/${p.slug}`, label: p.name, group: "Products" })),
];

// ------------------------------------------------------------ general

export interface LinkValue {
  label: string;
  href: string;
}

export interface GeneralSettingsValue {
  tagline: string;
  seoTitle: string;
  hero: { layout: HeroLayout; headline: string; subline: string; image: ImageValue; primary: LinkValue; secondary: LinkValue };
  home: { tilesHeading: string; tilesNote: string; featuredHeading: string };
  trust: { items: { title: string; text: string }[]; klarnaReplacesLast: boolean };
  words: ShopWords;
  delivery: { area: DeliveryArea; twoPerson: boolean };
  google: { category: string; productTypeRoot: string };
  theme: { accent: string; page: string; panel: string; ink: string; fonts: FontPair };
}

const WORD_FIELDS: { key: keyof ShopWords; label: string; hint: string }[] = [
  { key: "item", label: "One product is called", hint: "e.g. piece, item, product: “1 piece”, “Tap the heart on any piece”" },
  { key: "items", label: "Several are called", hint: "e.g. pieces: “12 pieces”, “Offers and new pieces”" },
  { key: "categoryLabel", label: "One category is called", hint: "e.g. Room, Collection. Used in the admin and promo codes." },
  { key: "categoriesLabel", label: "Several are called", hint: "e.g. Rooms, Collections" },
  { key: "goods", label: "What customers order", hint: "e.g. furniture: “Your furniture is sent directly from…”" },
  { key: "browse", label: "Link back to the shop", hint: "On an empty basket or saved list, e.g. Browse furniture" },
  { key: "aboutItem", label: "Description heading on product pages", hint: "e.g. About this piece" },
  { key: "emptyCategory", label: "Message on an empty category", hint: "e.g. We’re adding pieces to this room. Check back soon." },
  { key: "newsletterHeading", label: "Email sign-up heading", hint: "Above the footer sign-up" },
  { key: "newsletterText", label: "Email sign-up text", hint: "Under the heading" },
];

export function GeneralSettingsEditor({ initial, action, targets }: { initial: GeneralSettingsValue; action: Action; targets: LinkTargets }) {
  const pages = pageOptions(targets);
  const [v, setV] = useState(initial);
  const set = <K extends keyof GeneralSettingsValue>(k: K, val: GeneralSettingsValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const hero = v.hero;
  const setHero = <K extends keyof GeneralSettingsValue["hero"]>(k: K, val: GeneralSettingsValue["hero"][K]) => set("hero", { ...hero, [k]: val });
  const trustError = useNestedFieldError("trust");

  return (
    <EditorForm action={action} payload={v}>
      <Section title="Shop" hint="The shop's name, address and business details are set per deployment (environment variables).">
        <TextField label="Tagline" path="tagline" value={v.tagline} onChange={(n) => set("tagline", n)} hint="One line about the shop: footer, Google and link previews." />
        <TextField label="Home page title" path="seoTitle" value={v.seoTitle} onChange={(n) => set("seoTitle", n)} hint={`In Google and the browser tab after the shop name, e.g. “furniture delivered across mainland UK”.`} />
      </Section>

      <Section title="Look" hint="Colours and fonts for the whole shop. Leave a colour empty for the built-in one. Colours that would make text hard to read are refused.">
        <div className="grid gap-5 sm:grid-cols-2">
          <ColourField label="Accent (buttons and links)" path="theme.accent" value={v.theme.accent} fallback={DEFAULT_THEME.accent} onChange={(n) => set("theme", { ...v.theme, accent: n })} />
          <ColourField label="Text" path="theme.ink" value={v.theme.ink} fallback={DEFAULT_THEME.ink} onChange={(n) => set("theme", { ...v.theme, ink: n })} />
          <ColourField label="Page background" path="theme.page" value={v.theme.page} fallback={DEFAULT_THEME.page} onChange={(n) => set("theme", { ...v.theme, page: n })} />
          <ColourField label="Panels (behind photos, bands)" path="theme.panel" value={v.theme.panel} fallback={DEFAULT_THEME.panel} onChange={(n) => set("theme", { ...v.theme, panel: n })} />
        </div>
        <fieldset>
          <legend className="font-semibold">Fonts</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {FONT_PAIR_KEYS.map((k) => (
              <label key={k} className={`cursor-pointer rounded-xl border p-4 ${v.theme.fonts === k ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink"}`}>
                <input type="radio" name="font-pair" value={k} checked={v.theme.fonts === k} onChange={() => set("theme", { ...v.theme, fonts: k })} className="sr-only" />
                <span className="block text-2xl" style={{ fontFamily: `${FONT_VARS[k].display}, serif` }}>{FONT_PAIRS[k].label}</span>
                <span className="mt-1 block text-[14px] text-muted" style={{ fontFamily: `${FONT_VARS[k].body}, sans-serif` }}>{FONT_PAIRS[k].description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <ThemePreview theme={v.theme} />
      </Section>

      <Section title="Home page hero" hint="The first thing visitors see. The headline is the page's main heading for search engines.">
        <SelectField
          label="Layout"
          path="hero.layout"
          value={hero.layout}
          onChange={(n) => setHero("layout", n as HeroLayout)}
          options={HERO_LAYOUTS.map((l) => ({ value: l, label: HERO_LAYOUT_LABELS[l] }))}
        />
        <TextField label="Headline" path="hero.headline" value={hero.headline} onChange={(n) => setHero("headline", n)} />
        <TextField label="Line under the headline (optional)" path="hero.subline" value={hero.subline} onChange={(n) => setHero("subline", n)} multiline rows={2} />
        {hero.layout !== "text" && (
          <ImageField path="hero.image" value={hero.image} onChange={(i) => setHero("image", i)} hint="https://… A wide, high-quality photo (at least 2000px wide for the full-width layout)." />
        )}
        <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
          <TextField label="Main button text" path="hero.primary.label" value={hero.primary.label} onChange={(n) => setHero("primary", { ...hero.primary, label: n })} />
          <LinkPicker label="Main button goes to" path="hero.primary.href" value={hero.primary.href} onChange={(n) => setHero("primary", { ...hero.primary, href: n })} pages={pages} />
          <TextField label="Second button text (optional)" path="hero.secondary.label" value={hero.secondary.label} onChange={(n) => setHero("secondary", { ...hero.secondary, label: n })} />
          <LinkPicker label="Second button goes to" path="hero.secondary.href" value={hero.secondary.href} onChange={(n) => setHero("secondary", { ...hero.secondary, href: n })} pages={pages} />
        </div>
      </Section>

      <Section title="Promises under the hero" hint="Up to four short reasons to buy. Only promises that are true for every order.">
        {v.trust.items.map((t, i) => (
          <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <TextField label={`Point ${i + 1}`} path={`trust.items.${i}.title`} value={t.title} onChange={(n) => set("trust", { ...v.trust, items: v.trust.items.map((x, j) => (j === i ? { ...x, title: n } : x)) })} />
            <TextField label="Detail" path={`trust.items.${i}.text`} value={t.text} onChange={(n) => set("trust", { ...v.trust, items: v.trust.items.map((x, j) => (j === i ? { ...x, text: n } : x)) })} />
            <button type="button" onClick={() => set("trust", { ...v.trust, items: v.trust.items.filter((_, j) => j !== i) })} className="mb-3 text-[14px] font-semibold text-danger underline">
              Remove
            </button>
          </div>
        ))}
        {v.trust.items.length < 4 && (
          <button type="button" onClick={() => set("trust", { ...v.trust, items: [...v.trust.items, { title: "", text: "" }] })} className="font-semibold underline">
            Add a point
          </button>
        )}
        {trustError && <p className="text-[14px] font-semibold text-danger">{trustError}</p>}
        <CheckboxField
          label="Show “Pay later with Klarna” in place of the last point when Stripe offers Klarna"
          checked={v.trust.klarnaReplacesLast}
          onChange={(n) => set("trust", { ...v.trust, klarnaReplacesLast: n })}
        />
      </Section>

      <Section title="Home page sections">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Category tiles heading" path="home.tilesHeading" value={v.home.tilesHeading} onChange={(n) => set("home", { ...v.home, tilesHeading: n })} hint="e.g. Shop by room. Also the name of the /shop page." />
          <TextField label="Featured products heading" path="home.featuredHeading" value={v.home.featuredHeading} onChange={(n) => set("home", { ...v.home, featuredHeading: n })} />
        </div>
        <TextField label="Small print under the tiles (optional)" path="home.tilesNote" value={v.home.tilesNote} onChange={(n) => set("home", { ...v.home, tilesNote: n })} hint="e.g. a photo credit: Room photos from Unsplash" />
      </Section>

      <Section title="Wording" hint="The words the shop uses for what it sells.">
        <div className="grid gap-5 sm:grid-cols-2">
          {WORD_FIELDS.map((f) => (
            <TextField key={f.key} label={f.label} path={`words.${f.key}`} value={v.words[f.key]} onChange={(n) => set("words", { ...v.words, [f.key]: n })} hint={f.hint} />
          ))}
        </div>
      </Section>

      <Section title="Delivery" hint="Checked at checkout against the postcode, and stated on the product, delivery and terms pages.">
        <SelectField
          label="Where you deliver"
          path="delivery.area"
          value={v.delivery.area}
          onChange={(n) => set("delivery", { ...v.delivery, area: n as DeliveryArea })}
          options={DELIVERY_AREAS.map((a) => ({ value: a, label: DELIVERY_AREA_LABELS[a] }))}
        />
        <CheckboxField
          label="Large, heavy items"
          checked={v.delivery.twoPerson}
          onChange={(n) => set("delivery", { ...v.delivery, twoPerson: n })}
          hint="Furniture and similar: offers two-person delivery on products, and the returns pages say items are collected rather than posted."
        />
      </Section>

      <Section title="Google Shopping" hint="Used in the product feed (/feed/google.xml) and product data for search engines.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Google product category" path="google.category" value={v.google.category} onChange={(n) => set("google", { ...v.google, category: n })} hint="An ID from Google's product taxonomy (e.g. 436 for Furniture) or its full path." mono />
          <TextField label="Product type starts with" path="google.productTypeRoot" value={v.google.productTypeRoot} onChange={(n) => set("google", { ...v.google, productTypeRoot: n })} hint="e.g. Furniture → “Furniture > Dining”" />
        </div>
      </Section>
    </EditorForm>
  );
}

function ColourField({ label, path, value, fallback, onChange }: { label: string; path: string; value: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-end gap-2">
      <input
        type="color"
        aria-label={`${label}: pick`}
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : fallback}
        onChange={(e) => onChange(e.target.value)}
        className="mb-1 h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1"
      />
      <div className="min-w-0 flex-1">
        <TextField label={label} path={path} value={value} onChange={onChange} mono placeholder={`${fallback} (built-in)`} />
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} className="mb-3 text-[14px] font-semibold underline">
          Reset
        </button>
      )}
    </div>
  );
}

/** A small sample of the shop in the chosen colours and fonts. */
function ThemePreview({ theme }: { theme: GeneralSettingsValue["theme"] }) {
  const t = { accent: theme.accent || DEFAULT_THEME.accent, page: theme.page || DEFAULT_THEME.page, panel: theme.panel || DEFAULT_THEME.panel, ink: theme.ink || DEFAULT_THEME.ink };
  const f = FONT_VARS[theme.fonts];
  return (
    <div className="overflow-hidden rounded-xl border border-line" style={{ background: t.page, color: t.ink, fontFamily: `${f.body}, sans-serif` }} aria-label="Preview">
      <div className="p-5">
        <p className="text-[13px]" style={{ color: `color-mix(in oklab, ${t.ink} 64%, ${t.page})` }}>Preview</p>
        <p className="mt-1 text-3xl" style={{ fontFamily: `${f.display}, serif` }}>A headline in your shop</p>
        <p className="mt-2 text-[15px]">Body text looks like this, with <span style={{ color: t.accent, textDecoration: "underline" }}>a link</span>.</p>
        <span className="mt-4 inline-block rounded-full px-6 py-2.5 font-semibold text-white" style={{ background: t.accent }}>Add to basket</span>
      </div>
      <div className="px-5 py-3 text-[14px]" style={{ background: t.panel }}>A panel, like the band under the hero.</div>
    </div>
  );
}

// ------------------------------------------------------------ navigation

export interface NavValue {
  mode: "auto" | "custom";
  items: (LinkValue & { children: LinkValue[] })[];
}

export function NavEditor({ initial, action, targets }: { initial: NavValue; action: Action; targets: LinkTargets }) {
  const { categories } = targets;
  const [v, setV] = useState(initial);
  const pages = pageOptions(targets);
  const setItems = (items: NavValue["items"]) => setV((p) => ({ ...p, items }));
  const setItem = (i: number, patch: Partial<NavValue["items"][number]>) => setItems(v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const next = [...v.items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setItems(next);
  };
  const fromCategories = () => setItems(categories.map((c) => ({ label: c.name, href: `/shop/${c.slug}`, children: [] })));

  return (
    <EditorForm action={action} payload={v}>
      <Section title="Navigation" hint="The links across the top of every page. Dropdowns open on hover and keyboard focus; on phones every link is in one scrolling row.">
        <SelectField
          label="What's in the nav"
          path="mode"
          value={v.mode}
          onChange={(n) => setV((p) => ({ ...p, mode: n as NavValue["mode"] }))}
          options={[
            { value: "auto", label: "The categories, in their order (updates itself)" },
            { value: "custom", label: "My own list" },
          ]}
        />
        {v.mode === "custom" && (
          <>
            {v.items.length === 0 && (
              <p className="text-[15px] text-muted">
                No links yet.{" "}
                <button type="button" onClick={fromCategories} className="font-semibold text-ink underline">Start from the categories</button>
              </p>
            )}
            <ol className="space-y-4">
              {v.items.map((item, i) => (
                <li key={i} className="rounded-xl border border-line p-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                    <TextField label={`Link ${i + 1}`} path={`items.${i}.label`} value={item.label} onChange={(n) => setItem(i, { label: n })} />
                    <LinkPicker
                      label="Goes to"
                      path={`items.${i}.href`}
                      value={item.href}
                      pages={pages}
                      onChange={(n) => {
                        // Picking a category fills in its name if the label is still empty.
                        const picked = pages.find((p) => p.href === n && p.group !== "Pages");
                        setItem(i, { href: n, ...(picked && !item.label ? { label: picked.label } : {}) });
                      }}
                    />
                  </div>
                  {item.children.length > 0 && (
                    <ul className="mt-4 space-y-3 border-l-2 border-line pl-4">
                      {item.children.map((c, k) => (
                        <li key={k} className="grid items-start gap-3 sm:grid-cols-[1fr_2fr_auto]">
                          <TextField label={`Dropdown link ${k + 1}`} path={`items.${i}.children.${k}.label`} value={c.label} onChange={(n) => setItem(i, { children: item.children.map((x, m) => (m === k ? { ...x, label: n } : x)) })} />
                          <LinkPicker
                            label="Goes to"
                            path={`items.${i}.children.${k}.href`}
                            value={c.href}
                            pages={pages}
                            onChange={(n) => {
                              const picked = pages.find((p) => p.href === n && p.group !== "Pages");
                              setItem(i, { children: item.children.map((x, m) => (m === k ? { ...x, href: n, ...(picked && !x.label ? { label: picked.label } : {}) } : x)) });
                            }}
                          />
                          <button type="button" onClick={() => setItem(i, { children: item.children.filter((_, m) => m !== k) })} className="mt-9 text-[14px] font-semibold text-danger underline">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-[14px] font-semibold">
                    <button type="button" onClick={() => setItem(i, { children: [...item.children, { label: "", href: "" }] })} className="underline">Add a dropdown link</button>
                    {i > 0 && <button type="button" onClick={() => move(i, -1)} className="underline">Move up</button>}
                    {i < v.items.length - 1 && <button type="button" onClick={() => move(i, 1)} className="underline">Move down</button>}
                    <button type="button" onClick={() => setItems(v.items.filter((_, j) => j !== i))} className="text-danger underline">Remove</button>
                  </div>
                </li>
              ))}
            </ol>
            {v.items.length < 10 && (
              <button type="button" onClick={() => setItems([...v.items, { label: "", href: "", children: [] }])} className="font-semibold underline">
                Add a link
              </button>
            )}
          </>
        )}
      </Section>
    </EditorForm>
  );
}

// ------------------------------------------------------------ product details

export interface DetailFieldValue {
  key: string;
  label: string;
  kind: DetailKind;
  unit: string;
  options: string[];
  required: boolean;
  filterable: boolean;
  google: string;
}

const GOOGLE_LABELS: Record<string, string> = {
  "": "Not used",
  material: "Material",
  color: "Colour",
  size: "Size",
  weight: "Weight",
  dimensions: "Dimensions",
  gender: "Gender (Men / Women / Unisex)",
  age_group: "Age group (Adult / Kids…)",
  pattern: "Pattern",
};

const toKey = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("")
    .slice(0, 40);

export function DetailFieldsEditor({ initial, action, usedKeys }: { initial: DetailFieldValue[]; action: Action; usedKeys: string[] }) {
  const [fields, setFields] = useState(initial);
  const [locked] = useState(() => new Set(initial.map((f) => f.key)));
  const setField = (i: number, patch: Partial<DetailFieldValue>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) => {
    const next = [...fields];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setFields(next);
  };

  return (
    <EditorForm action={action} payload={{ fields }}>
      <Section
        title="Product details"
        hint="The details every product in this shop can have, in the order they're shown. Short ones appear in a table beside the price; long ones get their own section on the product page."
      >
        <ol className="space-y-4">
          {fields.map((f, i) => (
            <li key={i} className="rounded-xl border border-line p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={`Detail ${i + 1}`}
                  path={`fields.${i}.label`}
                  value={f.label}
                  onChange={(n) => setField(i, { label: n, ...(locked.has(f.key) ? {} : { key: toKey(n) }) })}
                  hint={locked.has(f.key) ? `Stored as “${f.key}”${usedKeys.includes(f.key) ? ", used by products" : ""}.` : f.key ? `Will be stored as “${f.key}”.` : undefined}
                />
                <SelectField
                  label="Kind"
                  path={`fields.${i}.kind`}
                  value={f.kind}
                  onChange={(n) => setField(i, { kind: n as DetailKind })}
                  options={DETAIL_KINDS.map((k) => ({ value: k, label: DETAIL_KIND_LABELS[k] }))}
                />
                {f.kind === "number" && <TextField label="Unit (optional)" path={`fields.${i}.unit`} value={f.unit} onChange={(n) => setField(i, { unit: n })} hint="e.g. kg, ml" />}
                <SelectField
                  label="Also sent to Google as"
                  path={`fields.${i}.google`}
                  value={f.google}
                  onChange={(n) => setField(i, { google: n })}
                  options={["", ...GOOGLE_ATTRS].map((g) => ({ value: g, label: GOOGLE_LABELS[g] ?? g }))}
                />
              </div>
              {f.kind === "select" && (
                <div className="mt-4">
                  <LinesField label="Choices" path={`fields.${i}.options`} value={f.options} onChange={(o) => setField(i, { options: o })} hint="One per line, exactly as shown on the product page." />
                </div>
              )}
              <div className="mt-4 space-y-3">
                <CheckboxField label="Needed before a product can be published" checked={f.required} onChange={(n) => setField(i, { required: n })} />
                {(f.kind === "select" || f.kind === "text") && (
                  <CheckboxField label="Shoppers can filter by it on category pages" checked={f.filterable} onChange={(n) => setField(i, { filterable: n })} />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[14px] font-semibold">
                {i > 0 && <button type="button" onClick={() => move(i, -1)} className="underline">Move up</button>}
                {i < fields.length - 1 && <button type="button" onClick={() => move(i, 1)} className="underline">Move down</button>}
                <button type="button" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="text-danger underline">Remove</button>
              </div>
            </li>
          ))}
        </ol>
        {fields.length < 20 && (
          <button
            type="button"
            onClick={() => setFields([...fields, { key: "", label: "", kind: "text", unit: "", options: [], required: false, filterable: false, google: "" }])}
            className="font-semibold underline"
          >
            Add a detail
          </button>
        )}
        <p className="text-[14px] text-muted">
          Removing a detail hides it everywhere but keeps what products already have: add it back with the same name to bring the values back.
        </p>
      </Section>
    </EditorForm>
  );
}
