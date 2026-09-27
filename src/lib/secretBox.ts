import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Encrypts secrets we must keep in the database (e.g. the ordering inbox's
// app password) with AES-256-GCM. The key comes from SETTINGS_ENCRYPTION_KEY
// in the environment, so a copy of the database alone can't reveal them.
// Changing the key means re-entering those secrets in the admin.

function key(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 24) throw new Error("SETTINGS_ENCRYPTION_KEY isn't set (a long random string in the settings file).");
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(box: string): string {
  const [v, iv, tag, data] = box.split(":");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Stored secret is unreadable.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
