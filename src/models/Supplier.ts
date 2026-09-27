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
    /**
     * White label: the supplier delivers unbranded and never contacts the
     * customer (e.g. Artisan). Otherwise (e.g. Wayfair) we order on the
     * customer's behalf with our own email, and the supplier's emails come
     * to our inbox for us to pass on.
     */
    whiteLabel: { type: Boolean, default: false },
    /** Domains their order emails come from, e.g. wayfair.co.uk. Used to pick their emails out of the inbox. */
    senderDomains: { type: [String], default: [] },
    /** Email the customer automatically when one of their emails is matched to an order (otherwise: review first). */
    autoCustomerUpdates: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type SupplierDoc = InferSchemaType<typeof supplierSchema>;
const Supplier = defineModel("Supplier", supplierSchema);
export default Supplier;
