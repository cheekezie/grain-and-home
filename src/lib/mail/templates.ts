import { siteConfig } from "@/lib/siteConfig";

// Customer emails about an order, always from us, never naming the supplier.

export type CustomerUpdateKind = "ordered" | "dispatched" | "out_for_delivery" | "delivered";

export const UPDATE_LABELS: Record<CustomerUpdateKind, string> = {
  ordered: "Being prepared",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function orderUpdateEmail(input: {
  kind: CustomerUpdateKind;
  orderNumber: number;
  customerName?: string;
  items: { name: string; quantity: number }[];
  trackingUrl?: string;
  postcode?: string;
}) {
  const first = input.customerName?.trim().split(/\s+/)[0];
  const shop = siteConfig.name;
  const lines: Record<CustomerUpdateKind, { subject: string; lead: string }> = {
    ordered: { subject: `Your ${shop} order #${input.orderNumber} is being prepared`, lead: `Your order #${input.orderNumber} is being prepared for delivery. We'll email you again when it's on its way.` },
    dispatched: { subject: `Your ${shop} order #${input.orderNumber} is on its way`, lead: `Good news: your order #${input.orderNumber} has been dispatched.` },
    out_for_delivery: { subject: `Your ${shop} order #${input.orderNumber} is out for delivery`, lead: `Your order #${input.orderNumber} is out for delivery today.` },
    delivered: { subject: `Your ${shop} order #${input.orderNumber} has been delivered`, lead: `Your order #${input.orderNumber} has been delivered. We hope you love it.` },
  };
  const { subject, lead } = lines[input.kind];
  const items = input.items.map((i) => `${i.quantity} × ${i.name}`);
  const help = siteConfig.business.email
    ? `Any questions, just reply to this email or write to ${siteConfig.business.email}.`
    : "Any questions, just reply to this email.";
  const after =
    input.kind === "delivered"
      ? `If anything isn't right, you have 14 days to change your mind: ${siteConfig.url}/returns`
      : undefined;

  const text = [
    `Hi${first ? ` ${first}` : ""},`,
    "",
    lead,
    "",
    ...items,
    ...(input.trackingUrl ? ["", `Track your delivery: ${input.trackingUrl}`] : []),
    ...(input.postcode && input.kind !== "delivered" ? ["", `Delivering to ${input.postcode}.`] : []),
    ...(after ? ["", after] : []),
    "",
    help,
    "",
    "Thanks,",
    shop,
    siteConfig.url,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f1f0ed;font-family:Helvetica,Arial,sans-serif;color:#1e1c1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:24px">${esc(shop)}</td></tr>
<tr><td style="padding:8px 28px 0;font-size:16px;line-height:1.55">
<p>Hi${first ? ` ${esc(first)}` : ""},</p>
<p>${esc(lead)}</p>
<ul style="padding-left:20px">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
${input.trackingUrl ? `<p><a href="${esc(input.trackingUrl)}" style="display:inline-block;background:#3e5c4a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Track your delivery</a></p>` : ""}
${input.postcode && input.kind !== "delivered" ? `<p style="color:#6a655e">Delivering to ${esc(input.postcode)}.</p>` : ""}
${after ? `<p>${esc(after)}</p>` : ""}
<p>${esc(help)}</p>
<p>Thanks,<br>${esc(shop)}</p>
</td></tr>
<tr><td style="padding:16px 28px 28px;font-size:13px;color:#6a655e"><a href="${esc(siteConfig.url)}" style="color:#6a655e">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

const gbp = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

/** Sent as soon as payment goes through. */
export function orderConfirmationEmail(input: {
  orderNumber: number;
  customerName?: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  discount: number;
  promoCode?: string;
  total: number;
  address?: { name?: string; line1?: string; line2?: string; city?: string; postalCode?: string };
  deliveryEstimate?: string;
}) {
  const shop = siteConfig.name;
  const first = input.customerName?.trim().split(/\s+/)[0];
  const subject = `Your ${shop} order #${input.orderNumber} is confirmed`;
  const subtotal = input.items.reduce((n, i) => n + i.lineTotal, 0);
  const addr = [input.address?.name, input.address?.line1, input.address?.line2, input.address?.city, input.address?.postalCode].filter(Boolean) as string[];
  const next = [
    input.deliveryEstimate ? `${input.deliveryEstimate}.` : "We'll deliver as soon as we can.",
    "We'll email you when it's on its way, with a link to track it.",
  ].join(" ");
  const help = siteConfig.business.email ? `Questions? Reply to this email or write to ${siteConfig.business.email}.` : "Questions? Just reply to this email.";

  const text = [
    `Hi${first ? ` ${first}` : ""},`,
    "",
    `Thank you for your order. Order #${input.orderNumber} is confirmed and paid.`,
    "",
    ...input.items.map((i) => `${i.quantity} × ${i.name}  ${gbp(i.lineTotal)}`),
    "",
    ...(input.discount > 0 ? [`Subtotal: ${gbp(subtotal)}`, `Discount${input.promoCode ? ` (${input.promoCode})` : ""}: −${gbp(input.discount)}`] : []),
    "Delivery (mainland UK): Free",
    `Total paid: ${gbp(input.total)}`,
    ...(addr.length ? ["", "Delivering to:", ...addr] : []),
    "",
    next,
    "",
    `You can cancel within 14 days of delivery: ${siteConfig.url}/returns`,
    help,
    "",
    "Thanks,",
    shop,
    siteConfig.url,
  ].join("\n");

  const row = (l: string, r: string, bold = false) =>
    `<tr><td style="padding:6px 0;${bold ? "font-weight:bold;" : ""}">${esc(l)}</td><td align="right" style="padding:6px 0;white-space:nowrap;${bold ? "font-weight:bold;" : ""}">${esc(r)}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f1f0ed;font-family:Helvetica,Arial,sans-serif;color:#1e1c1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:24px">${esc(shop)}</td></tr>
<tr><td style="padding:8px 28px 0;font-size:16px;line-height:1.55">
<p>Hi${first ? ` ${esc(first)}` : ""},</p>
<p>Thank you for your order. <strong>Order #${input.orderNumber}</strong> is confirmed and paid.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;border-top:1px solid #e4e1dc;border-bottom:1px solid #e4e1dc;margin:12px 0">
${input.items.map((i) => row(`${i.quantity} × ${i.name}`, gbp(i.lineTotal))).join("")}
${input.discount > 0 ? row("Subtotal", gbp(subtotal)) + row(`Discount${input.promoCode ? ` (${input.promoCode})` : ""}`, `−${gbp(input.discount)}`) : ""}
${row("Delivery (mainland UK)", "Free")}
${row("Total paid", gbp(input.total), true)}
</table>
${addr.length ? `<p style="margin-bottom:4px"><strong>Delivering to</strong></p><p style="margin-top:0">${addr.map(esc).join("<br>")}</p>` : ""}
<p>${esc(next)}</p>
<p style="font-size:14px;color:#6a655e">You can cancel within 14 days of delivery. <a href="${esc(siteConfig.url)}/returns" style="color:#3e5c4a">Returns and cancellations</a></p>
<p>${esc(help)}</p>
<p>Thanks,<br>${esc(shop)}</p>
</td></tr>
<tr><td style="padding:16px 28px 28px;font-size:13px;color:#6a655e"><a href="${esc(siteConfig.url)}" style="color:#6a655e">${esc(siteConfig.url.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
