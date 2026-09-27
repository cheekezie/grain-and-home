import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";
import { CATEGORY_SLUGS } from "@/lib/catalogue";

// Editable words for each room page: helps shoppers choose and gives search
// engines something to rank beyond a grid of products.
const roomContentSchema = new Schema(
  {
    slug: { type: String, enum: CATEGORY_SLUGS, required: true, unique: true },
    /** One or two sentences under the room name (replaces the default blurb). */
    intro: { type: String, default: "", trim: true },
    /** Shown in Google results; about 150 characters. */
    metaDescription: { type: String, default: "", trim: true },
    /** Buying guide below the products. Blank line = new paragraph, "## " = heading, "- " = bullet. */
    guide: { type: String, default: "" },
  },
  { timestamps: true },
);

export type RoomContentDoc = InferSchemaType<typeof roomContentSchema>;
const RoomContent = defineModel("RoomContent", roomContentSchema);
export default RoomContent;
