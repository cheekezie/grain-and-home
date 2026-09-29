import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";
import { AVAILABILITY, DELIVERY_TYPES } from "@/lib/catalogue";

const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
    /** Plain white or transparent background (set automatically on save, lib/imageCutout.ts). */
    cutout: Boolean,
    /** The option value this photo shows (e.g. "Pink"); empty = any. */
    forValue: { type: String, trim: true },
  },
  { _id: false },
);

// A product we sell but don't stock: bought from `supplier` when a customer
// orders. Prices are in pence. `supplierCost`, `supplierSku` and
// `supplierUrl` are admin-only and never sent to the storefront.
const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    /** A Category slug (checked against the database in the admin). */
    category: { type: String, required: true },
    summary: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    images: { type: [imageSchema], default: [] },

    // Required to publish (enforced in the admin), not for drafts: a product
    // can be researched before the trade price is known.
    price: { type: Number, min: 0 },

    // Specification, as stated by the supplier.
    /** Choices the customer makes (Size, Colour…). None: the product sells as itself. */
    options: {
      type: [new Schema({ name: { type: String, required: true, trim: true }, values: [{ type: String, trim: true }], google: String }, { _id: false })],
      default: [],
    },
    /**
     * One per combination of option values. price/supplierCost/supplierSku
     * empty = the product's own. Ids come from the values (lib/variants.ts)
     * and are kept in baskets and orders.
     */
    variants: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            values: [String],
            price: { type: Number, min: 0 },
            supplierCost: { type: Number, min: 0 },
            supplierSku: { type: String, trim: true },
            availability: { type: String, enum: AVAILABILITY, default: "in_stock" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    /**
     * A pack: the products it contains, one entry per piece (the same product
     * can appear more than once). The customer picks each piece's options.
     * Empty: an ordinary product.
     */
    packSlots: { type: [{ type: Schema.Types.ObjectId, ref: "Product" }], default: [] },
    /**
     * Per piece (same order as packSlots): options fixed by us, e.g.
     * { Colour: "Black" }. The customer chooses only the others.
     */
    packPresets: { type: [Schema.Types.Mixed], default: [] },
    /** The shop's own product details (Admin → Shop settings → Product details), by field key. */
    details: { type: Schema.Types.Mixed, default: {} },

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
    /** The Printful catalogue product it was imported from (Admin → Import from Printful). */
    printfulId: { type: Number, index: true, sparse: true },
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
