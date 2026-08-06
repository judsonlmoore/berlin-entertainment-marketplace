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
import { assertNoHardCalendarConflict } from "@/src/db/queries/calendar-ops";
import { settleMatchAcceptance } from "@/src/db/queries/match-settlement";
import {
  applications,
  applicationClarificationNotes,
  auditEvents,
  bookings,
  entertainerProfiles,
  opportunities,
} from "@/src/db/schema/marketplace";
import {
  canApplicantTransitionApplication,
  canVenueTransitionApplication,
  type ApplicationState,
} from "@/src/domain/application";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  canTransitionOpportunity,
  isOpportunityAcceptingApplications,
  type OpportunityState,
} from "@/src/domain/opportunity";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";

const localeSchema = z.enum(["en", "de"]).default("en");

const opportunitySchema = z.object({
  venueId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  formatCategory: z.string().trim().min(1).max(120),
  expectedAudience: z.string().trim().max(500).optional(),
  budgetMinEur: z.coerce.number().min(0).optional(),
  budgetMaxEur: z.coerce.number().min(0).optional(),
  actSizeMin: z.coerce.number().int().min(1).optional(),
  actSizeMax: z.coerce.number().int().min(1).optional(),
  productionContext: z.string().trim().max(4000).optional(),
  applicationDeadline: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(4000).optional(),
  locale: localeSchema,
});

export async function createOpportunity(
  input: z.infer<typeof opportunitySchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const parsed = opportunitySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid opportunity");
    }
    if (!can(actor, "opportunity.manage", { venueId: parsed.data.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) {
      throw new AppError("validation", "End must be after start");
    }

    const db = getDb();
    const [created] = await db
      .insert(opportunities)
      .values({
        venueId: parsed.data.venueId,
        createdByUserId: actor.userId,
        title: parsed.data.title,
        startsAt,
        endsAt,
        formatCategory: parsed.data.formatCategory,
        expectedAudience: parsed.data.expectedAudience ?? null,
        budgetMinCents:
          parsed.data.budgetMinEur !== undefined
            ? Math.round(parsed.data.budgetMinEur * 100)
            : null,
        budgetMaxCents:
          parsed.data.budgetMaxEur !== undefined
            ? Math.round(parsed.data.budgetMaxEur * 100)
            : null,
        actSizeMin: parsed.data.actSizeMin ?? null,
        actSizeMax: parsed.data.actSizeMax ?? null,
        productionContext: parsed.data.productionContext ?? null,
        applicationDeadline: parsed.data.applicationDeadline
          ? new Date(parsed.data.applicationDeadline)
          : null,
        notes: parsed.data.notes ?? null,
        state: "draft",
      })
      .returning();

    if (!created) {
      throw new AppError("validation", "Failed to create opportunity");
    }

    await db.insert(auditEvents).values({
      actorUserId: auditUserId,
      action: "opportunity.created",
      subjectType: "opportunity",
      subjectId: created.id,
      metadata: { venueId: parsed.data.venueId, state: "draft" },
    });

    revalidatePath(`/${parsed.data.locale}/marketplace/opportunities`);
    revalidatePath(
      `/${parsed.data.locale}/profile/venues/${parsed.data.venueId}`,
    );
    return { ok: true, id: created.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function transitionOpportunity(input: {
  opportunityId: string;
  nextState: OpportunityState;
  locale?: "en" | "de";
}): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const locale = input.locale ?? "en";
    const db = getDb();
    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, input.opportunityId),
    });
    if (!opportunity) {
      throw new AppError("not_found", "Opportunity not found");
    }
    if (!can(actor, "opportunity.manage", { venueId: opportunity.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const from = opportunity.state as OpportunityState;
    if (!canTransitionOpportunity(from, input.nextState)) {
      throw new AppError(
        "invalid_transition",
        `Cannot move opportunity from ${from} to ${input.nextState}`,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(opportunities)
        .set({ state: input.nextState, updatedAt: new Date() })
        .where(eq(opportunities.id, opportunity.id));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "opportunity.state_changed",
        subjectType: "opportunity",
        subjectId: opportunity.id,
        metadata: { from, to: input.nextState },
      });
    });

    revalidatePath(`/${locale}/marketplace/opportunities`);
    revalidatePath(`/${locale}/marketplace/opportunities/${opportunity.id}`);
    return { ok: true, id: opportunity.id };
  } catch (error) {
    return toActionError(error);
  }
}

