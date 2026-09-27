import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not set — see .env.example");
  // Hash both sides so the comparison doesn't leak the password's length.
  const digest = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEqual(digest(input), digest(expected));
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

// Best-effort brute-force brake: per-IP failure count, in memory. On a
// serverless host each instance keeps its own count, so this slows an
// attacker down rather than stopping one; the long random password is
// the real protection.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export function loginBlocked(ip: string): boolean {
  const f = failures.get(ip);
  return !!f && f.count >= MAX_FAILURES && f.until > Date.now();
}

export function recordLoginFailure(ip: string): void {
  const f = failures.get(ip);
  const fresh = !f || f.until < Date.now();
  failures.set(ip, { count: fresh ? 1 : f.count + 1, until: Date.now() + WINDOW_MS });
}

export function clearLoginFailures(ip: string): void {
  failures.delete(ip);
}
