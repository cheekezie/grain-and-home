import { z } from "zod";
import { DELIVERY_AREAS, DETAIL_KINDS, GOOGLE_ATTRS, HERO_LAYOUTS } from "@/lib/shop/types";
import { CARD_STYLE_KEYS, DEFAULT_THEME, FONT_PAIR_KEYS, contrast, isHex } from "@/lib/shop/theme";

/** "" = the built-in colour. */
const colour = z
  .string()
  .trim()
  .toLowerCase()
  .refine((s) => s === "" || isHex(s), "Use a colour like #3e5c4a");

// Validation for Shop settings and categories (see schemas.ts for the rest).

const text = (label: string, max: number) => z.string().trim().min(1, `${label} can't be empty`).max(max, `${label} is too long`);
const optionalText = (max: number) => z.string().trim().max(max, "Too long").default("");

/** A page on this shop ("/shop/dining") or a full https:// address. */
const href = z
  .string()
  .trim()
  .refine((s) => /^\/[^\s]*$/.test(s) || /^https:\/\/[^\s]+$/.test(s), "Start with / for a page on this shop, or https:// for another site");

const link = z.object({ label: text("Label", 40), href });

/** Empty label and address = no button; half-filled is an error. */
const optionalLink = z
  .object({ label: z.string().trim().max(40), href: z.string().trim() })
  .superRefine((l, ctx) => {
    if (!l.label && !l.href) return;
    if (!l.label) ctx.addIssue({ code: "custom", path: ["label"], message: "Add the button text" });
    if (!href.safeParse(l.href).success) ctx.addIssue({ code: "custom", path: ["href"], message: "Start with / for a page on this shop, or https://" });
  })
  .transform((l) => (l.label && l.href ? l : undefined));

/** Photo: empty URL = none. */
export const imageInput = z
  .object({
    url: z.string().trim(),
    alt: z.string().trim().max(200),
    credit: z.string().trim().max(120).default(""),
    creditUrl: z.string().trim().default(""),
    cutout: z.boolean().default(false),
  })
  .superRefine((i, ctx) => {
    if (!i.url) return;
    if (!/^https:\/\/\S+$/.test(i.url)) ctx.addIssue({ code: "custom", path: ["url"], message: "Photo links must start with https://" });
    if (!i.alt) ctx.addIssue({ code: "custom", path: ["alt"], message: "Describe the photo for people who can't see it" });
    if (i.creditUrl && !/^https:\/\/\S+$/.test(i.creditUrl)) ctx.addIssue({ code: "custom", path: ["creditUrl"], message: "Use a full https:// address" });
  })
  .transform((i) =>
    i.url ? { url: i.url, alt: i.alt, ...(i.credit && { credit: i.credit }), ...(i.creditUrl && { creditUrl: i.creditUrl }), ...(i.cutout && { cutout: true }) } : undefined,
  );

