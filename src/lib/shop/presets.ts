import type { ShopCategory, ShopSettings } from "./types";

// Starting points for a new shop. A preset fills in categories, wording,
// hero, nav and product details once; after that everything is edited in
// Admin → Shop settings. Adding a shop type means adding a preset here.
//
// Presets carry no invented photos: only the furniture one has images
// (Unsplash, free licence, used by Grain & Home). The others start with the
// text-only hero until the owner adds real photography.

export type PresetCategory = Omit<ShopCategory, "id">;
export interface Preset {
  label: string;
  description: string;
  settings: ShopSettings;
  categories: PresetCategory[];
}

const unsplashPhoto = (id: string, photo: string, alt: string, credit: string) => ({
  url: `https://images.unsplash.com/${photo}`,
  alt,
  credit: `${credit} / Unsplash`,
  creditUrl: `https://unsplash.com/photos/${id}`,
});

const cat = (slug: string, name: string, blurb: string, sortOrder: number, extra: Partial<PresetCategory> = {}): PresetCategory => ({
  slug,
  name,
  blurb,
  pageTitle: "",
  intro: "",
  metaDescription: "",
  guide: "",
  sortOrder,
  ...extra,
});

const standardTrust = (area: string) => ({
  items: [
    { title: "Free delivery", text: `To ${area} addresses` },
    { title: "14 days to change your mind", text: "From the day it arrives" },
    { title: "Secure checkout", text: "Payments by Stripe" },
  ],
  klarnaReplacesLast: true,
});

// ------------------------------------------------------------ furniture (Grain & Home)

const livingRoomPhoto = unsplashPhoto(
  "Kh4tedFdHz4",
  "photo-1631510390389-c1e4fb20ff31",
  "A bright living room with a light wood sideboard, a round coffee table and armchairs by the window",
  "Spacejoy",
);

const furniture: Preset = {
  label: "Furniture",
  description: "Rooms as categories, dimensions and assembly on products, two-person delivery, mainland UK.",
  settings: {
    preset: "furniture",
    tagline: "Furniture for real homes, delivered across mainland UK.",
    seoTitle: "furniture delivered across mainland UK",
    hero: {
      layout: "photo",
      headline: "Solid wood furniture, made for real rooms.",
      subline: "Bedside tables, sideboards, desks and more, delivered free across mainland UK.",
      image: livingRoomPhoto,
      primary: { label: "Shop living room", href: "/shop/living-room" },
      secondary: { label: "Shop bedroom", href: "/shop/bedroom" },
    },
    home: { tilesHeading: "Shop by room", tilesNote: "Room photos from Unsplash", featuredHeading: "Our picks" },
    trust: standardTrust("mainland UK"),
    words: {
      item: "piece",
      items: "pieces",
      goods: "furniture",
      browse: "Browse furniture",
      categoryLabel: "Room",
      categoriesLabel: "Rooms",
      aboutItem: "About this piece",
      emptyCategory: "We’re adding pieces to this room. Check back soon.",
      newsletterHeading: "Offers and new pieces, first",
      newsletterText: "Occasional emails, no spam. Unsubscribe any time.",
    },
    delivery: { area: "mainland", twoPerson: true },
    nav: { mode: "auto", items: [] },
    details: [
      { key: "dimensions", label: "Dimensions", kind: "dimensions", google: "dimensions" },
      { key: "weight", label: "Weight", kind: "number", unit: "kg", google: "weight" },
      { key: "materials", label: "Materials", kind: "text", google: "material" },
      { key: "colour", label: "Colour", kind: "text", google: "color" },
      { key: "assembly", label: "Assembly", kind: "select", options: ["Self-assembly required", "Some assembly required", "Arrives assembled"] },
    ],
    google: { category: "436", productTypeRoot: "Furniture" },
  },
  categories: [
    cat("living-room", "Living room", "TV units, coffee tables, sideboards and shelving.", 10, { pageTitle: "Living room furniture", image: livingRoomPhoto }),
    cat("dining", "Dining", "Tables, chairs, bar stools and storage.", 20, {
      pageTitle: "Dining furniture",
      image: unsplashPhoto("urH155LONWs", "photo-1745794621090-d856c53b0cc2", "A dining room with a wooden table and mid-century chairs", "Clay Banks"),
    }),
    cat("bedroom", "Bedroom", "Bedside tables, chests of drawers and storage.", 30, {
      pageTitle: "Bedroom furniture",
      image: unsplashPhoto("7xRQZiIGKmo", "photo-1663337049364-5c6ba8ba1e78", "A bedroom with wooden bedside tables either side of the bed", "Annie Spratt"),
    }),
    cat("home-office", "Home office", "Desks, bookcases and office chairs.", 40, {
      pageTitle: "Home office furniture",
      image: unsplashPhoto("zIltX6n3m7w", "photo-1596022326953-84f20bfebb77", "A wooden trestle desk with a black chair and a plant", "Sven Brandsma"),
    }),
    cat("storage", "Storage", "Shelving, cabinets and space-saving pieces.", 50, {
      pageTitle: "Storage furniture",
      image: unsplashPhoto("Z0RIV1K_rug", "photo-1762280237740-5a9292e527ab", "A wooden cabinet with a lamp and a plant against a white brick wall", "Samuell Morgenstern"),
    }),
    cat("accents", "Accents", "Mirrors, side tables and occasional chairs.", 60, {
      pageTitle: "Accents furniture",
      image: unsplashPhoto("AVK42DjB2sE", "photo-1643233948547-b0fbb4368089", "A small cane-fronted wooden cabinet against a deep green wall, with books and a vase on top", "Priscilla Du Preez"),
    }),
  ],
};

