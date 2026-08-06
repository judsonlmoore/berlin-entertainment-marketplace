"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireStaffActor,
  toActionError,
  type ActionResult,
} from "@/src/actions/_shared";
import { getDb } from "@/src/db/client";
import { auditEvents } from "@/src/db/schema/marketplace";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import { resolveSupportEntity } from "@/src/lib/support-entity";
import {
  SUPPORT_SESSION_TTL_MS,
  clearSupportSession,
  writeSupportSession,
} from "@/src/lib/support-session";

const startSchema = z.object({
  entityType: z.enum(["entertainer", "venue"]),
  entityId: z.string().uuid(),
  locale: z.enum(["en", "de"]).default("en"),
});

/**
 * Start a support session: staff keeps their Auth.js identity and avatar,
 * but marketplace chrome / profile loads follow the selected business entity.
 */
export async function startSupportSession(
  input: z.input<typeof startSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireStaffActor();
    if (!can(actor, "admin.review_accounts")) {
      throw new AppError("forbidden", "Staff access required");
    }

    const parsed = startSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid support session request");
    }

    const entity = await resolveSupportEntity(parsed.data);
    if (!entity) {
      throw new AppError(
        parsed.data.entityType === "venue" ? "validation" : "not_found",
        parsed.data.entityType === "venue"
          ? "Venue has no active owner to act as"
          : "Entertainer profile not found",
      );
    }
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
      actorUserId: auditUserId,
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
    const { session, actor, auditUserId } = await requireStaffActor();
    if (!can(actor, "admin.review_accounts")) {
      throw new AppError("forbidden", "Staff access required");
    }

    await clearSupportSession();

    const db = getDb();
    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
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
