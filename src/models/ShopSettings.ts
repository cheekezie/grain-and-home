import { Schema } from "mongoose";
import { defineModel } from "./define";

// One document per shop (_id "shop"): the ShopSettings object from
// src/lib/shop/types.ts. Validated by zod in the admin before it's saved.
const shopSettingsSchema = new Schema(
  {
    _id: { type: String, default: "shop" },
    settings: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

const ShopSettings = defineModel("ShopSettings", shopSettingsSchema);
export default ShopSettings;
