import { NextResponse } from "next/server";
import { syncInbox } from "@/lib/mail/inbox";

// Scheduled inbox check (e.g. Vercel Cron every 15 minutes). Protected by
// CRON_SECRET: Vercel sends it as "Authorization: Bearer <secret>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json(await syncInbox());
}
