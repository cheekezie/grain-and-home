import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db";
import WebhookSecret from "@/models/WebhookSecret";
import { recordSupplierEmail, supplierForAddress, type IncomingEmail } from "@/lib/mail/orderUpdates";
import { htmlToText } from "@/lib/mail/parse";

// Zoho Mail outgoing webhook: Zoho pushes supplier emails here the moment
// they arrive (set up in Zoho Mail: Settings → Integrations → Developer
// Space → Outgoing Webhooks, with a rule like "From contains wayfair").
//
// Two locks:
// 1. The URL carries ?key=ZOHO_MAIL_WEBHOOK_KEY, so only someone given the
//    exact address (Zoho) can call it.
// 2. Zoho signs every request: x-hook-signature = base64(HMAC-SHA256(body,
//    secret)). The secret arrives once, as x-hook-secret, on the validation
//    call Zoho makes when the webhook is saved (that call must get a 200).
//    We keep it and check every call after that. (Or set
//    ZOHO_MAIL_WEBHOOK_SECRET yourself.)
const ID = "zoho-mail";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  const key = process.env.ZOHO_MAIL_WEBHOOK_KEY?.trim();
  const given = new URL(request.url).searchParams.get("key") ?? "";
  if (!key || !safeEqual(given, key)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const raw = await request.text();
  await connectDB();
  const offered = request.headers.get("x-hook-secret")?.trim();
  if (offered) {
    // Zoho's validation call when the webhook is saved (or re-saved): it
    // carries the signing secret and must get a 200 or Zoho won't save the
    // webhook. The URL key already proved it's Zoho, so keep the new secret.
    await WebhookSecret.updateOne(
      { _id: ID },
      { $set: { secret: offered, connectedAt: new Date(), lastCallAt: new Date(), lastResult: "Connected" } },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  }
  const stored = (await WebhookSecret.findById(ID).lean()) as { secret?: string } | null;
  const secret = process.env.ZOHO_MAIL_WEBHOOK_SECRET?.trim() || stored?.secret;
  if (secret) {
    const expected = createHmac("sha256", secret).update(raw, "utf8").digest("base64");
    const signature = request.headers.get("x-hook-signature")?.trim() ?? "";
    if (!safeEqual(signature, expected)) {
      const why = signature ? "bad signature" : "no signature header";
      await WebhookSecret.updateOne({ _id: ID }, { $set: { lastCallAt: new Date(), lastResult: `Rejected: ${why}` } }, { upsert: true });
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  }

  let p: Record<string, unknown>;
  try {
    p = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ error: "Not JSON" }, { status: 400 });
  }
  // Zoho may send a test/handshake call with no email in it.
  const fromAddress = String(p.fromAddress ?? "").replace(/^.*<([^>]+)>.*$/, "$1").trim();
  if (!fromAddress || !p.subject) {
    await WebhookSecret.updateOne({ _id: ID }, { $set: { lastCallAt: new Date(), lastResult: "Connected (test call)" } }, { upsert: true });
    return NextResponse.json({ ok: true });
  }

  const supplier = await supplierForAddress(fromAddress);
  if (!supplier) {
    await WebhookSecret.updateOne({ _id: ID }, { $set: { lastCallAt: new Date(), lastResult: `Ignored: ${fromAddress} isn't a supplier's domain` } }, { upsert: true });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const html = String(p.html ?? "");
  const zohoId = String(p.messageIdString ?? p.messageId ?? "").trim();
  const sent = Number(p.sentDateInGMT ?? p.receivedTime);
  const mail: IncomingEmail = {
    messageId: zohoId ? `zoho-${zohoId}` : `zoho-${sent}-${String(p.subject)}`,
    from: p.sender ? `${String(p.sender)} <${fromAddress}>` : fromAddress,
    fromAddress,
    subject: String(p.subject),
    date: Number.isFinite(sent) && sent > 0 ? new Date(sent) : new Date(),
    text: htmlToText(html) || String(p.summary ?? ""),
    html,
  };
  const doc = await recordSupplierEmail(mail, supplier);
  await WebhookSecret.updateOne(
    { _id: ID },
    { $set: { lastCallAt: new Date(), lastResult: doc ? `Received: ${mail.subject}` : `Already had: ${mail.subject}` } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
