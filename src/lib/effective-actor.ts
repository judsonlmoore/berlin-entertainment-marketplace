import { getActorContext } from "@/src/db/queries/actor";
import type { ActorContext } from "@/src/domain/permissions";
import { applySupportOverlay } from "@/src/lib/support-overlay";
import {
  isSupportSubjectStillValid,
  resolveSupportEntity,
} from "@/src/lib/support-entity";
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
 *
 * Re-validates that the entity still exists and the cookie subject still
 * owns/operates it; clears the cookie if stale (eng-review 3B).
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

  const resolved = await resolveSupportEntity({
    entityType: support.entityType,
    entityId: support.entityId,
  });
  if (
    !isSupportSubjectStillValid({
      cookieSubjectUserId: support.subjectUserId,
      resolved,
    })
  ) {
    // Do not clearSupportSession() here — resolveEffectiveActor runs from
    // Server Components (e.g. app layout). Cookie deletes are only allowed in
    // Server Actions / Route Handlers. Ignore the stale session for this
    // request; TTL or exit-support action removes the cookie.
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
