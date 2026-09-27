// Signed admin session token: "<expiry-ms>.<hmac>". Web Crypto only, so
// the same code runs in the proxy and in server components/actions.
// There's a single admin, so the token carries no identity — only proof
// that whoever holds it knew the password before `expiry`.

export const SESSION_COOKIE = "store_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

async function hmac(message: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters — see .env.example");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(sig).toString("base64url");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function signSession(expiresAt: number): Promise<string> {
  return `${expiresAt}.${await hmac(`admin.${expiresAt}`)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  const expiresAt = Number(exp);
  if (!sig || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(sig, await hmac(`admin.${expiresAt}`));
}
