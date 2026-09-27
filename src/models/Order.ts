import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";
import { ORDER_STATUSES } from "@/lib/catalogue";

// Each line is a snapshot at the time of purchase (name, price, supplier
// details), so later product edits never rewrite history. Supplier order
// reference and tracking are per line because one basket can span
// several suppliers.
const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    slug: String,
    name: { type: String, required: true },
    image: String,
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    supplierName: String,
    supplierSku: String,
    supplierUrl: String,
    supplierCost: Number,
    supplierOrderRef: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
  },
  { _id: true },
);

const eventSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    status: { type: String, enum: ORDER_STATUSES },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    stripeCheckoutId: { type: String, required: true, unique: true },
    stripePaymentIntentId: String,
    status: { type: String, enum: ORDER_STATUSES, default: "paid" },
    customerEmail: { type: String, required: true },
    customerName: String,
    customerPhone: String,
    shippingAddress: {
      name: String,
      line1: String,
      line2: String,
      city: String,
      postalCode: String,
      country: String,
    },
    items: { type: [orderItemSchema], default: [] },
    total: { type: Number, required: true },
    /** Promo code used and the amount it took off (pence). */
    promoCode: String,
    discount: { type: Number, default: 0 },
    /** Actual Stripe fee in pence, read from Stripe after payment (null until known). */
    stripeFee: Number,
    currency: { type: String, default: "gbp" },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
const Order = defineModel("Order", orderSchema);
export default Order;
