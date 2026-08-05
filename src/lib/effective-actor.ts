import { getActorContext } from "@/src/db/queries/actor";
import type { ActorContext } from "@/src/domain/permissions";
import { applySupportOverlay } from "@/src/lib/support-overlay";
import {
  readSupportSession,
  type SupportSessionPayload,
} from "@/src/lib/support-session";

export type EffectiveActorResolution = {
  /** Marketplace actor — subject userId when support mode is active. */
  actor: ActorContext;
  /** Always the signed-in Auth.js user (staff when supporting). */
  auditUserId: string;
  /** Raw staff actor before overlay; equals actor when not supporting. */
  staffActor: ActorContext;
  support: SupportSessionPayload | null;
};

/**
 * Highest-level marketplace actor resolution. When platform staff has an
 * active support cookie, page content and permissions follow the subject
 * entity; Auth identity (avatar / audits) stays on the staff user.
 */
export async function resolveEffectiveActor(
  sessionUserId: string,
): Promise<EffectiveActorResolution | null> {
  const staffActor = await getActorContext(sessionUserId);
  if (!staffActor) return null;

  if (!staffActor.isPlatformStaff) {
    return {
      actor: staffActor,
      auditUserId: sessionUserId,
      staffActor,
      support: null,
    };
  }

  const support = await readSupportSession(sessionUserId);
  if (!support) {
    return {
      actor: staffActor,
      auditUserId: sessionUserId,
      staffActor,
      support: null,
    };
  }

  const subject = await getActorContext(support.subjectUserId);
  if (!subject) {
    return {
      actor: staffActor,
      auditUserId: sessionUserId,
      staffActor,
      support: null,
    };
  }

  return {
    actor: applySupportOverlay(staffActor, support, subject),
    auditUserId: sessionUserId,
    staffActor,
    support,
  };
}
