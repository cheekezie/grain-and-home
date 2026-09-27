import { Schema } from "mongoose";
import { defineModel } from "./define";

// The ordering inbox: the address given to non-white-label suppliers when
// ordering for a customer, and the inbox the shop reads for their emails.
// Set in Admin → Supplier emails. The app password is stored encrypted.
const mailboxSettingsSchema = new Schema(
  {
    _id: { type: String, default: "ordering-inbox" },
    address: { type: String, trim: true, lowercase: true },
    passwordEnc: String,
    provider: { type: String, default: "zoho-eu" },
    imapHost: { type: String, trim: true },
    imapPort: { type: Number, default: 993 },
    lastTestAt: Date,
    lastTestOk: Boolean,
    lastTestMessage: String,
  },
  { timestamps: true },
);

const MailboxSettings = defineModel("MailboxSettings", mailboxSettingsSchema);
export default MailboxSettings;
