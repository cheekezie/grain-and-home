// Store-wide lists shared by the storefront, admin and models. Kept free of
// database code so client components can import it.

export const CATEGORIES = [
  { slug: "living-room", name: "Living room", blurb: "TV units, coffee tables, sideboards and shelving." },
  { slug: "dining", name: "Dining", blurb: "Tables, chairs, bar stools and storage." },
  { slug: "bedroom", name: "Bedroom", blurb: "Bedside tables, chests of drawers and storage." },
  { slug: "home-office", name: "Home office", blurb: "Desks, bookcases and office chairs." },
  { slug: "storage", name: "Storage", blurb: "Shelving, cabinets and space-saving pieces." },
  { slug: "accents", name: "Accents", blurb: "Mirrors, side tables and occasional chairs." },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];
export const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

/** What we last heard from the supplier. Out of stock and discontinued can't be bought. */
export const AVAILABILITY = ["in_stock", "low_stock", "out_of_stock", "discontinued"] as const;
export type Availability = (typeof AVAILABILITY)[number];
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  discontinued: "No longer available",
};
export const PURCHASABLE: Availability[] = ["in_stock", "low_stock"];

export const DELIVERY_TYPES = ["courier", "two_person"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];
export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  courier: "Courier delivery",
  two_person: "Two-person delivery",
};

/** The manual fulfilment workflow, in order. */
export const ORDER_STATUSES = ["paid", "ordered", "dispatched", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  paid: "Paid, to order",
  ordered: "Ordered from supplier",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
/** Where an order can go next from each status. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  paid: ["ordered", "cancelled", "refunded"],
  ordered: ["dispatched", "cancelled", "refunded"],
  dispatched: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

/** Availability not re-checked for this long is flagged in the admin. */
export const STALE_AVAILABILITY_DAYS = 7;

// ------------------------------------------------------------ returns

export const RETURN_REASONS = ["changed_mind", "damaged", "faulty", "not_as_described", "wrong_item"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];
export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  changed_mind: "I've changed my mind",
  damaged: "It arrived damaged",
  faulty: "It's faulty",
  not_as_described: "It's not as described",
  wrong_item: "I received the wrong item",
};
/** Reasons where the customer doesn't pay for the return. */
export const FREE_RETURN_REASONS: ReturnReason[] = ["damaged", "faulty", "not_as_described", "wrong_item"];

export const RETURN_STATUSES = ["new", "instructions_sent", "on_its_way", "closed"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  new: "New, to reply",
  instructions_sent: "Instructions sent",
  on_its_way: "Being returned",
  closed: "Closed",
};
