import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";

// "Email me when it's back" on out-of-stock products.
const stockAlertSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    notifiedAt: Date,
  },
  { timestamps: true },
);

stockAlertSchema.index({ product: 1, email: 1 }, { unique: true });

export type StockAlertDoc = InferSchemaType<typeof stockAlertSchema>;
const StockAlert = defineModel("StockAlert", stockAlertSchema);
export default StockAlert;
