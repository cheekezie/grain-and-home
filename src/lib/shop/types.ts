// What makes one shop different from another: wording, hero, nav, delivery
// area and the details its products have. Stored in the database (Admin →
// Shop settings) so the same code runs furniture, clothing, beauty or any
// other shop. Plain types only: safe to import from client components.

export interface ShopImage {
  url: string;
  alt: string;
  /** Shown as "Photo: <credit>" when set. */
  credit?: string;
  creditUrl?: string;
  /** A cut-out (plain or white background): shown whole on the panel colour instead of filling its frame. */
  cutout?: boolean;
}

export interface ShopLink {
  label: string;
  href: string;
}

export const HERO_LAYOUTS = ["photo", "panel", "split", "text"] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];
export const HERO_LAYOUT_LABELS: Record<HeroLayout, string> = {
  photo: "Full-width photo, headline over it",
  panel: "Full-width photo, headline in a panel (readable on any photo)",
  split: "Headline beside a photo",
  text: "Headline only, no photo",
};

export interface HeroSettings {
  layout: HeroLayout;
  headline: string;
  subline: string;
  image?: ShopImage;
  primary?: ShopLink;
  secondary?: ShopLink;
}

export interface NavItem extends ShopLink {
  /** Shown as a dropdown on desktop. */
  children: ShopLink[];
}

export const DETAIL_KINDS = ["text", "longtext", "number", "select", "dimensions"] as const;
export type DetailKind = (typeof DETAIL_KINDS)[number];
export const DETAIL_KIND_LABELS: Record<DetailKind, string> = {
  text: "Short text",
  longtext: "Long text",
  number: "Number",
  select: "Choice from a list",
  dimensions: "Dimensions (W × D × H)",
};

/** Google Shopping attributes a detail can fill in the product feed and structured data. */
export const GOOGLE_ATTRS = ["material", "color", "size", "weight", "dimensions", "gender", "age_group", "pattern"] as const;
export type GoogleAttr = (typeof GOOGLE_ATTRS)[number];

export interface DetailField {
  /** Stored on each product under this key. Never change it once products use it. */
  key: string;
  label: string;
  kind: DetailKind;
  /** e.g. "kg", "ml". Dimensions are always cm. */
  unit?: string;
  /** For "select". */
  options?: string[];
  /** Needed before a product can be published. */
  required?: boolean;
  /** Offered as a filter on category pages (short text and choice details). */
  filterable?: boolean;
  google?: GoogleAttr;
}

export type Dimensions = { w?: number; d?: number; h?: number };
export type DetailValue = string | number | Dimensions;

export const DELIVERY_AREAS = ["mainland", "uk"] as const;
export type DeliveryArea = (typeof DELIVERY_AREAS)[number];
export const DELIVERY_AREA_LABELS: Record<DeliveryArea, string> = {
  mainland: "Mainland UK only (no Highlands and islands, Northern Ireland or offshore)",
  uk: "The whole UK, including Northern Ireland (not the Channel Islands or Isle of Man)",
};
/** For sentences: "Free delivery to mainland UK addresses". */
export const deliveryAreaText = (a: DeliveryArea) => (a === "mainland" ? "mainland UK" : "UK");
/** On its own: "We deliver to mainland UK" / "We deliver to the UK". */
export const deliveryAreaName = (a: DeliveryArea) => (a === "mainland" ? "mainland UK" : "the UK");

export interface ShopWords {
  /** What one product is called: piece, item, product. */
  item: string;
  items: string;
  /** "Your furniture is sent directly from…" */
  goods: string;
  /** Link to the shop from empty pages: "Browse furniture". */
  browse: string;
  /** Admin and promo labels: Room / Rooms, Collection / Collections. */
  categoryLabel: string;
  categoriesLabel: string;
  aboutItem: string;
  emptyCategory: string;
  newsletterHeading: string;
  newsletterText: string;
}

export interface ShopSettings {
  preset: string;
  /** Colours and fonts; empty = the built-in look. */
  theme?: import("./theme").ShopTheme;
  tagline: string;
  /** Home page title after the shop name: "Grain & Home: <this>". */
  seoTitle: string;
  hero: HeroSettings;
  home: {
    tilesHeading: string;
    /** Small print under the category tiles, e.g. a photo credit. */
    tilesNote: string;
    featuredHeading: string;
  };
  trust: {
    items: { title: string; text: string }[];
    /** Swap the last point for "Pay later with Klarna" when Stripe offers Klarna. */
    klarnaReplacesLast: boolean;
  };
  words: ShopWords;
  delivery: {
    area: DeliveryArea;
    /**
     * Large, heavy items (furniture): offers two-person delivery, and the
     * returns wording says items are collected rather than posted.
     */
    twoPerson: boolean;
  };
  nav: {
    /** auto: the categories, in order. custom: the items below. */
    mode: "auto" | "custom";
    items: NavItem[];
  };
  details: DetailField[];
  google: {
    /** Google product category: an ID ("436") or the full path. */
    category: string;
    /** First part of product_type, e.g. "Furniture" → "Furniture > Dining". */
    productTypeRoot: string;
  };
}

export interface ShopCategory {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  /** Browser tab and Google title; empty uses the name. */
  pageTitle: string;
  intro: string;
  metaDescription: string;
  guide: string;
  image?: ShopImage;
  sortOrder: number;
}

/** The part client components need (basket, checkout, pop-ups). */
export interface ShopClientWords {
  item: string;
  items: string;
  browse: string;
  deliveryArea: DeliveryArea;
}
