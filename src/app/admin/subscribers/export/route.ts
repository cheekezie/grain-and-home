import { isAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { siteConfig } from "@/lib/siteConfig";
import Subscriber from "@/models/Subscriber";

// CSV of email subscribers (not unsubscribed), with each person's
// unsubscribe link for the mail provider. Outside the (panel) group so it
// isn't wrapped in the admin layout; checks the session itself.
export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  await connectDB();
  const rows = await Subscriber.find({ unsubscribedAt: null }).sort({ createdAt: 1 }).lean();
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const lines = [
    ["email", "source", "signed_up", "consent_text", "unsubscribe_url"].join(","),
    ...rows.map((r) =>
      [r.email, r.source ?? "", (r.createdAt as Date | undefined)?.toISOString() ?? "", r.consentText, `${siteConfig.url}/unsubscribe?token=${r.unsubscribeToken}`]
        .map(cell)
        .join(","),
    ),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
