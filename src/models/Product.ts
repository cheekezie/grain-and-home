import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";
import { AVAILABILITY, CATEGORY_SLUGS, DELIVERY_TYPES } from "@/lib/catalogue";

const imageSchema = new Schema({ url: { type: String, required: true, trim: true }, alt: { type: String, default: "", trim: true } }, { _id: false });

// A product we sell but don't stock: bought from `supplier` when a customer
// orders. Prices are in pence. `supplierCost`, `supplierSku` and
// `supplierUrl` are admin-only and never sent to the storefront.
const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORY_SLUGS, required: true },
    summary: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    images: { type: [imageSchema], default: [] },

    // Required to publish (enforced in the admin), not for drafts: a product
    // can be researched before the trade price is known.
    price: { type: Number, min: 0 },

    // Specification, as stated by the supplier.
    widthCm: Number,
    depthCm: Number,
    heightCm: Number,
    weightKg: Number,
    materials: { type: String, default: "", trim: true },
    colour: { type: String, default: "", trim: true },
    assembly: { type: String, enum: ["none", "required", "partial"], default: "required" },

    // Delivery and returns: shown on the product page. UK law requires the
    // cost of returning goods that can't go by post to be stated up front.
    deliveryType: { type: String, enum: DELIVERY_TYPES, default: "courier" },
    deliveryEstimate: { type: String, default: "", trim: true },
    returnCost: { type: Number, min: 0 },

    availability: { type: String, enum: AVAILABILITY, default: "in_stock" },
    availabilityCheckedAt: Date,

    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplierSku: { type: String, trim: true },
    supplierUrl: { type: String, trim: true },
    supplierCost: { type: Number, min: 0 },
    /** Admin-only working notes: what still needs checking with the supplier. */
    internalNotes: { type: String, default: "" },

    status: { type: String, enum: ["draft", "published"], default: "draft" },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, category: 1, sortOrder: 1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;
const Product = defineModel("Product", productSchema);
export default Product;
