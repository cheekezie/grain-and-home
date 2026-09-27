import { Schema } from "mongoose";
import { defineModel } from "./define";

// Where inbox reading got up to (IMAP UID), so each email is read once.
const mailSyncSchema = new Schema({
  _id: { type: String, required: true }, // mailbox, e.g. "INBOX"
  uidValidity: String,
  lastUid: { type: Number, default: 0 },
  lastRunAt: Date,
  lastError: String,
});

const MailSync = defineModel("MailSync", mailSyncSchema);
export default MailSync;
