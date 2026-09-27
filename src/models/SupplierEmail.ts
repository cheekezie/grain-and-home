import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";

// An email from a (non-white-label) supplier, read from our inbox and
// matched to an order where possible. Reviewed in Admin → Supplier emails,
// or applied automatically if the supplier allows it.
const supplierEmailSchema = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    /** Sender + subject + minute: spots the same email arriving by webhook and by inbox check. */
    dedupeKey: { type: String, index: true },
    from: { type: String, default: "" },
    subject: { type: String, default: "" },
    receivedAt: Date,
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    /** Plain text of the email (trimmed), kept for review. */
    text: { type: String, default: "" },
    /** What we found in it. */
    detectedStatus: { type: String, enum: ["ordered", "dispatched", "out_for_delivery", "delivered", "cancelled", "unknown"], default: "unknown" },
    /** Carrier tracking links: safe to send to the customer. */
    trackingUrls: { type: [String], default: [] },
    /** Tracking pages on the supplier's own site: shown for review, never sent (they'd reveal the supplier). */
    supplierHostedTrackingUrls: { type: [String], default: [] },
    supplierOrderRef: String,
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderItem: Schema.Types.ObjectId,
    /** new → waiting for review; applied → order updated (and maybe emailed); ignored; unmatched → no order found. */
    state: { type: String, enum: ["new", "applied", "ignored", "unmatched"], default: "new" },
    customerEmailedAt: Date,
    appliedAt: Date,
  },
  { timestamps: true },
);

supplierEmailSchema.index({ state: 1, receivedAt: -1 });

export type SupplierEmailDoc = InferSchemaType<typeof supplierEmailSchema>;
const SupplierEmail = defineModel("SupplierEmail", supplierEmailSchema);
export default SupplierEmail;