// ------------------------------------------------------------ clothing

const clothing: Preset = {
  label: "Clothing",
  description: "Collections as categories, fabric, fit and care on products, delivery to the whole UK.",
  settings: {
    preset: "clothing",
    tagline: "Our own designs, printed to order and delivered across the UK.",
    seoTitle: "clothing designed by us, delivered across the UK",
    hero: {
      layout: "text",
      headline: "Our own designs, printed to order.",
      subline: "T-shirts, hoodies and more, delivered free across the UK.",
      primary: { label: "Shop T-shirts", href: "/shop/t-shirts" },
      secondary: { label: "Shop hoodies", href: "/shop/hoodies-and-sweatshirts" },
    },
    home: { tilesHeading: "Shop by collection", tilesNote: "", featuredHeading: "Our picks" },
    trust: standardTrust("UK"),
    words: {
      item: "item",
      items: "items",
      goods: "order",
      browse: "Browse the shop",
      categoryLabel: "Collection",
      categoriesLabel: "Collections",
      aboutItem: "About this item",
      emptyCategory: "We’re adding items to this collection. Check back soon.",
      newsletterHeading: "Offers and new designs, first",
      newsletterText: "Occasional emails, no spam. Unsubscribe any time.",
    },
    delivery: { area: "uk", twoPerson: false },
    nav: { mode: "auto", items: [] },
    details: [
      { key: "fabric", label: "Fabric", kind: "text", required: true, google: "material" },
      { key: "fit", label: "Fit", kind: "select", options: ["Regular fit", "Relaxed fit", "Oversized", "Slim fit"], filterable: true },
      { key: "colour", label: "Colour", kind: "text", google: "color" },
      { key: "gender", label: "Cut", kind: "select", options: ["Unisex", "Men", "Women"], google: "gender", filterable: true },
      { key: "care", label: "Care", kind: "longtext" },
    ],
    google: { category: "Apparel & Accessories > Clothing", productTypeRoot: "Clothing" },
  },
  categories: [
    cat("t-shirts", "T-shirts", "Printed tees in our own designs.", 10),
    cat("hoodies-and-sweatshirts", "Hoodies and sweatshirts", "Heavyweight hoodies and crew necks.", 20),
    cat("joggers-and-shorts", "Joggers and shorts", "Matching bottoms for our tops.", 30),
    cat("packs", "Packs", "Sets of our designs at a better price.", 40),
  ],
};

// ------------------------------------------------------------ beauty

const beauty: Preset = {
  label: "Beauty",
  description: "Skincare, makeup and hair as categories; size, ingredients and how to use on products.",
  settings: {
    preset: "beauty",
    tagline: "Skincare, makeup and haircare, delivered across the UK.",
    seoTitle: "skincare, makeup and haircare delivered across the UK",
    hero: {
      layout: "text",
      headline: "Skincare, makeup and haircare.",
      subline: "Delivered free across the UK.",
      primary: { label: "Shop skincare", href: "/shop/skincare" },
      secondary: { label: "Shop makeup", href: "/shop/makeup" },
    },
    home: { tilesHeading: "Shop by category", tilesNote: "", featuredHeading: "Our picks" },
    trust: standardTrust("UK"),
    words: {
      item: "product",
      items: "products",
      goods: "order",
      browse: "Browse the shop",
      categoryLabel: "Category",
      categoriesLabel: "Categories",
      aboutItem: "About this product",
      emptyCategory: "We’re adding products here. Check back soon.",
      newsletterHeading: "Offers and new products, first",
      newsletterText: "Occasional emails, no spam. Unsubscribe any time.",
    },
    delivery: { area: "uk", twoPerson: false },
    nav: { mode: "auto", items: [] },
    details: [
      { key: "size", label: "Size", kind: "text", google: "size" },
      { key: "suitableFor", label: "Suitable for", kind: "text", filterable: true },
      { key: "ingredients", label: "Ingredients", kind: "longtext", required: true },
      { key: "howToUse", label: "How to use", kind: "longtext" },
      { key: "warnings", label: "Warnings", kind: "longtext" },
    ],
    google: { category: "Health & Beauty > Personal Care > Cosmetics", productTypeRoot: "Beauty" },
  },
  categories: [
    cat("skincare", "Skincare", "Cleansers, serums and moisturisers.", 10),
    cat("makeup", "Makeup", "Face, eyes and lips.", 20),
    cat("haircare", "Haircare", "Shampoo, conditioner and styling.", 30),
    cat("bath-and-body", "Bath and body", "Washes, lotions and scrubs.", 40),
  ],
};

// ------------------------------------------------------------ blank

const blank: Preset = {
  label: "Blank",
  description: "No categories or product details yet: set everything up yourself.",
  settings: {
    ...beauty.settings,
    preset: "blank",
    tagline: "Delivered across the UK.",
    seoTitle: "delivered across the UK",
    hero: { layout: "text", headline: "Welcome", subline: "" },
    home: { tilesHeading: "Shop by category", tilesNote: "", featuredHeading: "Our picks" },
    details: [],
    google: { category: "", productTypeRoot: "" },
  },
  categories: [],
};

export const PRESETS: Record<string, Preset> = { furniture, clothing, beauty, blank };
export const PRESET_KEYS = Object.keys(PRESETS);
