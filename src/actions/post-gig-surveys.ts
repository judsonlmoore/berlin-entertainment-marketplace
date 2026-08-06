"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor, toActionError } from "@/src/actions/_shared";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  bookingTerms,
  bookings,
  postGigSurveys,
} from "@/src/db/schema/marketplace";
import { isNotNull, eq, and, desc } from "drizzle-orm";
import { AppError } from "@/src/domain/errors";

import {
  postGigSurveyResponseSchema,
  normalizePostGigSurveyResponse,
} from "@/src/domain/post-gig-survey";

export async function submitPostGigSurveyResponse(input: unknown) {
  try {
    const { actor, auditUserId } = await requireActor();

    const parsed = z
      .object({
        bookingId: z.string().uuid(),
        locale: z.enum(["en", "de"]),
        response: postGigSurveyResponseSchema,
      })
      .safeParse(input);

    if (!parsed.success) {
      throw new AppError("validation", "Invalid survey response");
    }

    const { bookingId, locale, response } = parsed.data;
    const now = new Date();

    const db = getDb();

    const [invitation] = await db
      .select()
      .from(postGigSurveys)
      .where(
        and(
          eq(postGigSurveys.bookingId, bookingId),
          eq(postGigSurveys.signerUserId, actor.userId),
        ),
      )
      .limit(1);

    if (!invitation) {
      throw new AppError("forbidden", "Survey invitation missing");
    }
    if (invitation.status !== "invited") {
      throw new AppError("conflict", "Survey already submitted");
    }

    const [acceptedTerms] = await db
      .select()
      .from(bookingTerms)
      .where(and(eq(bookingTerms.bookingId, bookingId), isNotNull(bookingTerms.acceptedAt)))
      .orderBy(desc(bookingTerms.version))
      .limit(1);

    if (!acceptedTerms) {
      throw new AppError("validation", "Accepted terms missing");
    }

    const [booking] = await db
      .select({ state: bookings.state })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.state !== "confirmed") {
      throw new AppError("validation", "Survey can only be submitted for confirmed bookings");
    }

    if (acceptedTerms.endsAt > now) {
      throw new AppError("validation", "Survey is not available yet");
    }

    const storedResponse = normalizePostGigSurveyResponse(response);

    const [updated] = await db
      .update(postGigSurveys)
      .set({
        status: "submitted",
        submittedAt: now,
        response: storedResponse,
        updatedAt: now,
      })
      .where(
        and(
          eq(postGigSurveys.id, invitation.id),
          eq(postGigSurveys.status, "invited"),
        ),
      )
      .returning();

    if (!updated) {
      throw new AppError("conflict", "Survey already submitted");
    }

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "booking.post_gig_survey_submitted",
      subjectType: "booking",
      subjectId: bookingId,
      metadata: {
        overall: response.overall,
        wouldBookAgain: response.wouldBookAgain === "yes",
        improvementChars: response.improvementText
          ? response.improvementText.length
          : 0,
      },
    });

    revalidatePath(`/${locale}/marketplace/bookings/${bookingId}`);

    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

