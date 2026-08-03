"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { upsertBookingCalendarEntry } from "@/src/db/queries/calendar";
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import {
  auditEvents,
  bookings,
  contactMethods,
  contactUnlocks,
  directRequests,
  entertainerProfiles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";
import { selectPreferredContact } from "@/src/domain/contact-projection";
import {
  canEntertainerTransitionDirectRequest,
  canVenueTransitionDirectRequest,
  type DirectRequestState,
} from "@/src/domain/direct-request";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";

export type ActionResult =
  { ok: true; id?: string } | { ok: false; code: string; message: string };

function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

async function requireActor() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("unauthorized", "Sign in required");
  }
  const actor = await getActorContext(session.user.id);
  if (!actor) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return { session, actor };
}

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
    const { session, actor } = await requireActor();
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
    if (profile.userId === session.user.id) {
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
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(directRequests)
        .values({
          venueId: parsed.data.venueId,
          entertainerProfileId: profile.id,
          requestedByUserId: session.user.id,
          startsAt,
          endsAt,
          proposedFeeCents: Math.round(parsed.data.proposedFeeEur * 100),
          formatCategory: parsed.data.formatCategory,
          notes: parsed.data.notes ?? null,
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
        actorUserId: session.user.id,
        action: "direct_request.sent",
        subjectType: "direct_request",
        subjectId: created.id,
        metadata: {
          venueId: parsed.data.venueId,
          entertainerProfileId: profile.id,
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
    const { session, actor } = await requireActor();
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
    if (!profile || profile.userId !== session.user.id) {
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

        const entertainerContacts = await tx
          .select()
          .from(contactMethods)
          .where(
            and(
              eq(contactMethods.ownerType, "entertainer"),
              eq(contactMethods.ownerId, request.entertainerProfileId),
            ),
          );
        const preferredEntertainer = selectPreferredContact(
          entertainerContacts.map((c) => ({
            id: c.id,
            kind: c.kind,
            valueEncrypted: c.valueEncrypted,
            isPreferred: c.isPreferred,
          })),
        );

        const venueOperators = await tx
          .select({ userId: venueMemberships.userId })
          .from(venueMemberships)
          .where(
            and(
              eq(venueMemberships.venueId, request.venueId),
              eq(venueMemberships.status, "active"),
            ),
          );

        if (preferredEntertainer) {
          for (const operator of venueOperators) {
            await tx.insert(contactUnlocks).values({
              ...(booking?.id ? { bookingId: booking.id } : {}),
              directRequestId: request.id,
              unlockedForUserId: operator.userId,
              contactMethodId: preferredEntertainer.id,
              reason: "direct_request_accepted",
            });
          }
        }

        const venueContacts = await tx
          .select()
          .from(contactMethods)
          .where(
            and(
              eq(contactMethods.ownerType, "venue"),
              eq(contactMethods.ownerId, request.venueId),
            ),
          );
        const preferredVenue = selectPreferredContact(
          venueContacts.map((c) => ({
            id: c.id,
            kind: c.kind,
            valueEncrypted: c.valueEncrypted,
            isPreferred: c.isPreferred,
          })),
        );
        if (preferredVenue) {
          await tx.insert(contactUnlocks).values({
            ...(booking?.id ? { bookingId: booking.id } : {}),
            directRequestId: request.id,
            unlockedForUserId: profile.userId,
            contactMethodId: preferredVenue.id,
            reason: "direct_request_accepted",
          });
        }

        if (booking) {
          const { spaceId } = await assertNoHardCalendarConflict({
            entertainerProfileId: request.entertainerProfileId,
            venueId: request.venueId,
            startsAt: request.startsAt,
            endsAt: request.endsAt,
            excludeBookingId: booking.id,
          });
          await upsertBookingCalendarEntry(tx, {
            ownerType: "entertainer",
            ownerId: request.entertainerProfileId,
            startsAt: request.startsAt,
            endsAt: request.endsAt,
            state: "requested",
            bookingId: booking.id,
          });
          await upsertBookingCalendarEntry(tx, {
            ownerType: "venue_space",
            ownerId: spaceId,
            startsAt: request.startsAt,
            endsAt: request.endsAt,
            state: "requested",
            bookingId: booking.id,
          });
        }
      }

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
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
    const { session, actor } = await requireActor();
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
        actorUserId: session.user.id,
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
