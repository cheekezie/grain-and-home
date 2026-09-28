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
    /** Includes the variant, e.g. "Classic tee (M / Black)". */
    name: { type: String, required: true },
    /** The chosen options, e.g. "M / Black" (products with options only). */
    variant: String,
    variantId: String,
    /** Pieces of one pack line share a packGroup; packName is the pack's name. */
    packGroup: String,
    packName: String,
    image: String,
    /** What the customer paid per unit, after any promo discount. */
    unitPrice: { type: Number, required: true },
    /** Price per unit before discount (for receipts). */
    listUnitPrice: Number,
    quantity: { type: Number, required: true, min: 1 },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
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
    /** Emails we've sent the customer about this order. */
    emails: {
      type: [new Schema({ at: { type: Date, default: () => new Date() }, kind: String, subject: String, to: String }, { _id: false })],
      default: [],
    },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
const Order = defineModel("Order", orderSchema);
export default Order;
