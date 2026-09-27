import type { Availability, CategorySlug, DeliveryType, OrderStatus } from "./catalogue";

export type Status = "draft" | "published";

export interface ProductImage {
  url: string;
  alt: string;
}

/** What the storefront may see. No supplier details, ever. */
export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  summary: string;
  description: string;
  images: ProductImage[];
  price: number;
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
  weightKg?: number;
  materials: string;
  colour: string;
  assembly: "none" | "required" | "partial";
  deliveryType: DeliveryType;
  deliveryEstimate: string;
  returnCost?: number;
  availability: Availability;
  featured: boolean;
}

/** Admin view: everything, including supplier and cost. */
export interface AdminProduct extends Omit<StoreProduct, "price"> {
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
  active: boolean;
}

export interface OrderItem {
  id: string;
  productId?: string;
  slug?: string;
  name: string;
  image?: string;
  unitPrice: number;
  quantity: number;
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
  createdAt: string;
  updatedAt: string;
}

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  /** Display only: checkout always re-reads the price on the server. */
  price: number;
  image: string | null;
  quantity: number;
};
