import type { ActorContext } from "@/src/domain/permissions";
import { can } from "@/src/domain/permissions";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import {
  readSupportSession,
  type SupportSessionPayload,
} from "@/src/lib/support-session";
import { auth } from "@/src/auth";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { entertainerProfiles } from "@/src/db/schema/marketplace";

/**
 * Resolve which member account a staff support session is operating for.
 * Cookie is always keyed by the signed-in staff user id.
 */
export async function getActiveSupportSession(
  _actor?: ActorContext,
): Promise<SupportSessionPayload | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.isPlatformStaff) return null;
  return readSupportSession(session.user.id);
}

/** True when staff may manage this venue via support session. */
export async function canManageVenueViaSupport(
  _actor: ActorContext,
  venueId: string,
): Promise<boolean> {
  const support = await getActiveSupportSession();
  return support?.entityType === "venue" && support.entityId === venueId;
}

/** True when staff may manage this entertainer profile via support session. */
export async function canManageEntertainerViaSupport(
  _actor: ActorContext,
  entertainerProfileId: string,
): Promise<boolean> {
  const support = await getActiveSupportSession();
  return (
    support?.entityType === "entertainer" &&
    support.entityId === entertainerProfileId
  );
}

/**
 * Target user id for entertainer profile upserts: support subject or self.
 */
export async function resolveEntertainerProfileOwnerUserId(
  actor: ActorContext,
): Promise<string | null> {
  if (can(actor, "entertainer.manage_own_profile")) {
    return actor.userId;
  }
  const support = await getActiveSupportSession();
  if (support?.entityType === "entertainer") {
    return support.subjectUserId;
  }
  return null;
}

export async function assertCanWriteEntertainerProfile(
  actor: ActorContext,
  entertainerProfileId: string,
): Promise<boolean> {
  if (can(actor, "entertainer.manage_own_profile")) {
    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, entertainerProfileId),
      columns: { userId: true },
    });
    return Boolean(profile && profile.userId === actor.userId);
  }
  return canManageEntertainerViaSupport(actor, entertainerProfileId);
}

/** Convenience: effective marketplace actor for the current session. */
export async function resolveSupportAwareActor(): Promise<ActorContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const resolved = await resolveEffectiveActor(session.user.id);
  return resolved?.actor ?? null;
}
