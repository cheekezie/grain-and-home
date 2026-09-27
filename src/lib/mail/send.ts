import "server-only";
import { sendingConfig } from "./config";

/**
 * Send an email through ZeptoMail's API (not SMTP). Throws a plain
 * message if email isn't set up or ZeptoMail rejects it. Returns
 * ZeptoMail's request id for tracing in its logs.
 */
export async function sendMail(msg: { to: string; toName?: string; subject: string; text: string; html?: string }): Promise<string | null> {
  const cfg = sendingConfig();
  if (!cfg) throw new Error("Email isn't set up yet: add ZOHO_ZEPTOMAIL_TOKEN and ZOHO_ZEPTOMAIL_FROM (see README).");
  const body: Record<string, unknown> = {
    from: { address: cfg.from, name: cfg.fromName },
    to: [{ email_address: { address: msg.to, ...(msg.toName && { name: msg.toName }) } }],
    subject: msg.subject,
    textbody: msg.text,
    ...(msg.html && { htmlbody: msg.html }),
    ...(cfg.replyTo && { reply_to: [{ address: cfg.replyTo, name: cfg.fromName }] }),
  };
  let res: Response;
  try {
    res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: { Authorization: `Zoho-enczapikey ${cfg.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    console.error("[zeptomail] request failed:", (e as Error).message);
    throw new Error(`The email couldn't be sent: ZeptoMail didn't respond (${(e as Error).message}).`);
  }
  const data = (await res.json().catch(() => null)) as { request_id?: string; error?: { message?: string; details?: { message?: string }[] } } | null;
  if (!res.ok) {
    const reason = data?.error?.details?.[0]?.message || data?.error?.message || `HTTP ${res.status}`;
    console.error("[zeptomail] rejected", { to: msg.to, subject: msg.subject, status: res.status, reason });
    throw new Error(`The email couldn't be sent: ZeptoMail said “${reason}”. Check the ZeptoMail settings.`);
  }
  return data?.request_id ?? null;
}
