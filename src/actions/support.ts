"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireStaffActor,
  toActionError,
  type ActionResult,
} from "@/src/actions/_shared";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  entertainerProfiles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  SUPPORT_SESSION_TTL_MS,
  clearSupportSession,
  writeSupportSession,
  type SupportEntityType,
} from "@/src/lib/support-session";

const startSchema = z.object({
  entityType: z.enum(["entertainer", "venue"]),
  entityId: z.string().uuid(),
  locale: z.enum(["en", "de"]).default("en"),
});

async function resolveEntity(input: {
  entityType: SupportEntityType;
  entityId: string;
}): Promise<{ subjectUserId: string; label: string }> {
  const db = getDb();

  if (input.entityType === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, input.entityId),
      columns: { id: true, userId: true, actName: true },
    });
    if (!profile) {
      throw new AppError("not_found", "Entertainer profile not found");
    }
    return { subjectUserId: profile.userId, label: profile.actName };
  }

  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, input.entityId),
    columns: { id: true, name: true },
  });
  if (!venue) {
    throw new AppError("not_found", "Venue not found");
  }

  const membership = await db.query.venueMemberships.findFirst({
    where: and(
      eq(venueMemberships.venueId, venue.id),
      eq(venueMemberships.status, "active"),
      eq(venueMemberships.role, "owner"),
    ),
    columns: { userId: true },
  });

  if (!membership) {
    throw new AppError("validation", "Venue has no active owner to act as");
  }

  return { subjectUserId: membership.userId, label: venue.name };
}

/**
 * Start a support session: staff keeps their Auth.js identity and avatar,
 * but marketplace chrome / profile loads follow the selected business entity.
 */
export async function startSupportSession(
  input: z.input<typeof startSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireStaffActor();
    if (!can(actor, "admin.review_accounts")) {
      throw new AppError("forbidden", "Staff access required");
    }

    const parsed = startSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid support session request");
    }

    const entity = await resolveEntity(parsed.data);
    const exp = Date.now() + SUPPORT_SESSION_TTL_MS;

    await writeSupportSession({
      staffUserId: session.user!.id!,
      subjectUserId: entity.subjectUserId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      label: entity.label,
      exp,
    });

    const db = getDb();
    await db.insert(auditEvents).values({
      actorUserId: session.user!.id!,
      action: "support.session_started",
      subjectType: parsed.data.entityType,
      subjectId: parsed.data.entityId,
      metadata: {
        subjectUserId: entity.subjectUserId,
        label: entity.label,
        expiresAt: new Date(exp).toISOString(),
      },
    });

    revalidatePath(`/${parsed.data.locale}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function stopSupportSession(
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireStaffActor();
    if (!can(actor, "admin.review_accounts")) {
      throw new AppError("forbidden", "Staff access required");
    }

    await clearSupportSession();

    const db = getDb();
    await db.insert(auditEvents).values({
      actorUserId: session.user!.id!,
      action: "support.session_stopped",
      subjectType: "user",
      subjectId: session.user!.id!,
      metadata: {},
    });

    revalidatePath(`/${locale}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
