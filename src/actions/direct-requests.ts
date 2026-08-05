"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/src/db/client";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import { expireOverdueDirectRequests } from "@/src/db/queries/direct-requests";
import { settleMatchAcceptance } from "@/src/db/queries/match-settlement";
import {
  auditEvents,
  bookingTerms,
  bookings,
  directRequests,
  entertainerProfiles,
  venues,
} from "@/src/db/schema/marketplace";
import {
  canEntertainerTransitionDirectRequest,
  canVenueTransitionDirectRequest,
  defaultResponseDeadlineAt,
  type DirectRequestState,
} from "@/src/domain/direct-request";
import { nextTermsVersion } from "@/src/domain/booking";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";

const sendSchema = z.object({
  venueId: z.string().uuid(),
  entertainerProfileId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  proposedFeeEur: z.coerce.number().min(0),
  formatCategory: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(4000).optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function sendDirectRequest(
  input: z.infer<typeof sendSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    checkRateLimit({
      key: rateLimitKey("direct_request.send", session.user.id),
      limit: 10,
      windowMs: 60_000,
    });

    const parsed = sendSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid direct request");
    }
    if (!can(actor, "direct_request.send", { venueId: parsed.data.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) {
      throw new AppError("validation", "End must be after start");
    }

    const db = getDb();
    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, parsed.data.venueId),
        eq(venues.publicationState, "approved"),
      ),
    });
    if (!venue) {
      throw new AppError("validation", "Venue must be approved");
    }

    const profile = await db.query.entertainerProfiles.findFirst({
      where: and(
        eq(entertainerProfiles.id, parsed.data.entertainerProfileId),
        eq(entertainerProfiles.publicationState, "approved"),
      ),
    });
    if (!profile) {
      throw new AppError("validation", "Entertainer must be approved");
    }
    if (profile.userId === actor.userId) {
      throw new AppError("validation", "Cannot request yourself");
    }

    const pending = await db.query.directRequests.findFirst({
      where: and(
        eq(directRequests.venueId, parsed.data.venueId),
        eq(directRequests.entertainerProfileId, profile.id),
        eq(directRequests.state, "requested"),
      ),
    });
    if (pending) {
      throw new AppError(
        "conflict",
        "A pending request already exists for this venue and act",
      );
    }

    let requestId: string | undefined;
    const responseDeadlineAt = defaultResponseDeadlineAt();
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(directRequests)
        .values({
          venueId: parsed.data.venueId,
          entertainerProfileId: profile.id,
          requestedByUserId: actor.userId,
          startsAt,
          endsAt,
          proposedFeeCents: Math.round(parsed.data.proposedFeeEur * 100),
          formatCategory: parsed.data.formatCategory,
          notes: parsed.data.notes ?? null,
          responseDeadlineAt,
          state: "requested",
        })
        .returning();
      if (!created) {
        throw new AppError("validation", "Failed to create request");
      }
      requestId = created.id;

      await tx.insert(bookings).values({
        originType: "direct_request",
        originId: created.id,
        venueId: parsed.data.venueId,
        entertainerProfileId: profile.id,
        state: "requested",
      });

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "direct_request.sent",
        subjectType: "direct_request",
        subjectId: created.id,
        metadata: {
          venueId: parsed.data.venueId,
          entertainerProfileId: profile.id,
          responseDeadlineAt: responseDeadlineAt.toISOString(),
        },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/requests`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/entertainers/${profile.id}`,
    );
    return { ok: true, ...(requestId ? { id: requestId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function respondToDirectRequest(input: {
  requestId: string;
  nextState: "accepted" | "declined";
  locale?: "en" | "de";
}): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const locale = input.locale ?? "en";
    if (!can(actor, "direct_request.respond")) {
      throw new AppError("forbidden", "Approved entertainer required");
    }

    const db = getDb();
    const request = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, input.requestId),
    });
    if (!request) {
      throw new AppError("not_found", "Request not found");
    }

    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, request.entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) {
      throw new AppError("forbidden", "Only the requested act can respond");
    }

    const from = request.state as DirectRequestState;
    if (!canEntertainerTransitionDirectRequest(from, input.nextState)) {
      throw new AppError(
        "invalid_transition",
        `Cannot move request from ${from} to ${input.nextState}`,
      );
    }

    if (input.nextState === "accepted") {
      await assertNoHardCalendarConflict({
        entertainerProfileId: request.entertainerProfileId,
        venueId: request.venueId,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(directRequests)
        .set({ state: input.nextState, updatedAt: new Date() })
        .where(eq(directRequests.id, request.id));

      await tx
        .update(bookings)
        .set({
          state: input.nextState === "accepted" ? "accepted" : "declined",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, request.id),
          ),
        );

      if (input.nextState === "accepted") {
        const booking = await tx.query.bookings.findFirst({
          where: and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, request.id),
          ),
        });

        await settleMatchAcceptance(tx, {
          entertainerProfileId: request.entertainerProfileId,
          entertainerUserId: profile.userId,
          venueId: request.venueId,
          startsAt: request.startsAt,
          endsAt: request.endsAt,
          reason: "direct_request_accepted",
          origin: {
            ...(booking?.id ? { bookingId: booking.id } : {}),
            directRequestId: request.id,
          },
          ...(booking?.id ? { excludeBookingId: booking.id } : {}),
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: `direct_request.${input.nextState}`,
        subjectType: "direct_request",
        subjectId: request.id,
        metadata: { from, to: input.nextState },
      });
    });

    revalidatePath(`/${locale}/marketplace/requests`);
    revalidatePath(
      `/${locale}/marketplace/entertainers/${request.entertainerProfileId}`,
    );
    revalidatePath(`/${locale}/marketplace/calendar`);
    return { ok: true, id: request.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function withdrawDirectRequest(
  requestId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const db = getDb();
    const request = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, requestId),
    });
    if (!request) {
      throw new AppError("not_found", "Request not found");
    }
    if (!can(actor, "direct_request.send", { venueId: request.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const from = request.state as DirectRequestState;
    if (!canVenueTransitionDirectRequest(from, "withdrawn")) {
      throw new AppError("invalid_transition", `Cannot withdraw from ${from}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(directRequests)
        .set({ state: "withdrawn", updatedAt: new Date() })
        .where(eq(directRequests.id, requestId));
      await tx
        .update(bookings)
        .set({ state: "withdrawn", updatedAt: new Date() })
        .where(
          and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, requestId),
          ),
        );
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "direct_request.withdrawn",
        subjectType: "direct_request",
        subjectId: requestId,
        metadata: { from, to: "withdrawn" },
      });
    });

    revalidatePath(`/${locale}/marketplace/requests`);
    return { ok: true, id: requestId };
  } catch (error) {
    return toActionError(error);
  }
}

const proposeChangesSchema = z.object({
  requestId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  proposedFeeEur: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(4000).optional(),
  locale: z.enum(["en", "de"]).default("en"),
});

export async function proposeDirectRequestChanges(
  input: z.infer<typeof proposeChangesSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    checkRateLimit({
      key: rateLimitKey("direct_request.respond", session.user.id),
      limit: 15,
      windowMs: 60_000,
    });

    const parsed = proposeChangesSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid change proposal");
    }
    if (!can(actor, "direct_request.respond")) {
      throw new AppError("forbidden", "Approved entertainer required");
    }

    const db = getDb();
    const request = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, parsed.data.requestId),
    });
    if (!request) {
      throw new AppError("not_found", "Request not found");
    }

    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, request.entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) {
      throw new AppError(
        "forbidden",
        "Only the requested act can propose changes",
      );
    }

    const from = request.state as DirectRequestState;
    if (!canEntertainerTransitionDirectRequest(from, "changes_proposed")) {
      throw new AppError(
        "invalid_transition",
        `Cannot propose changes from ${from}`,
      );
    }

    const startsAt = parsed.data.startsAt
      ? new Date(parsed.data.startsAt)
      : request.startsAt;
    const endsAt = parsed.data.endsAt
      ? new Date(parsed.data.endsAt)
      : request.endsAt;
    if (endsAt <= startsAt) {
      throw new AppError("validation", "End must be after start");
    }
    const proposedFeeCents =
      parsed.data.proposedFeeEur !== undefined
        ? Math.round(parsed.data.proposedFeeEur * 100)
        : request.proposedFeeCents;
    const notes =
      parsed.data.notes !== undefined ? parsed.data.notes : request.notes;

    await db.transaction(async (tx) => {
      await tx
        .update(directRequests)
        .set({
          startsAt,
          endsAt,
          proposedFeeCents,
          notes,
          state: "changes_proposed",
          updatedAt: new Date(),
        })
        .where(eq(directRequests.id, request.id));

      const booking = await tx.query.bookings.findFirst({
        where: and(
          eq(bookings.originType, "direct_request"),
          eq(bookings.originId, request.id),
        ),
      });

      if (booking) {
        const [latest] = await tx
          .select({ version: bookingTerms.version })
          .from(bookingTerms)
          .where(eq(bookingTerms.bookingId, booking.id))
          .orderBy(desc(bookingTerms.version))
          .limit(1);

        const version = nextTermsVersion(latest?.version ?? null);
        await tx.insert(bookingTerms).values({
          bookingId: booking.id,
          version,
          proposedByUserId: actor.userId,
          startsAt,
          endsAt,
          feeCents: proposedFeeCents,
          performanceFormat: request.formatCategory,
          cancellationTerms:
            "Standard cancellation per direct-request counter-proposal.",
          productionObligations:
            "Parties to confirm production obligations after accepting proposed changes.",
          depositTerms: null,
          snapshot: {
            directRequestId: request.id,
            proposedFeeCents,
            notes,
            proposedAt: new Date().toISOString(),
          },
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "direct_request.changes_proposed",
        subjectType: "direct_request",
        subjectId: request.id,
        metadata: { from, to: "changes_proposed" },
      });
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/requests`);
    revalidatePath(
      `/${parsed.data.locale}/marketplace/entertainers/${request.entertainerProfileId}`,
    );
    return { ok: true, id: request.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function venueRespondToDirectRequestChanges(input: {
  requestId: string;
  nextState: "accepted" | "declined";
  locale?: "en" | "de";
}): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const locale = input.locale ?? "en";

    const db = getDb();
    const request = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, input.requestId),
    });
    if (!request) {
      throw new AppError("not_found", "Request not found");
    }
    if (!can(actor, "direct_request.send", { venueId: request.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const from = request.state as DirectRequestState;
    if (!canVenueTransitionDirectRequest(from, input.nextState)) {
      throw new AppError(
        "invalid_transition",
        `Cannot move request from ${from} to ${input.nextState}`,
      );
    }

    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, request.entertainerProfileId),
    });
    if (!profile) {
      throw new AppError("not_found", "Entertainer profile missing");
    }

    if (input.nextState === "accepted") {
      await assertNoHardCalendarConflict({
        entertainerProfileId: request.entertainerProfileId,
        venueId: request.venueId,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(directRequests)
        .set({ state: input.nextState, updatedAt: new Date() })
        .where(eq(directRequests.id, request.id));

      await tx
        .update(bookings)
        .set({
          state: input.nextState === "accepted" ? "accepted" : "declined",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, request.id),
          ),
        );

      if (input.nextState === "accepted") {
        const booking = await tx.query.bookings.findFirst({
          where: and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, request.id),
          ),
        });

        await settleMatchAcceptance(tx, {
          entertainerProfileId: request.entertainerProfileId,
          entertainerUserId: profile.userId,
          venueId: request.venueId,
          startsAt: request.startsAt,
          endsAt: request.endsAt,
          reason: "direct_request_accepted",
          origin: {
            ...(booking?.id ? { bookingId: booking.id } : {}),
            directRequestId: request.id,
          },
          ...(booking?.id ? { excludeBookingId: booking.id } : {}),
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: `direct_request.${input.nextState}`,
        subjectType: "direct_request",
        subjectId: request.id,
        metadata: { from, to: input.nextState, via: "changes_proposed" },
      });
    });

    revalidatePath(`/${locale}/marketplace/requests`);
    revalidatePath(
      `/${locale}/marketplace/entertainers/${request.entertainerProfileId}`,
    );
    revalidatePath(`/${locale}/marketplace/calendar`);
    return { ok: true, id: request.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function runExpireOverdueDirectRequests(): Promise<{
  expired: number;
  checkedAt: Date;
}> {
  return expireOverdueDirectRequests();
}
