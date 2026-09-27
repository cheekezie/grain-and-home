import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";
import { RETURN_REASONS, RETURN_STATUSES } from "@/lib/catalogue";

// A customer's request to send something back. We hold no stock, so each
// item goes back to its supplier: the admin replies with that supplier's
// return instructions (Supplier.returnInstructions). Refunds happen in
// Stripe and are recorded on the order.
const returnRequestSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: Number, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    reason: { type: String, enum: RETURN_REASONS, required: true },
    details: { type: String, default: "", trim: true },
    items: [
      new Schema({ orderItem: Schema.Types.ObjectId, name: String, quantity: Number }, { _id: false }),
    ],
    status: { type: String, enum: RETURN_STATUSES, default: "new" },
    events: [new Schema({ at: { type: Date, default: () => new Date() }, note: String }, { _id: false })],
  },
  { timestamps: true },
);

returnRequestSchema.index({ status: 1, createdAt: -1 });

export type ReturnRequestDoc = InferSchemaType<typeof returnRequestSchema>;
const ReturnRequest = defineModel("ReturnRequest", returnRequestSchema);
export default ReturnRequest;
