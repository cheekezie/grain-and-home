import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";

const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
    credit: { type: String, trim: true },
    creditUrl: { type: String, trim: true },
    /** Plain or white background: shown whole on the panel colour. */
    cutout: Boolean,
  },
  { _id: false },
);

// A shop category (a room, a collection…): its page at /shop/<slug>, its
// tile on the home page and, in "auto" nav mode, its place in the nav.
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    /** Short line on the tile and the page when there's no intro. */
    blurb: { type: String, default: "", trim: true },
    /** Browser tab / Google title. Empty uses the name. */
    pageTitle: { type: String, default: "", trim: true },
    intro: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
    /** Buying guide below the products. Blank line = new paragraph, "## " = heading, "- " = bullet. */
    guide: { type: String, default: "" },
    image: imageSchema,
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);

categorySchema.index({ sortOrder: 1, name: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
const Category = defineModel("Category", categorySchema);
export default Category;
