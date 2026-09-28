import type { Availability, DeliveryType, OrderStatus } from "./catalogue";
import type { DetailValue } from "./shop/types";
import type { AdminVariant, ProductOption, StoreVariant } from "./variants";

export type Status = "draft" | "published";

export interface ProductImage {
  url: string;
  alt: string;
  /** true: plain white/transparent background; false: the photo has its own background; missing: not known. */
  cutout?: boolean;
  /** The option value this photo shows, e.g. "Pink" (products with options). */
  forValue?: string;
}

/** What the storefront may see. No supplier details, ever. */
export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  images: ProductImage[];
  price: number;
  /** The shop's product details, by field key. */
  details: Record<string, DetailValue>;
  options: ProductOption[];
  /** Empty when the product has no options. Supplier fields stripped. */
  variants: StoreVariant[];
  /** A pack: the product id of each piece, in order. Empty for ordinary products. */
  packSlots: string[];
  /** A pack: per piece, options we've fixed (e.g. { Colour: "Black" }). */
  packPresets: Record<string, string>[];
  deliveryType: DeliveryType;
  deliveryEstimate: string;
  returnCost?: number;
  availability: Availability;
  featured: boolean;
}

/** Admin view: everything, including supplier and cost. */
export interface AdminProduct extends Omit<StoreProduct, "price" | "variants"> {
  variants: AdminVariant[];
  /** Drafts may not have a price yet. */
  price?: number;
  internalNotes: string;
  status: Status;
  sortOrder: number;
  availabilityCheckedAt?: string;
  supplierId?: string;
  supplierSku?: string;
  supplierUrl?: string;
  supplierCost?: number;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  website?: string;
  orderUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  accountRef?: string;
  notes: string;
  returnInstructions: string;
  whiteLabel: boolean;
  senderDomains: string[];
  autoCustomerUpdates: boolean;
  active: boolean;
}

export interface OrderItem {
  id: string;
  productId?: string;
  slug?: string;
  /** Includes the variant, e.g. "Classic tee (M / Black)". */
  name: string;
  /** "M / Black" when the product has options. */
  variant?: string;
  variantId?: string;
  /** Set on each piece of a pack: which pack line it came from, and the pack's name. */
  packGroup?: string;
  packName?: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  supplierId?: string;
  supplierName?: string;
  supplierSku?: string;
  supplierUrl?: string;
  supplierCost?: number;
  supplierOrderRef?: string;
  trackingUrl?: string;
}

export interface OrderEvent {
  at: string;
  status?: OrderStatus;
  note: string;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: { name?: string; line1?: string; line2?: string; city?: string; postalCode?: string; country?: string };
  items: OrderItem[];
  total: number;
  promoCode?: string;
  discount: number;
  stripePaymentIntentId?: string;
  events: OrderEvent[];
  emails: { at: string; kind: string; subject: string }[];
  createdAt: string;
  updatedAt: string;
}

export type CartItem = {
  productId: string;
  /** Set when the product has options (Size, Colour…): which one was chosen. */
  variantId?: string;
  /** "M / Black", for display. */
  variant?: string;
  /** A pack: the chosen variant id for each piece ("" for a piece without options). */
  choices?: string[];
  /** A pack: what's in it, for display, e.g. ["Classic tee, M / Black", "Classic tee, L / Grey"]. */
  pieces?: string[];
  slug: string;
  name: string;
  /** Display only: checkout always re-reads the price on the server. */
  price: number;
  image: string | null;
  quantity: number;
};
