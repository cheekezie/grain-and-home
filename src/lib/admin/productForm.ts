import type { AdminProduct } from "@/lib/types";
import type { ProductValue } from "@/components/admin/editors";
import { penceToPounds } from "@/lib/money";
import { detailsToForm } from "@/lib/shop/details";
import type { DetailField } from "@/lib/shop/types";

export function emptyProduct(fields: DetailField[], category = ""): ProductValue {
  return {
    slug: "", name: "", category, summary: "", description: "", images: [],
    price: "", supplierCost: "", returnCost: "", details: detailsToForm(fields, {}), options: [], variants: [], packSlots: [], deliveryType: "courier", deliveryEstimate: "",
    availability: "in_stock", supplierId: "", supplierSku: "", supplierUrl: "", internalNotes: "", status: "draft", featured: false, sortOrder: 100,
  };
}

export function toProductValue(p: AdminProduct, fields: DetailField[]): ProductValue {
  return {
    slug: p.slug, name: p.name, category: p.category, summary: p.summary, description: p.description, images: p.images,
    price: penceToPounds(p.price), supplierCost: penceToPounds(p.supplierCost), returnCost: penceToPounds(p.returnCost),
    details: detailsToForm(fields, p.details),
    packSlots: p.packSlots,
    options: p.options.map((o) => ({ name: o.name, valuesText: o.values.join(", "), google: o.google ?? "" })),
    variants: p.variants.map((v) => ({
      id: v.id, values: v.values, price: penceToPounds(v.price), supplierCost: penceToPounds(v.supplierCost), supplierSku: v.supplierSku ?? "", availability: v.availability,
    })),
    deliveryType: p.deliveryType, deliveryEstimate: p.deliveryEstimate,
    availability: p.availability, supplierId: p.supplierId ?? "", supplierSku: p.supplierSku ?? "", supplierUrl: p.supplierUrl ?? "", internalNotes: p.internalNotes,
    status: p.status, featured: p.featured, sortOrder: p.sortOrder,
  };
}