const applySchema = z.object({
  opportunityId: z.string().uuid(),
  message: z.string().trim().max(4000).default(""),
  quoteMinEur: z.coerce.number().min(0).default(0),
  quoteMaxEur: z.coerce.number().min(0).default(0),
  intent: z.enum(["draft", "submit"]).default("submit"),
  locale: localeSchema,
});

export async function applyToOpportunity(
  input: z.infer<typeof applySchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    checkRateLimit({
      key: rateLimitKey("opportunity.apply", session.user.id),
      limit: 20,
      windowMs: 60_000,
    });

    const parsed = applySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid application");
    }
    if (!can(actor, "opportunity.apply")) {
      throw new AppError("forbidden", "Approved entertainer required");
    }

    const isSubmit = parsed.data.intent === "submit";
    if (isSubmit && !parsed.data.message.trim()) {
      throw new AppError("validation", "Message is required to submit");
    }
    if (isSubmit && parsed.data.quoteMaxEur < parsed.data.quoteMinEur) {
      throw new AppError("validation", "Quote max must be >= min");
    }

    const db = getDb();
    const profile = await db.query.entertainerProfiles.findFirst({
      where: and(
        eq(entertainerProfiles.userId, actor.userId),
        eq(entertainerProfiles.publicationState, "approved"),
      ),
    });
    if (!profile) {
      throw new AppError(
        "validation",
        "An approved entertainer profile is required before applying",
      );
    }

    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, parsed.data.opportunityId),
    });
    if (!opportunity) {
      throw new AppError("not_found", "Opportunity not found");
    }
    if (
      !isOpportunityAcceptingApplications(
        opportunity.state as OpportunityState,
        opportunity.applicationDeadline,
      )
    ) {
      throw new AppError(
        "conflict",
        "Opportunity is not accepting applications",
      );
    }

    const existing = await db.query.applications.findFirst({
      where: and(
        eq(applications.opportunityId, opportunity.id),
        eq(applications.entertainerProfileId, profile.id),
      ),
    });

    const nextState: ApplicationState = isSubmit ? "submitted" : "draft";
    const message = parsed.data.message.trim() || "Draft application";
    const quoteMinCents = Math.round(parsed.data.quoteMinEur * 100);
    const quoteMaxCents = Math.round(parsed.data.quoteMaxEur * 100);

    if (existing) {
      const from = existing.state as ApplicationState;
      if (from === "draft" && isSubmit) {
        if (!canApplicantTransitionApplication(from, "submitted")) {
          throw new AppError(
            "invalid_transition",
            `Cannot submit from ${from}`,
          );
        }
      } else if (from === "draft" && !isSubmit) {
        // update draft in place
      } else {
        throw new AppError(
          "conflict",
          "You already applied to this opportunity",
        );
      }
    }

    let applicationId: string | undefined;
    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(applications)
          .set({
            message,
            quoteMinCents,
            quoteMaxCents,
            state: nextState,
            updatedAt: new Date(),
          })
          .where(eq(applications.id, existing.id));
        applicationId = existing.id;

        if (isSubmit) {
          const bookingExists = await tx.query.bookings.findFirst({
            where: and(
              eq(bookings.originType, "application"),
              eq(bookings.originId, existing.id),
            ),
          });
          if (!bookingExists) {
            await tx.insert(bookings).values({
              originType: "application",
              originId: existing.id,
              venueId: opportunity.venueId,
              entertainerProfileId: profile.id,
              state: "applied",
            });
          }
        }

        await tx.insert(auditEvents).values({
          actorUserId: auditUserId,
          action: isSubmit
            ? "application.submitted"
            : "application.draft_saved",
          subjectType: "application",
          subjectId: existing.id,
          metadata: {
            opportunityId: opportunity.id,
            from: existing.state,
            to: nextState,
          },
        });
        return;
      }

      const [created] = await tx
        .insert(applications)
        .values({
          opportunityId: opportunity.id,
          entertainerProfileId: profile.id,
          message,
          quoteMinCents,
          quoteMaxCents,
          state: nextState,
        })
        .returning();
      if (!created) {
        throw new AppError("validation", "Failed to create application");
      }
      applicationId = created.id;

      if (isSubmit) {
        await tx.insert(bookings).values({
          originType: "application",
          originId: created.id,
          venueId: opportunity.venueId,
          entertainerProfileId: profile.id,
          state: "applied",
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: isSubmit ? "application.submitted" : "application.draft_saved",
        subjectType: "application",
        subjectId: created.id,
        metadata: { opportunityId: opportunity.id, state: nextState },
      });
    });

    revalidatePath(
      `/${parsed.data.locale}/marketplace/opportunities/${opportunity.id}`,
    );
    return { ok: true, ...(applicationId ? { id: applicationId } : {}) };
  } catch (error) {
    return toActionError(error);
  }
}

