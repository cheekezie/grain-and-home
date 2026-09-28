import type * as T from "./types";

// Mongoose lean docs to plain, serialisable objects. toStoreProduct is the
// only thing storefront pages receive: it drops every supplier field.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Lean = Record<string, any>;
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : undefined);
const num = (n: unknown) => (typeof n === "number" ? n : undefined);

export function toStoreProduct(p: Lean): T.StoreProduct {
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    category: p.category,
    summary: p.summary,
    description: p.description,
    images: (p.images ?? []).map((i: Lean) => ({ url: i.url, alt: i.alt ?? "" })),
    price: p.price,
    details: p.details && typeof p.details === "object" ? { ...p.details } : {},
    deliveryType: p.deliveryType ?? "courier",
    deliveryEstimate: p.deliveryEstimate ?? "",
    returnCost: num(p.returnCost),
    availability: p.availability ?? "in_stock",
    featured: !!p.featured,
    packSlots: (p.packSlots ?? []).map(String),
    options: (p.options ?? []).map((o: Lean) => ({ name: o.name, values: [...(o.values ?? [])], ...(o.google && { google: o.google }) })),
    // Customers see each variant's own price, or the product's.
    variants: (p.variants ?? []).map((v: Lean) => ({ id: v.id, values: [...(v.values ?? [])], price: num(v.price) ?? p.price, availability: v.availability ?? "in_stock" })),
  };
}

export function toAdminProduct(p: Lean): T.AdminProduct {
  return {
    ...toStoreProduct(p),
    variants: (p.variants ?? []).map((v: Lean) => ({
      id: v.id,
      values: [...(v.values ?? [])],
      price: num(v.price),
      supplierCost: num(v.supplierCost),
      supplierSku: v.supplierSku || undefined,
      availability: v.availability ?? "in_stock",
    })),
    price: num(p.price),
    internalNotes: p.internalNotes ?? "",
    status: p.status,
    sortOrder: p.sortOrder ?? 100,
    availabilityCheckedAt: iso(p.availabilityCheckedAt),
    supplierId: p.supplier ? String(p.supplier) : undefined,
    supplierSku: p.supplierSku || undefined,
    supplierUrl: p.supplierUrl || undefined,
    supplierCost: num(p.supplierCost),
    updatedAt: iso(p.updatedAt) ?? "",
  };
}

export function toSupplier(s: Lean): T.Supplier {
  return {
    id: String(s._id),
    name: s.name,
    website: s.website || undefined,
    orderUrl: s.orderUrl || undefined,
    contactEmail: s.contactEmail || undefined,
    contactPhone: s.contactPhone || undefined,
    accountRef: s.accountRef || undefined,
    notes: s.notes ?? "",
    returnInstructions: s.returnInstructions ?? "",
    whiteLabel: !!s.whiteLabel,
    senderDomains: s.senderDomains ?? [],
    autoCustomerUpdates: !!s.autoCustomerUpdates,
    active: s.active !== false,
  };
}

export function toOrder(o: Lean): T.Order {
  return {
    id: String(o._id),
    number: o.number,
    status: o.status,
    customerEmail: o.customerEmail,
    customerName: o.customerName || undefined,
    customerPhone: o.customerPhone || undefined,
    shippingAddress: o.shippingAddress ?? undefined,
    items: (o.items ?? []).map((i: Lean) => ({
      id: String(i._id),
      productId: i.product ? String(i.product) : undefined,
      slug: i.slug || undefined,
      name: i.name,
      variant: i.variant || undefined,
      variantId: i.variantId || undefined,
      packGroup: i.packGroup || undefined,
      packName: i.packName || undefined,
      image: i.image || undefined,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      supplierId: i.supplier ? String(i.supplier) : undefined,
      supplierName: i.supplierName || undefined,
      supplierSku: i.supplierSku || undefined,
      supplierUrl: i.supplierUrl || undefined,
      supplierCost: num(i.supplierCost),
      supplierOrderRef: i.supplierOrderRef || undefined,
      trackingUrl: i.trackingUrl || undefined,
    })),
    total: o.total,
    promoCode: o.promoCode || undefined,
    discount: o.discount ?? 0,
    stripePaymentIntentId: o.stripePaymentIntentId || undefined,
    emails: (o.emails ?? []).map((m: Lean) => ({ at: iso(m.at) ?? "", kind: m.kind ?? "", subject: m.subject ?? "" })),
    events: (o.events ?? []).map((e: Lean) => ({ at: iso(e.at) ?? "", status: e.status || undefined, note: e.note ?? "" })),
    createdAt: iso(o.createdAt) ?? "",
    updatedAt: iso(o.updatedAt) ?? "",
  };
}
