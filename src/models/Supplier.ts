import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";

// A vendor we buy from on the customer's behalf. Everything here is
// internal: suppliers are never named on the storefront.
const supplierSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    website: { type: String, trim: true },
    /** Trade portal / account login page used to place orders. */
    orderUrl: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    accountRef: { type: String, trim: true },
    /** How they deliver, lead times, surcharges, returns process: notes for whoever places orders. */
    notes: { type: String, default: "" },
    /**
     * What to tell a customer who wants to return this supplier's goods:
     * where it goes, how it's packed, who collects. Copied into the reply to
     * a return request; never shown on the storefront as-is.
     */
    returnInstructions: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type SupplierDoc = InferSchemaType<typeof supplierSchema>;
const Supplier = defineModel("Supplier", supplierSchema);
export default Supplier;
