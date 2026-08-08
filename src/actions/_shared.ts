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
  | {
      ok: false;
      code: string;
      message: string;
      /** Form field name when validation points at a specific input. */
      field?: string;
      /** All field-level validation issues (publish checklist, etc.). */
      fields?: Record<string, string>;
    };

export function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    const field =
      typeof error.details?.field === "string"
        ? error.details.field
        : undefined;
    const fields =
      error.details?.fields &&
      typeof error.details.fields === "object" &&
      !Array.isArray(error.details.fields)
        ? (error.details.fields as Record<string, string>)
        : undefined;
    return {
      ok: false,
      code: error.code,
      message: error.message,
      ...(field ? { field } : {}),
      ...(fields ? { fields } : {}),
    };
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
    session: session as unknown as RequiredActor["session"],
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
