import "server-only";
import { siteConfig } from "@/lib/siteConfig";

// Two separate Zoho services:
//
// Sending (customer emails) — ZeptoMail's email API, same setup as Attesta
// Tickets. ZeptoMail → Mail Agents → your agent → SMTP/API → Send Mail API token.
//   ZOHO_ZEPTOMAIL_TOKEN      the Send Mail token (without "Zoho-enczapikey")
//   ZOHO_ZEPTOMAIL_FROM       a sender address on your verified domain, e.g. orders@grainandhome.co.uk
//   ZOHO_ZEPTOMAIL_FROM_NAME  optional, defaults to the shop name
//   ZOHO_ZEPTOMAIL_API_URL    optional: https://api.zeptomail.eu/v1.1/email if your
//                             ZeptoMail account is in the EU data centre (default .com)
//
// Reading supplier emails is set in the admin (Supplier emails → Ordering
// inbox) and stored in the database: see inboxSettings.ts.

export function sendingConfig() {
  const token = process.env.ZOHO_ZEPTOMAIL_TOKEN?.trim().replace(/^Zoho-enczapikey\s+/i, "");
  const from = process.env.ZOHO_ZEPTOMAIL_FROM?.trim();
  if (!token || !from) return null;
  return {
    token,
    from,
    fromName: process.env.ZOHO_ZEPTOMAIL_FROM_NAME?.trim() || siteConfig.name,
    replyTo: siteConfig.business.email,
    apiUrl: process.env.ZOHO_ZEPTOMAIL_API_URL?.trim() || "https://api.zeptomail.com/v1.1/email",
  };
}

/** Can we email customers? */
export const mailConfigured = () => sendingConfig() !== null;
