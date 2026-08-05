import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SUPPORT_SESSION_COOKIE = "salon_support_entity";

/** Max support session length (8 hours). */
export const SUPPORT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type SupportEntityType = "entertainer" | "venue";

export type SupportSessionPayload = {
  /** Signed-in staff user — must match session.user.id */
  staffUserId: string;
  /** Member account that owns / operates the entity */
  subjectUserId: string;
  entityType: SupportEntityType;
  entityId: string;
  /** Display label for banner / rail */
  label: string;
  exp: number;
};

function signingKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for support sessions");
  }
  return Buffer.from(secret, "utf8");
}

function sign(body: string): string {
  return createHmac("sha256", signingKey()).update(body).digest("base64url");
}

export function encodeSupportSession(payload: SupportSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

export function decodeSupportSession(
  raw: string | undefined | null,
): SupportSessionPayload | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SupportSessionPayload;
    if (
      !parsed.staffUserId ||
      !parsed.subjectUserId ||
      !parsed.entityType ||
      !parsed.entityId ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    if (parsed.entityType !== "entertainer" && parsed.entityType !== "venue") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function readSupportSession(
  staffUserId: string,
): Promise<SupportSessionPayload | null> {
  const jar = await cookies();
  const payload = decodeSupportSession(jar.get(SUPPORT_SESSION_COOKIE)?.value);
  if (!payload) return null;
  if (payload.staffUserId !== staffUserId) return null;
  return payload;
}

export async function writeSupportSession(
  payload: SupportSessionPayload,
): Promise<void> {
  const jar = await cookies();
  jar.set(SUPPORT_SESSION_COOKIE, encodeSupportSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.exp),
  });
}

export async function clearSupportSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SUPPORT_SESSION_COOKIE);
}
