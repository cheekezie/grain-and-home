import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./define";

// Email sign-ups for offers and new pieces. Nothing is sent from the site
// yet: export from the admin into a mail provider.
const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: "footer" },
    /** The exact wording the person agreed to, for the record. */
    consentText: { type: String, required: true },
    /** Secret for the one-click unsubscribe link in every email. */
    unsubscribeToken: { type: String, required: true, unique: true },
    unsubscribedAt: Date,
  },
  { timestamps: true },
);

export type SubscriberDoc = InferSchemaType<typeof subscriberSchema>;
const Subscriber = defineModel("Subscriber", subscriberSchema);
export default Subscriber;
