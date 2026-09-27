import "server-only";
import { ImapFlow } from "imapflow";
import { connectDB } from "@/lib/db";
import MailboxSettings from "@/models/MailboxSettings";
import { decryptSecret } from "@/lib/secretBox";

export const INBOX_PROVIDERS = {
  "zoho-eu": { label: "Zoho Mail (zoho.eu)", host: "imap.zoho.eu" },
  "zoho-com": { label: "Zoho Mail (zoho.com)", host: "imap.zoho.com" },
  "zoho-pro-eu": { label: "Zoho Mail for business (zoho.eu, paid)", host: "imappro.zoho.eu" },
  "zoho-pro-com": { label: "Zoho Mail for business (zoho.com, paid)", host: "imappro.zoho.com" },
  gmail: { label: "Gmail", host: "imap.gmail.com" },
  other: { label: "Other (enter the IMAP server)", host: "" },
} as const;
export type InboxProvider = keyof typeof INBOX_PROVIDERS;

export interface InboxConfig {
  address: string;
  password: string;
  imap: { host: string; port: number };
}

/** What the admin page may show: never the password. */
export async function getInboxSettings() {
  await connectDB();
  const s = (await MailboxSettings.findById("ordering-inbox").lean()) as Record<string, unknown> | null;
  const provider = ((s?.provider as string) in INBOX_PROVIDERS ? s?.provider : "zoho-eu") as InboxProvider;
  return {
    address: (s?.address as string) ?? "",
    hasPassword: !!s?.passwordEnc,
    provider,
    imapHost: (s?.imapHost as string) ?? "",
    imapPort: (s?.imapPort as number) ?? 993,
    lastTestAt: s?.lastTestAt instanceof Date ? s.lastTestAt.toISOString() : undefined,
    lastTestOk: s?.lastTestOk as boolean | undefined,
    lastTestMessage: s?.lastTestMessage as string | undefined,
  };
}

/** Full config for connecting, with the decrypted password; null if incomplete. */
export async function getInboxConfig(): Promise<InboxConfig | null> {
  await connectDB();
  const s = (await MailboxSettings.findById("ordering-inbox").lean()) as Record<string, unknown> | null;
  if (!s?.address || !s?.passwordEnc) return null;
  const provider = ((s.provider as string) in INBOX_PROVIDERS ? s.provider : "zoho-eu") as InboxProvider;
  const host = provider === "other" ? String(s.imapHost ?? "") : INBOX_PROVIDERS[provider].host;
  if (!host) return null;
  return { address: String(s.address), password: decryptSecret(String(s.passwordEnc)), imap: { host, port: Number(s.imapPort) || 993 } };
}

/** The ordering inbox address (what to give suppliers), or null if not set. */
export async function orderingInbox(): Promise<string | null> {
  await connectDB();
  const s = (await MailboxSettings.findById("ordering-inbox").select("address").lean()) as { address?: string } | null;
  return s?.address || null;
}

/** Turn an IMAP failure into something the admin can act on. */
export function explainImapError(e: unknown): string {
  const err = e as Error & { responseText?: string; authenticationFailed?: boolean; code?: string };
  const server = err.responseText?.replace(/\s*\((Failure|Failed)\)\s*$/i, "").trim();
  if (server && /enable IMAP/i.test(server)) {
    return "The login worked, but IMAP is switched off for this account. In Zoho Mail: Settings → Mail Accounts → your address → IMAP → tick IMAP Access. On a business account, the Zoho admin may need to allow IMAP first (Admin Console → email policy). Zoho's free plan doesn't include IMAP.";
  }
  if (server && /invalid credentials|authentication failed/i.test(server)) {
    return "The mail server rejected the login. If the password is right, check the provider: accounts on your own domain usually need \"Zoho Mail for business\", and the data centre (zoho.com or zoho.eu) must match where the account lives.";
  }
  if (server) return `The mail server said: ${server}`;
  if (err.authenticationFailed) return "The login was rejected. Check the email address and the app password.";
  if (err.code === "ENOTFOUND") return "That mail server couldn't be found. Check the provider or server name.";
  if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED") return "Couldn't reach the mail server. Check the server name and port.";
  return err.message;
}

/** Try logging in; returns a plain result for the admin. */
export async function testImapLogin(cfg: InboxConfig): Promise<{ ok: boolean; message: string }> {
  const client = new ImapFlow({ host: cfg.imap.host, port: cfg.imap.port, secure: true, auth: { user: cfg.address, pass: cfg.password }, logger: false, connectionTimeout: 15_000, greetingTimeout: 15_000 });
  try {
    await client.connect();
    const box = await client.mailboxOpen("INBOX", { readOnly: true });
    const n = box.exists;
    await client.logout();
    return { ok: true, message: `Connected to ${cfg.address}: ${n} email${n === 1 ? "" : "s"} in the inbox.` };
  } catch (e) {
    try { await client.logout(); } catch { /* not connected */ }
    return { ok: false, message: explainImapError(e) };
  }
}
