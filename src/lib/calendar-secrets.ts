import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.CALENDAR_SECRETS_KEY ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "CALENDAR_SECRETS_KEY or AUTH_SECRET is required for calendar secret storage",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a plaintext secret (e.g. legacy ICS feed URL) for at-rest storage. */
export function encryptSecret(plaintext: string): {
  ciphertext: string;
  nonce: string;
} {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: nonce.toString("base64"),
  };
}

export function decryptSecret(ciphertextB64: string, nonceB64: string): string {
  const raw = Buffer.from(ciphertextB64, "base64");
  const nonce = Buffer.from(nonceB64, "base64");
  const tag = raw.subarray(raw.length - 16);
  const data = raw.subarray(0, raw.length - 16);
  const decipher = createDecipheriv(ALGO, getKey(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/** Hash an export token for storage (never store the raw token). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateExportToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Stable subscribe token for one calendar resource.
 * Deterministic so the URL can be shown again without storing the raw secret.
 */
export function deriveExportToken(ownerType: string, ownerId: string): string {
  return createHmac("sha256", getKey())
    .update(`calendar-export:v1:${ownerType}:${ownerId}`)
    .digest("base64url");
}
