"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import { findOverlappingBlockingEntries } from "@/src/db/queries/calendar";
import {
  auditEvents,
  calendarEntries,
  entertainerProfiles,
  venueMemberships,
  venueSpaces,
} from "@/src/db/schema/marketplace";
import {
  canManuallySetCalendarState,
  requiresHoldExpiry,
  type CalendarOwnerType,
} from "@/src/domain/calendar";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";

async function assertOwnsResource(
  actorUserId: string,
  ownerType: CalendarOwnerType,
  ownerId: string,
) {
  const db = getDb();
  if (ownerType === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: and(
        eq(entertainerProfiles.id, ownerId),
        eq(entertainerProfiles.userId, actorUserId),
      ),
    });
    if (!profile) {
      throw new AppError("forbidden", "Not your entertainer calendar");
    }
    return;
  }

  const space = await db.query.venueSpaces.findFirst({
    where: eq(venueSpaces.id, ownerId),
  });
  if (!space) {
    throw new AppError("not_found", "Venue space not found");
  }
  const membership = await db.query.venueMemberships.findFirst({
    where: and(
      eq(venueMemberships.venueId, space.venueId),
      eq(venueMemberships.userId, actorUserId),
      eq(venueMemberships.status, "active"),
    ),
  });
  if (!membership) {
    throw new AppError("forbidden", "Not a venue operator for this space");
  }
}

const upsertSchema = z.object({
  ownerType: z.enum(["entertainer", "venue_space"]),
  ownerId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  state: z.enum(["available", "unavailable", "tentative_hold"]),
  holdExpiresAt: z.string().datetime({ offset: true }).optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function upsertAvailability(
  input: z.infer<typeof upsertSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = upsertSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid calendar entry");
    }
    if (!can(actor, "calendar.manage")) {
      throw new AppError("forbidden", "Calendar access denied");
    }
    if (!canManuallySetCalendarState(parsed.data.state)) {
      throw new AppError(
        "validation",
        "Cannot set that calendar state manually",
      );
    }

    await assertOwnsResource(
      session.user.id,
      parsed.data.ownerType,
      parsed.data.ownerId,
    );

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) {
      throw new AppError("validation", "End must be after start");
    }

    let holdExpiresAt: Date | null = null;
    if (requiresHoldExpiry(parsed.data.state)) {
      if (!parsed.data.holdExpiresAt) {
        throw new AppError("validation", "Holds require an expiry time");
      }
      holdExpiresAt = new Date(parsed.data.holdExpiresAt);
      const now = new Date();
      if (holdExpiresAt <= now) {
        throw new AppError("validation", "Hold expiry must be in the future");
      }
      if (holdExpiresAt > startsAt) {
        throw new AppError(
          "validation",
          "Hold expiry must be on or before the entry start",
        );
      }
    }

    if (
      parsed.data.state === "tentative_hold" ||
      parsed.data.state === "unavailable"
    ) {
      const conflicts = await findOverlappingBlockingEntries({
        ownerType: parsed.data.ownerType,
        ownerId: parsed.data.ownerId,
        startsAt,
        endsAt,
      });
      if (conflicts.length > 0) {
        throw new AppError("conflict", "Overlaps a blocking calendar entry");
      }
    }

    const db = getDb();
    let entryId: string | undefined;
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(calendarEntries)
        .values({
          ownerType: parsed.data.ownerType,
          ownerId: parsed.data.ownerId,
          startsAt,
          endsAt,
          state: parsed.data.state,
          holdExpiresAt,
          sourceType: "manual",
          sourceId: session.user.id,
        })
        .returning();
      if (!created) {
        throw new AppError("validation", "Failed to create calendar entry");
      }
      entryId = created.id;

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "calendar.entry_created",
        subjectType: "calendar_entry",
        subjectId: created.id,
        metadata: {
          ownerType: parsed.data.ownerType,
          ownerId: parsed.data.ownerId,
          state: parsed.data.state,
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    return { ok: true, ...(entryId ? { id: entryId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAvailability(
  entryId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    if (!can(actor, "calendar.manage")) {
      throw new AppError("forbidden", "Calendar access denied");
    }

    const db = getDb();
    const entry = await db.query.calendarEntries.findFirst({
      where: eq(calendarEntries.id, entryId),
    });
    if (!entry) {
      throw new AppError("not_found", "Calendar entry not found");
    }
    if (entry.state === "confirmed" || entry.state === "requested") {
      throw new AppError(
        "forbidden",
        "Requested and confirmed blocks change through booking lifecycle",
      );
    }

    await assertOwnsResource(
      session.user.id,
      entry.ownerType as CalendarOwnerType,
      entry.ownerId,
    );

    await db.transaction(async (tx) => {
      await tx.delete(calendarEntries).where(eq(calendarEntries.id, entryId));
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "calendar.entry_deleted",
        subjectType: "calendar_entry",
        subjectId: entryId,
        metadata: { state: entry.state },
      });
    });

    revalidatePath(`/${locale}/marketplace/calendar`);
    return { ok: true, id: entryId };
  } catch (error) {
    return toActionError(error);
  }
}
