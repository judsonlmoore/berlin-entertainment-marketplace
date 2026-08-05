/**
 * Legacy support-cookie bypass helpers — retired by eng-review CQ1B.
 * Marketplace writes go through resolveEffectiveActor / requireActor overlay.
 * Prefer actor.userId ownership checks; do not reintroduce cookie bypasses.
 */

import type { ActorContext } from "@/src/domain/permissions";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { auth } from "@/src/auth";

/** @deprecated Use resolveEffectiveActor / requireActor instead. */
export async function resolveSupportAwareActor(): Promise<ActorContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const resolved = await resolveEffectiveActor(session.user.id);
  return resolved?.actor ?? null;
}
