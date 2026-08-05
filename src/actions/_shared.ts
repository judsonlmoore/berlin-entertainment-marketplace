import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { AppError } from "@/src/domain/errors";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import type { SupportSessionPayload } from "@/src/lib/support-session";
import type { ActorContext } from "@/src/domain/permissions";

export type ActionResult =
  | {
      ok: true;
      id?: string;
      uploadUrl?: string;
      key?: string;
      expired?: number;
      expiredHolds?: number;
      expiredRequests?: number;
    }
  | { ok: false; code: string; message: string };

export function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

export type RequiredActor = {
  session: NonNullable<Awaited<ReturnType<typeof auth>>> & {
    user: { id: string };
  };
  /** Marketplace actor (subject when support mode is active). */
  actor: ActorContext;
  /** Always the signed-in user — use for audits and Auth identity. */
  auditUserId: string;
  support: SupportSessionPayload | null;
};

/**
 * Marketplace actions: applies support overlay so content/ownership follows
 * the supported entity. Audits must use `auditUserId`, not `actor.userId`.
 */
export async function requireActor(): Promise<RequiredActor> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("unauthorized", "Sign in required");
  }
  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return {
    session: session as RequiredActor["session"],
    actor: resolved.actor,
    auditUserId: resolved.auditUserId,
    support: resolved.support,
  };
}

/**
 * Staff/admin actions that must never follow a support overlay
 * (e.g. start/stop support, account suspend).
 */
export async function requireStaffActor() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("unauthorized", "Sign in required");
  }
  const actor = await getActorContext(session.user.id);
  if (!actor) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return { session, actor, auditUserId: session.user.id };
}
