import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";

// A discount code created in the admin. Applied at checkout, recalculated
// on the server every time; Stripe only ever sees the final amount off.
const promoSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    /** Customer-facing, e.g. "10% off everything". */
    headline: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["percent", "fixed"], required: true },
    /** Percent (1-90) or pence. */
    value: { type: Number, required: true, min: 1 },
    scope: { type: String, enum: ["all", "products", "categories"], default: "all" },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    categories: [{ type: String }],
    /** Minimum basket subtotal in pence. */
    minSpend: { type: Number, min: 0 },
    startsAt: Date,
    expiresAt: Date,
    /** Total redemptions allowed; usedCount goes up when a paid order uses it. */
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    /** One use per customer email. */
    oncePerCustomer: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    /** Announce on the site: offer bar + one-time "claim" dialog. */
    announce: { type: Boolean, default: false },
    /** Given to new email subscribers. */
    welcome: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type PromoDoc = InferSchemaType<typeof promoSchema>;
const PromoCode = defineModel("PromoCode", promoSchema);
export default PromoCode;
