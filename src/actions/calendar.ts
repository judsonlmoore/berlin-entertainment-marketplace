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
  calendarRecurrenceExceptions,
  entertainerProfiles,
  venueMemberships,
  venueSpaces,
} from "@/src/db/schema/marketplace";
import {
  canManuallySetCalendarState,
  requiresHoldExpiry,
  type CalendarOwnerType,
} from "@/src/domain/calendar";
import {
  buildManualRRule,
  expandRecurringOccurrences,
} from "@/src/domain/calendar-recurrence";
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
  entryId: z.string().uuid().optional(),
  expectedVersion: z.number().int().optional(),
  ownerType: z.enum(["entertainer", "venue_space"]),
  ownerId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  /** Manual blockers only — open time is available by default. */
  state: z.enum(["unavailable", "tentative_hold"]),
  allDay: z.boolean().optional().default(false),
  title: z.string().max(120).optional(),
  privateNote: z.string().max(2000).optional(),
  holdExpiresAt: z.string().datetime({ offset: true }).optional(),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceCount: z.number().int().min(2).max(366).optional(),
  recurrenceUntil: z.string().datetime({ offset: true }).optional(),
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
      if (holdExpiresAt > endsAt) {
        throw new AppError(
          "validation",
          "Hold expiry must be on or before the block ends",
        );
      }
    }

    let recurrenceRule: string | null = null;
    if (parsed.data.recurrenceFrequency) {
      if (parsed.data.entryId) {
        throw new AppError(
          "validation",
          "Recurrence cannot be added when editing an existing entry",
        );
      }
      if (!parsed.data.recurrenceCount && !parsed.data.recurrenceUntil) {
        throw new AppError(
          "validation",
          "Recurring entries require a count or end date",
        );
      }
      recurrenceRule = buildManualRRule(startsAt, {
        frequency: parsed.data.recurrenceFrequency,
        ...(parsed.data.recurrenceCount
          ? { count: parsed.data.recurrenceCount }
          : {}),
        ...(parsed.data.recurrenceUntil
          ? { until: new Date(parsed.data.recurrenceUntil) }
          : {}),
      });
    }

    const windows = recurrenceRule
      ? expandRecurringOccurrences({
          startsAt,
          endsAt,
          recurrenceRule,
          rangeStart: startsAt,
          rangeEnd: parsed.data.recurrenceUntil
            ? new Date(parsed.data.recurrenceUntil)
            : new Date(startsAt.getTime() + 366 * 24 * 60 * 60 * 1000),
          maxOccurrences: parsed.data.recurrenceCount ?? 366,
        })
      : [{ startsAt, endsAt }];

    for (const window of windows) {
      const conflicts = await findOverlappingBlockingEntries({
        ownerType: parsed.data.ownerType,
        ownerId: parsed.data.ownerId,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        ...(parsed.data.entryId ? { excludeId: parsed.data.entryId } : {}),
      });
      if (conflicts.length > 0) {
        throw new AppError("conflict", "Overlaps a blocking calendar entry");
      }
    }

    const db = getDb();
    let entryId: string | undefined;

    if (parsed.data.entryId) {
      const existing = await db.query.calendarEntries.findFirst({
        where: eq(calendarEntries.id, parsed.data.entryId),
      });
      if (!existing) {
        throw new AppError("not_found", "Calendar entry not found");
      }
      if (
        existing.ownerType !== parsed.data.ownerType ||
        existing.ownerId !== parsed.data.ownerId
      ) {
        throw new AppError("forbidden", "Calendar entry owner mismatch");
      }
      if (!canManuallySetCalendarState(existing.state)) {
        throw new AppError(
          "forbidden",
          "Requested and confirmed blocks change through booking lifecycle",
        );
      }
      if (existing.recurrenceRule) {
        throw new AppError(
          "forbidden",
          "Recurring series cannot be edited here yet",
        );
      }

      await db.transaction(async (tx) => {
        const expectedVersion =
          parsed.data.expectedVersion ?? existing.version;
        const [updated] = await tx
          .update(calendarEntries)
          .set({
            startsAt,
            endsAt,
            state: parsed.data.state,
            holdExpiresAt,
            allDay: parsed.data.allDay ?? false,
            title: parsed.data.title ?? null,
            privateNote: parsed.data.privateNote ?? null,
            updatedAt: new Date(),
            version: expectedVersion + 1,
          })
          .where(
            and(
              eq(calendarEntries.id, existing.id),
              eq(calendarEntries.version, expectedVersion),
            ),
          )
          .returning();
        if (!updated) {
          throw new AppError(
            "conflict",
            "Calendar entry was updated concurrently; please refresh",
          );
        }
        entryId = updated.id;

        await tx.insert(auditEvents).values({
          actorUserId: session.user.id,
          action: "calendar.entry_updated",
          subjectType: "calendar_entry",
          subjectId: updated.id,
          metadata: {
            ownerType: parsed.data.ownerType,
            ownerId: parsed.data.ownerId,
            state: parsed.data.state,
          },
        });
      });
    } else {
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
            allDay: parsed.data.allDay,
            title: parsed.data.title ?? null,
            privateNote: parsed.data.privateNote ?? null,
            recurrenceRule,
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
            recurrenceRule,
          },
        });
      });
    }

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