export const categorySchema = z.object({
  name: text("Name", 60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens, e.g. living-room"),
  blurb: optionalText(200),
  pageTitle: optionalText(70),
  intro: optionalText(300),
  metaDescription: z.string().trim().max(170, "Keep it under 170 characters; Google cuts off longer ones").default(""),
  guide: optionalText(20000),
  image: imageInput,
  sortOrder: z.coerce.number().int().min(0).max(999),
});

// ------------------------------------------------------------ settings

export const generalSettingsSchema = z
  .object({
    tagline: text("Tagline", 160),
    seoTitle: text("Home page title", 70),
    hero: z.object({
      layout: z.enum(HERO_LAYOUTS),
      headline: text("Headline", 90),
      subline: optionalText(200),
      image: imageInput,
      primary: optionalLink,
      secondary: optionalLink,
    }),
    home: z.object({
      tilesHeading: text("Category tiles heading", 60),
      tilesNote: optionalText(120),
      featuredHeading: text("Featured heading", 60),
    }),
    trust: z.object({
      items: z.array(z.object({ title: text("Point", 50), text: optionalText(80) })).max(4),
      klarnaReplacesLast: z.boolean(),
    }),
    words: z.object({
      item: text("One product", 30),
      items: text("Several products", 30),
      goods: text("What customers order", 30),
      browse: text("Browse link", 40),
      categoryLabel: text("One category", 30),
      categoriesLabel: text("Several categories", 30),
      aboutItem: text("Description heading", 60),
      emptyCategory: text("Empty category message", 160),
      newsletterHeading: text("Sign-up heading", 80),
      newsletterText: text("Sign-up text", 160),
    }),
    delivery: z.object({ area: z.enum(DELIVERY_AREAS), twoPerson: z.boolean() }),
    google: z.object({ category: optionalText(200), productTypeRoot: optionalText(60) }),
    theme: z.object({ accent: colour, page: colour, panel: colour, ink: colour, fonts: z.enum(FONT_PAIR_KEYS as [string, ...string[]]), cards: z.enum(CARD_STYLE_KEYS as [string, ...string[]]) }),
  })
  .superRefine((s, ctx) => {
    // Colours must stay readable (WCAG AA, 4.5:1): white text on buttons, text on the page.
    const t = { accent: s.theme.accent || DEFAULT_THEME.accent, page: s.theme.page || DEFAULT_THEME.page, ink: s.theme.ink || DEFAULT_THEME.ink, panel: s.theme.panel || DEFAULT_THEME.panel };
    if (contrast(t.accent, "#ffffff") < 4.5) ctx.addIssue({ code: "custom", path: ["theme", "accent"], message: "Too light: white button text wouldn't be readable on it. Choose a darker colour" });
    if (contrast(t.ink, t.page) < 4.5) ctx.addIssue({ code: "custom", path: ["theme", "ink"], message: "Text wouldn't be readable on the page background. Increase the difference" });
    if (contrast(t.ink, t.panel) < 4.5) ctx.addIssue({ code: "custom", path: ["theme", "panel"], message: "Text wouldn't be readable on this panel colour. Choose a lighter one" });
    if (contrast(t.accent, t.page) < 3) ctx.addIssue({ code: "custom", path: ["theme", "accent"], message: "Links in this colour wouldn't stand out from the page background" });
    if (s.hero.layout !== "text" && !s.hero.image) {
      ctx.addIssue({ code: "custom", path: ["hero", "image", "url"], message: "This layout needs a photo (or choose “Headline only”)" });
    }
  });

export const navSchema = z.object({
  mode: z.enum(["auto", "custom"]),
  items: z.array(link.extend({ children: z.array(link).max(12) })).max(10),
});

const detailKey = z
  .string()
  .trim()
  .regex(/^[a-z][a-zA-Z0-9]{0,39}$/, "Start with a lowercase letter; letters and numbers only, e.g. fabric or skinType");

export const detailFieldsSchema = z
  .object({
    fields: z
      .array(
        z.object({
          key: detailKey,
          label: text("Label", 40),
          kind: z.enum(DETAIL_KINDS),
          unit: optionalText(10),
          options: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
          required: z.boolean(),
          filterable: z.boolean().default(false),
          google: z.union([z.enum(GOOGLE_ATTRS), z.literal("")]),
        }),
      )
      .max(20),
  })
  .superRefine((d, ctx) => {
    const seen = new Set<string>();
    d.fields.forEach((f, i) => {
      if (seen.has(f.key)) ctx.addIssue({ code: "custom", path: ["fields", i, "key"], message: "Another detail already uses this key" });
      seen.add(f.key);
      if (f.kind === "select" && f.options.length < 2) ctx.addIssue({ code: "custom", path: ["fields", i, "options"], message: "Give at least two choices" });
      if (f.google === "dimensions" && f.kind !== "dimensions") ctx.addIssue({ code: "custom", path: ["fields", i, "google"], message: "Only a dimensions detail can fill Google's dimensions" });
      if (f.google === "weight" && f.kind !== "number") ctx.addIssue({ code: "custom", path: ["fields", i, "google"], message: "Weight must be a number detail (kg or g)" });
      if (f.google === "weight" && !["kg", "g"].includes(f.unit)) ctx.addIssue({ code: "custom", path: ["fields", i, "unit"], message: "Use kg or g for weight" });
    });
  })
  .transform((d) =>
    d.fields.map((f) => ({
      key: f.key,
      label: f.label,
      kind: f.kind,
      ...(f.kind === "number" && f.unit && { unit: f.unit }),
      ...(f.kind === "select" && { options: f.options }),
      ...(f.required && { required: true }),
      ...(f.filterable && (f.kind === "select" || f.kind === "text") && { filterable: true }),
      ...(f.google && { google: f.google }),
    })),
  );
