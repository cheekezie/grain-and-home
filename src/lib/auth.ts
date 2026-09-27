import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "./db";
import AuthThrottle from "@/models/AuthThrottle";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  safeEqual,
  signSession,
  verifySession,
} from "./session-token";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * The real authorization check. The proxy only redirects early for a nicer
 * experience; every admin page and server action calls this itself, since
 * server actions can be invoked directly without passing through a page.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/**
 * The admin signs in with a 6-digit access code (ADMIN_ACCESS_CODE; the
 * old ADMIN_PASSWORD is still read if the new one isn't set). Short codes
 * are only safe with strict attempt limits: see the throttle below.
 */
export function accessCodeMatches(input: string): boolean {
  const expected = (process.env.ADMIN_ACCESS_CODE ?? process.env.ADMIN_PASSWORD)?.trim();
  if (!expected) throw new Error("ADMIN_ACCESS_CODE is not set; see .env.example");
  const typed = input.replace(/\s/g, "");
  // Hash both sides so the comparison takes the same time whatever is typed.
  const digest = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEqual(digest(typed), digest(expected));
}

export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Brute-force brake for the 6-digit code (a million possibilities), kept
// in the database so restarts and extra server instances don't reset it:
// - per connection: 5 wrong codes → locked for 15 minutes;
// - whole site: 30 wrong codes within an hour, from anywhere → sign-in
//   paused for an hour, which stops guessing spread over many connections.
// At most ~720 guesses a day: guessing a random code would take years.
const PER_IP = { max: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const GLOBAL = { max: 30, windowMs: 60 * 60_000, lockMs: 60 * 60_000 };

const ipKey = (ip: string) => `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;

export async function loginBlocked(ip: string): Promise<string | null> {
  await connectDB();
  const now = new Date();
  const locks = await AuthThrottle.find({ _id: { $in: [ipKey(ip), "global"] }, lockedUntil: { $gt: now } }).lean();
  if (locks.some((l) => l._id === "global")) return "Sign-in is paused for an hour after too many wrong codes. Try again later.";
  if (locks.length) return "Too many wrong codes. Wait 15 minutes and try again.";
  return null;
}

async function bump(key: string, rule: typeof PER_IP) {
  const now = Date.now();
  const doc = await AuthThrottle.findById(key).lean();
  const fresh = !doc || now - new Date(doc.windowStart as Date).getTime() > rule.windowMs;
  const count = fresh ? 1 : (doc!.count as number) + 1;
  await AuthThrottle.updateOne(
    { _id: key },
    {
      $set: {
        count,
        windowStart: fresh ? new Date(now) : doc!.windowStart,
        ...(count >= rule.max ? { lockedUntil: new Date(now + rule.lockMs) } : {}),
      },
    },
    { upsert: true },
  );
}

export async function recordLoginFailure(ip: string): Promise<void> {
  await connectDB();
  await Promise.all([bump(ipKey(ip), PER_IP), bump("global", GLOBAL)]);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await connectDB();
  await AuthThrottle.deleteOne({ _id: ipKey(ip) });
}