const clarificationNoteSchema = z.object({
  applicationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  locale: localeSchema,
});

export async function requestClarification(
  input: z.infer<typeof clarificationNoteSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const parsed = clarificationNoteSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid clarification request");
    }

    const db = getDb();
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, parsed.data.applicationId),
    });
    if (!application) {
      throw new AppError("not_found", "Application not found");
    }

    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, application.opportunityId),
    });
    if (!opportunity) {
      throw new AppError("not_found", "Opportunity not found");
    }
    if (!can(actor, "application.review", { venueId: opportunity.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const from = application.state as ApplicationState;
    if (!canVenueTransitionApplication(from, "clarification_requested")) {
      throw new AppError(
        "invalid_transition",
        `Cannot request clarification from ${from}`,
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(applicationClarificationNotes).values({
        applicationId: application.id,
        authorUserId: actor.userId,
        body: parsed.data.body,
      });
      await tx
        .update(applications)
        .set({ state: "clarification_requested", updatedAt: new Date() })
        .where(eq(applications.id, application.id));
      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "application.clarification_requested",
        subjectType: "application",
        subjectId: application.id,
        metadata: { from, to: "clarification_requested" },
      });
    });

    revalidatePath(
      `/${parsed.data.locale}/marketplace/opportunities/${opportunity.id}`,
    );
    return { ok: true, id: application.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function replyClarification(
  input: z.infer<typeof clarificationNoteSchema>,
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    checkRateLimit({
      key: rateLimitKey("opportunity.apply", session.user.id),
      limit: 20,
      windowMs: 60_000,
    });

    const parsed = clarificationNoteSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid clarification reply");
    }
    if (!can(actor, "opportunity.apply")) {
      throw new AppError("forbidden", "Approved entertainer required");
    }

    const db = getDb();
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, parsed.data.applicationId),
    });
    if (!application) {
      throw new AppError("not_found", "Application not found");
    }

    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, application.entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) {
      throw new AppError("forbidden", "Only the applicant can reply");
    }

    const from = application.state as ApplicationState;
    if (!canApplicantTransitionApplication(from, "submitted")) {
      throw new AppError("invalid_transition", `Cannot reply from ${from}`);
    }

    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, application.opportunityId),
    });
    if (!opportunity) {
      throw new AppError("not_found", "Opportunity not found");
    }

    await db.transaction(async (tx) => {
      await tx.insert(applicationClarificationNotes).values({
        applicationId: application.id,
        authorUserId: actor.userId,
        body: parsed.data.body,
      });
      await tx
        .update(applications)
        .set({ state: "submitted", updatedAt: new Date() })
        .where(eq(applications.id, application.id));

      const bookingExists = await tx.query.bookings.findFirst({
        where: and(
          eq(bookings.originType, "application"),
          eq(bookings.originId, application.id),
        ),
      });
      if (!bookingExists) {
        await tx.insert(bookings).values({
          originType: "application",
          originId: application.id,
          venueId: opportunity.venueId,
          entertainerProfileId: profile.id,
          state: "applied",
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "application.clarification_replied",
        subjectType: "application",
        subjectId: application.id,
        metadata: { from, to: "submitted" },
      });
    });

    revalidatePath(
      `/${parsed.data.locale}/marketplace/opportunities/${opportunity.id}`,
    );
    return { ok: true, id: application.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function withdrawApplication(
  applicationId: string,
  locale: "en" | "de" = "en",
): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const db = getDb();
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });
    if (!application) {
      throw new AppError("not_found", "Application not found");
    }

    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, application.entertainerProfileId),
    });
    if (!profile || profile.userId !== actor.userId) {
      throw new AppError("forbidden", "Only the applicant can withdraw");
    }
    if (!can(actor, "opportunity.apply")) {
      throw new AppError("forbidden", "Approved entertainer required");
    }

    const from = application.state as ApplicationState;
    if (!canApplicantTransitionApplication(from, "withdrawn")) {
      throw new AppError("invalid_transition", `Cannot withdraw from ${from}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(applications)
        .set({ state: "withdrawn", updatedAt: new Date() })
        .where(eq(applications.id, applicationId));

      const booking = await tx.query.bookings.findFirst({
        where: and(
          eq(bookings.originType, "application"),
          eq(bookings.originId, applicationId),
        ),
      });
      if (booking) {
        await tx
          .update(bookings)
          .set({ state: "withdrawn", updatedAt: new Date() })
          .where(eq(bookings.id, booking.id));
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: "application.withdrawn",
        subjectType: "application",
        subjectId: applicationId,
        metadata: { from, to: "withdrawn" },
      });
    });

    revalidatePath(`/${locale}/marketplace/opportunities`);
    return { ok: true, id: applicationId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reviewApplication(input: {
  applicationId: string;
  nextState: "shortlisted" | "rejected";
  locale?: "en" | "de";
}): Promise<ActionResult> {
  try {
    const { session, actor, auditUserId } = await requireActor();
    const locale = input.locale ?? "en";
    const db = getDb();

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, input.applicationId),
    });
    if (!application) {
      throw new AppError("not_found", "Application not found");
    }

    const opportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, application.opportunityId),
    });
    if (!opportunity) {
      throw new AppError("not_found", "Opportunity not found");
    }
    if (!can(actor, "application.review", { venueId: opportunity.venueId })) {
      throw new AppError("forbidden", "Venue operator required");
    }

    const from = application.state as ApplicationState;
    if (!canVenueTransitionApplication(from, input.nextState)) {
      throw new AppError(
        "invalid_transition",
        `Cannot move application from ${from} to ${input.nextState}`,
      );
    }

    if (input.nextState === "shortlisted") {
      await assertNoHardCalendarConflict({
        entertainerProfileId: application.entertainerProfileId,
        venueId: opportunity.venueId,
        startsAt: opportunity.startsAt,
        endsAt: opportunity.endsAt,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(applications)
        .set({ state: input.nextState, updatedAt: new Date() })
        .where(eq(applications.id, application.id));

      const bookingState =
        input.nextState === "shortlisted" ? "shortlisted" : "rejected";
      await tx
        .update(bookings)
        .set({ state: bookingState, updatedAt: new Date() })
        .where(
          and(
            eq(bookings.originType, "application"),
            eq(bookings.originId, application.id),
          ),
        );

      if (input.nextState === "shortlisted") {
        const booking = await tx.query.bookings.findFirst({
          where: and(
            eq(bookings.originType, "application"),
            eq(bookings.originId, application.id),
          ),
        });

        const entertainer = await tx.query.entertainerProfiles.findFirst({
          where: eq(entertainerProfiles.id, application.entertainerProfileId),
        });
        if (!entertainer) {
          throw new AppError("not_found", "Entertainer profile missing");
        }

        await settleMatchAcceptance(tx, {
          entertainerProfileId: application.entertainerProfileId,
          entertainerUserId: entertainer.userId,
          venueId: opportunity.venueId,
          startsAt: opportunity.startsAt,
          endsAt: opportunity.endsAt,
          reason: "application_shortlisted",
          origin: {
            ...(booking?.id ? { bookingId: booking.id } : {}),
            applicationId: application.id,
          },
          ...(booking?.id ? { excludeBookingId: booking.id } : {}),
        });
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: `application.${input.nextState}`,
        subjectType: "application",
        subjectId: application.id,
        metadata: { from, to: input.nextState },
      });
    });

    revalidatePath(`/${locale}/marketplace/opportunities/${opportunity.id}`);
    revalidatePath(`/${locale}/marketplace/calendar`);
    return { ok: true, id: application.id };
  } catch (error) {
    return toActionError(error);
  }
}
