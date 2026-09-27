import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { lookupPostcode } from "@/lib/address";

// Light per-IP limit: paid lookups cost per request, and this endpoint is
// public. In-memory, so per server instance; enough to stop casual abuse.
const WINDOW = 10 * 60_000;
const LIMIT = 30;
const hits = new Map<string, number[]>();

export async function GET(request: Request) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) {
    return NextResponse.json({ ok: false, reason: "unavailable", message: "Too many lookups. Enter your address manually." }, { status: 429 });
  }
  hits.set(ip, [...recent, now]);

  const postcode = new URL(request.url).searchParams.get("postcode") ?? "";
  if (postcode.length > 10) return NextResponse.json({ ok: false, reason: "invalid", postcode }, { status: 400 });
  return NextResponse.json(await lookupPostcode(postcode));
}
