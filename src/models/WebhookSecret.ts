import { Schema } from "mongoose";
import { defineModel } from "./define";

// Signing secrets handed to us by an integration (Zoho Mail sends its
// x-hook-secret only on the very first webhook call), plus when it last
// called, for the admin status line.
const webhookSecretSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "zoho-mail"
  secret: String,
  connectedAt: Date,
  lastCallAt: Date,
  lastResult: String,
});

const WebhookSecret = defineModel("WebhookSecret", webhookSecretSchema);
export default WebhookSecret;