const moveSchema = z.object({
  entryId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  expectedVersion: z.number().int().optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function moveCalendarEntry(
  input: z.infer<typeof moveSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = moveSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid calendar entry move");
    }

    if (!can(actor, "calendar.manage")) {
      throw new AppError("forbidden", "Calendar access denied");
    }

    const db = getDb();
    const entry = await db.query.calendarEntries.findFirst({
      where: eq(calendarEntries.id, parsed.data.entryId),
    });
    if (!entry) {
      throw new AppError("not_found", "Calendar entry not found");
    }

    if (!canManuallySetCalendarState(entry.state)) {
      throw new AppError(
        "forbidden",
        "Only manual availability/blocks/holds can be moved",
      );
    }
    if (entry.recurrenceRule) {
      throw new AppError(
        "forbidden",
        "Recurring series cannot be dragged; edit the series or create an exception",
      );
    }

    await assertOwnsResource(
      session.user.id,
      entry.ownerType as CalendarOwnerType,
      entry.ownerId,
    );

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) {
      throw new AppError("validation", "End must be after start");
    }

    if (entry.state === "tentative_hold") {
      if (!entry.holdExpiresAt) {
        throw new AppError("validation", "Hold expiry is missing");
      }
      if (entry.holdExpiresAt > endsAt) {
        throw new AppError(
          "validation",
          "Hold expiry must be on or before the block ends",
        );
      }
    }

    const now = new Date();
    const conflicts = await findOverlappingBlockingEntries({
      ownerType: entry.ownerType as CalendarOwnerType,
      ownerId: entry.ownerId,
      startsAt,
      endsAt,
      excludeId: entry.id,
      now,
    });

    if (conflicts.length > 0) {
      throw new AppError("conflict", "Overlaps a blocking calendar entry", {
        conflictIds: conflicts.map((row) => row.id),
      });
    }

    await db.transaction(async (tx) => {
      const updatedAt = now;

      const expectedVersion = parsed.data.expectedVersion;

      const [updated] =
        expectedVersion !== undefined
          ? await tx
              .update(calendarEntries)
              .set({
                startsAt,
                endsAt,
                updatedAt,
                version: expectedVersion + 1,
              })
              .where(
                and(
                  eq(calendarEntries.id, entry.id),
                  eq(calendarEntries.version, expectedVersion),
                ),
              )
              .returning()
          : await tx
              .update(calendarEntries)
              .set({
                startsAt,
                endsAt,
                updatedAt,
                version: entry.version + 1,
              })
              .where(eq(calendarEntries.id, entry.id))
              .returning();

      if (!updated) {
        throw new AppError(
          "conflict",
          "Calendar entry was updated concurrently; please refresh",
        );
      }

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "calendar.entry_moved",
        subjectType: "calendar_entry",
        subjectId: entry.id,
        metadata: {
          ownerType: entry.ownerType,
          ownerId: entry.ownerId,
          state: entry.state,
          startsAt: updated.startsAt.toISOString(),
          endsAt: updated.endsAt.toISOString(),
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    return { ok: true, id: parsed.data.entryId };
  } catch (error) {
    return toActionError(error);
  }
}

const skipOccurrenceSchema = z.object({
  parentEntryId: z.string().uuid(),
  exceptionStartsAt: z.string().datetime({ offset: true }),
  locale: z.enum(["en", "de"]).default("en"),
});

/** Skip a single occurrence of a recurring manual series (EXDATE). */
export async function skipRecurringOccurrence(
  input: z.infer<typeof skipOccurrenceSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor } = await requireActor();
    const parsed = skipOccurrenceSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid recurrence exception");
    }
    if (!can(actor, "calendar.manage")) {
      throw new AppError("forbidden", "Calendar access denied");
    }

    const db = getDb();
    const parent = await db.query.calendarEntries.findFirst({
      where: eq(calendarEntries.id, parsed.data.parentEntryId),
    });
    if (!parent?.recurrenceRule) {
      throw new AppError("validation", "Not a recurring calendar entry");
    }
    if (!canManuallySetCalendarState(parent.state)) {
      throw new AppError("forbidden", "Only manual series support exceptions");
    }

    await assertOwnsResource(
      session.user.id,
      parent.ownerType as CalendarOwnerType,
      parent.ownerId,
    );

    await db.transaction(async (tx) => {
      await tx.insert(calendarRecurrenceExceptions).values({
        parentEntryId: parent.id,
        exceptionStartsAt: new Date(parsed.data.exceptionStartsAt),
        kind: "skip",
      });
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        action: "calendar.recurrence_exception_created",
        subjectType: "calendar_entry",
        subjectId: parent.id,
        metadata: {
          exceptionStartsAt: parsed.data.exceptionStartsAt,
          kind: "skip",
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/calendar`);
    return { ok: true, id: parent.id };
  } catch (error) {
    return toActionError(error);
  }
}
