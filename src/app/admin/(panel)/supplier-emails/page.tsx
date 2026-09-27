import Link from "next/link";
import { CheckInboxButton } from "@/components/admin/MailControls";
import { SUPPLIER_EMAILS_PER_PAGE, adminSupplierEmails, mailSyncState, supplierEmailCounts, zohoWebhookState } from "@/lib/admin/queries";
import Modal from "@/components/admin/Modal";
import Pagination from "@/components/admin/Pagination";
import { CopyButton } from "@/components/admin/OrderControls";
import { siteConfig } from "@/lib/siteConfig";
import { mailConfigured } from "@/lib/mail/config";
import { INBOX_PROVIDERS, getInboxSettings } from "@/lib/mail/inboxSettings";
import InboxSettingsForm from "@/components/admin/InboxSettingsForm";
import { EMAIL_STATUS_LABEL, emailDate as fmt } from "./labels";

export const metadata = { title: "Supplier emails" };

const TABS = [
  { state: "new", label: "To review" },
  { state: "unmatched", label: "Not matched" },
  { state: "applied", label: "Done" },
  { state: "ignored", label: "Ignored" },
] as const;

export default async function SupplierEmailsPage({ searchParams }: PageProps<"/admin/supplier-emails">) {
  const { state: raw, page: rawPage } = await searchParams;
  const state = TABS.some((t) => t.state === raw) ? (raw as string) : "new";
  const pageNum = Math.max(1, Number(typeof rawPage === "string" ? rawPage : 1) || 1);
  const inbox = await getInboxSettings();
  const cfg = inbox.address && inbox.hasPassword ? inbox : null;
  const canSend = mailConfigured();
  const [list, counts, sync, hook] = await Promise.all([adminSupplierEmails(state, pageNum), supplierEmailCounts(), mailSyncState(), zohoWebhookState()]);
  const emails = list.items;
  const hookKey = process.env.ZOHO_MAIL_WEBHOOK_KEY?.trim();
  const hookUrl = hookKey ? `${siteConfig.url}/api/webhooks/zoho-mail?key=${hookKey}` : null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl leading-tight">Supplier emails</h1>
        <div className="flex flex-wrap items-center gap-2">
          {cfg && <CheckInboxButton />}
          <Modal trigger="Settings" title="Supplier email settings" defaultOpen={!cfg && !hook.connected}>
            <section className="rounded-xl border border-line bg-white p-4">
              <h3 className="font-semibold">Ordering inbox</h3>
              <p className="mt-1 text-[14px] text-muted">
                The one address you give Wayfair, Amazon and other non-white-label suppliers as the contact email when ordering for a customer.
                Their emails arrive here, and the shop reads them. Shown on every order as a reminder.
              </p>
              <div className="mt-4">
                <InboxSettingsForm initial={inbox} providers={Object.entries(INBOX_PROVIDERS).map(([value, p]) => ({ value, label: p.label }))} />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-white p-4 text-[14px]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">Instant: Zoho Mail webhook</h3>
                <span className={hook.connected ? "font-semibold text-moss" : "text-muted"}>
                  {hook.connected ? `Connected${hook.connectedAt ? ` ${fmt.format(new Date(hook.connectedAt))}` : ""}` : "Not connected yet"}
                </span>
              </div>
              {hookUrl ? (
                <>
                  <p className="mt-1 text-muted">
                    In Zoho Mail (paid plans): Settings → Integrations → Developer Space → Outgoing Webhooks → add one for <strong>Mail</strong>, with a
                    rule for each supplier (e.g. <em>From contains wayfair</em>), and this URL:
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="break-all rounded bg-plaster px-2 py-1 text-[12px]">{hookUrl}</code>
                    <CopyButton text={hookUrl} label="Copy URL" />
                  </div>
                  {siteConfig.url.includes("localhost") && <p className="mt-1 text-[13px] text-danger">This is your local address. Zoho can only reach the live site: use the live URL once deployed.</p>}
                  {hook.lastCallAt && <p className="mt-2 text-[13px] text-muted">Last call {fmt.format(new Date(hook.lastCallAt))}: {hook.lastResult}</p>}
                </>
              ) : (
                <p className="mt-1 text-danger">Add ZOHO_MAIL_WEBHOOK_KEY to the settings file to get your webhook address.</p>
              )}
            </section>

            <section className="rounded-xl border border-line bg-white p-4 text-[14px]">
              <h3 className="font-semibold">Backup: inbox check</h3>
              <p className="mt-1 text-muted">
                &ldquo;Check inbox now&rdquo; reads the ordering inbox for supplier emails the webhook might have missed. When live, it can also run on a
                schedule (see the README). The same email is never recorded twice.
              </p>
            </section>
          </Modal>
        </div>
      </div>
      <p className="mt-2 max-w-3xl text-[15px] text-muted">
        Emails from suppliers who aren&rsquo;t white label (e.g. Wayfair), matched to orders by the supplier order number you saved. Update the
        order and email the customer from your own address; the supplier is never named.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-line bg-white px-4 py-3 text-[14px]">
        {cfg ? (
          <span>Inbox <span className="font-semibold">{cfg.address}</span></span>
        ) : (
          <span className="font-semibold text-danger">No ordering inbox set: open Settings</span>
        )}
        <span className="text-muted">{sync.lastRunAt ? `Last checked ${fmt.format(new Date(sync.lastRunAt))}` : "Not checked yet"}</span>
        <span className={hook.connected ? "text-moss" : "text-muted"}>Webhook {hook.connected ? "connected" : "not connected"}</span>
        {sync.lastError && <span className="font-semibold text-danger">Last check failed: {sync.lastError}</span>}
        {!canSend && <span className="font-semibold text-danger">Sending (ZeptoMail) isn&rsquo;t set up, so customers can&rsquo;t be emailed yet.</span>}
      </div>

      <nav aria-label="Filter" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.state}
            href={`/admin/supplier-emails?state=${t.state}`}
            aria-current={state === t.state ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${state === t.state ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}
          >
            {t.label}
            {counts[t.state] ? <span className="tabular ml-1.5 opacity-70">{counts[t.state]}</span> : null}
          </Link>
        ))}
      </nav>

      {emails.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-white p-5 text-muted">Nothing here.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-line text-[13px] text-muted">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Order</th>
                <th className="p-3">Found</th>
                <th className="p-3 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {emails.map((e) => {
                const href = `/admin/supplier-emails/${e.id}`;
                return (
                  <tr key={e.id} className="relative hover:bg-plaster">
                    <td className="max-w-md p-3">
                      {/* The subject link covers the whole row, so any part of it opens the email. */}
                      <Link href={href} className="block truncate font-semibold after:absolute after:inset-0">
                        {e.subject || "(no subject)"}
                      </Link>
                      <span className="block truncate text-[13px] text-muted">{e.from}</span>
                    </td>
                    <td className="whitespace-nowrap p-3">{e.supplierName ?? "Supplier"}</td>
                    <td className="tabular whitespace-nowrap p-3">
                      {e.orderId ? `#${e.orderNumber}` : <span className="text-danger">Not matched</span>}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${e.detectedStatus === "cancelled" ? "bg-danger text-white" : "bg-plaster"}`}>
                        {EMAIL_STATUS_LABEL[e.detectedStatus] ?? e.detectedStatus}
                      </span>
                      {e.trackingUrls.length > 0 && <span className="ml-2 text-[13px] text-moss">Tracking</span>}
                      {e.customerEmailedAt && <span className="ml-2 text-[13px] text-moss">Emailed</span>}
                    </td>
                    <td className="tabular whitespace-nowrap p-3 text-right text-[14px] text-muted">{e.receivedAt ? fmt.format(new Date(e.receivedAt)) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination path="/admin/supplier-emails" params={{ state }} page={list.page} perPage={SUPPLIER_EMAILS_PER_PAGE} total={list.total} />
    </div>
  );
}
