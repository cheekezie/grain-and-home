import type { AdminProduct } from "@/lib/types";
import type { ProductValue } from "@/components/admin/editors";
import { penceToPounds } from "@/lib/money";

const n = (x?: number) => (x == null ? "" : String(x));

export const emptyProduct: ProductValue = {
  slug: "", name: "", category: "living-room", summary: "", description: "", images: [],
  price: "", supplierCost: "", returnCost: "", widthCm: "", depthCm: "", heightCm: "", weightKg: "",
  materials: "", colour: "", assembly: "required", deliveryType: "courier", deliveryEstimate: "",
  availability: "in_stock", supplierId: "", supplierSku: "", supplierUrl: "", internalNotes: "", status: "draft", featured: false, sortOrder: 100,
};

export function toProductValue(p: AdminProduct): ProductValue {
  return {
    slug: p.slug, name: p.name, category: p.category, summary: p.summary, description: p.description, images: p.images,
    price: penceToPounds(p.price), supplierCost: penceToPounds(p.supplierCost), returnCost: penceToPounds(p.returnCost),
    widthCm: n(p.widthCm), depthCm: n(p.depthCm), heightCm: n(p.heightCm), weightKg: n(p.weightKg),
    materials: p.materials, colour: p.colour, assembly: p.assembly, deliveryType: p.deliveryType, deliveryEstimate: p.deliveryEstimate,
    availability: p.availability, supplierId: p.supplierId ?? "", supplierSku: p.supplierSku ?? "", supplierUrl: p.supplierUrl ?? "", internalNotes: p.internalNotes,
    status: p.status, featured: p.featured, sortOrder: p.sortOrder,
  };
}
