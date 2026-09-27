import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { connectDB } from "@/lib/db";
import MailSync from "@/models/MailSync";
import { explainImapError, getInboxConfig } from "./inboxSettings";
import { fromParsedMail, recordSupplierEmail, suppliersWithInbox } from "./orderUpdates";

const MAILBOX = "INBOX";
const FIRST_RUN_DAYS = 14;
const MAX_PER_RUN = 200;

/**
 * Read new emails from our inbox and keep only those from suppliers'
 * domains (everything else is left alone and never stored). The first run
 * looks back two weeks; after that, only mail that arrived since.
 */
export async function syncInbox(): Promise<{ ok: boolean; checked: number; supplierEmails: number; message: string }> {
  const cfg = await getInboxConfig();
  if (!cfg) return { ok: false, checked: 0, supplierEmails: 0, message: "Set up your ordering inbox first (email and app password, above)." };
  const suppliers = await suppliersWithInbox();
  if (suppliers.length === 0) return { ok: true, checked: 0, supplierEmails: 0, message: "No suppliers have email domains set, so there's nothing to look for." };
  const byDomain = (addr: string) => {
    const domain = addr.split("@")[1]?.toLowerCase() ?? "";
    return suppliers.find((s) => (s.senderDomains as string[]).some((d) => domain === d || domain.endsWith(`.${d}`)));
  };

  await connectDB();
  const client = new ImapFlow({ host: cfg.imap.host, port: cfg.imap.port, secure: true, auth: { user: cfg.address, pass: cfg.password }, logger: false });
  let checked = 0;
  let found = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(MAILBOX);
    try {
      const box = client.mailbox && typeof client.mailbox === "object" ? client.mailbox : null;
      const validity = String(box?.uidValidity ?? "");
      const state = (await MailSync.findById(MAILBOX).lean()) as { uidValidity?: string; lastUid?: number } | null;
      const fresh = !state || state.uidValidity !== validity;
      const uids = fresh
        ? ((await client.search({ since: new Date(Date.now() - FIRST_RUN_DAYS * 86_400_000) }, { uid: true })) || [])
        : ((await client.search({ uid: `${(state!.lastUid ?? 0) + 1}:*` }, { uid: true })) || []).filter((u) => u > (state!.lastUid ?? 0));
      let lastUid = fresh ? 0 : (state!.lastUid ?? 0);
      for (const uid of uids.slice(0, MAX_PER_RUN)) {
        checked++;
        const env = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
        const fromAddr = env && env.envelope?.from?.[0]?.address ? env.envelope.from[0].address : "";
        const supplier = byDomain(fromAddr);
        if (supplier) {
          const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
          if (msg && msg.source) {
            const parsed = await simpleParser(msg.source);
            if (await recordSupplierEmail(fromParsedMail(parsed), supplier)) found++;
          }
        }
        lastUid = Math.max(lastUid, uid);
      }
      await MailSync.updateOne(
        { _id: MAILBOX },
        { $set: { uidValidity: validity, lastUid, lastRunAt: new Date() }, $unset: { lastError: 1 } },
        { upsert: true },
      );
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, checked, supplierEmails: found, message: `Checked ${checked} new email${checked === 1 ? "" : "s"}; ${found} from suppliers.` };
  } catch (e) {
    const message = explainImapError(e);
    console.error("[mail] inbox sync failed:", message);
    await MailSync.updateOne({ _id: MAILBOX }, { $set: { lastRunAt: new Date(), lastError: message } }, { upsert: true });
    try { await client.logout(); } catch { /* already closed */ }
    return { ok: false, checked, supplierEmails: found, message: `Couldn't read the inbox: ${message}` };
  }
}
