"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { checkRateLimit, rateLimitKey } from "@/src/domain/rate-limit";
import { AppError } from "@/src/domain/errors";
import { can } from "@/src/domain/permissions";
import {
  getProfileEnquiryById,
  listVenueOperatorUserIds,
  respondToProfileEnquiry,
  sendVenueConnectionRequest,
  submitProfileEnquiry,
  updateProfileEnquiryProposal,
} from "@/src/db/queries/profile-enquiries";
import { createNotification } from "@/src/db/queries/notifications";
import { generateNotificationContent } from "@/src/domain/notifications/templates";
import { getDb } from "@/src/db/client";
import { entertainerProfiles, venues } from "@/src/db/schema/marketplace";
import { users } from "@/src/db/schema/auth";

const localeSchema = z.enum(["en", "de"]);

const offerTermsSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  feeEur: z.coerce.number().min(0),
  performanceFormat: z.string().trim().min(1).max(120),
  cancellationTerms: z.string().trim().min(1).max(4000),
  productionObligations: z.string().trim().min(1).max(4000),
  depositTerms: z.string().trim().max(4000).optional(),
  changeNote: z.string().trim().max(4000).optional(),
});

function parseOfferTerms(data: z.infer<typeof offerTermsSchema>) {
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (endsAt <= startsAt) {
    throw new AppError("validation", "End must be after start");
  }
  return {
    startsAt,
    endsAt,
    feeCents: Math.round(data.feeEur * 100),
    performanceFormat: data.performanceFormat,
    cancellationTerms: data.cancellationTerms,
    productionObligations: data.productionObligations,
    depositTerms: data.depositTerms ?? null,
    changeNote: data.changeNote ?? null,
  };
}

async function notifyUser(input: {
  userId: string;
  type:
    | "profile_enquiry_received"
    | "profile_enquiry_interested"
    | "profile_enquiry_passed";
  subjectId: string;
  params: Record<string, string>;
}) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
    columns: { preferredLocale: true },
  });
  const locale = user?.preferredLocale === "de" ? "de" : "en";
  const content = generateNotificationContent({
    type: input.type,
    locale,
    params: input.params,
  });
  await createNotification({
    recipientUserId: input.userId,
    type: input.type,
    subjectType: "profile_enquiry",
    subjectId: input.subjectId,
    title: content.title,
    body: content.body,
    ...(content.actionUrl ? { actionUrl: content.actionUrl } : {}),
    ...(content.actionLabel ? { actionLabel: content.actionLabel } : {}),
  });
}

export async function submitProfileEnquiryAction(input: {
  venueId: string;
  startsAt: string;
  endsAt: string;
  feeEur: number;
  performanceFormat: string;
  cancellationTerms: string;
  productionObligations: string;
  depositTerms?: string;
  changeNote?: string;
  note?: string;
  locale?: "en" | "de";
}): Promise<ActionResult & { bookingId?: string; enquiryId?: string }> {
  try {
    const { session, actor } = await requireActor();
    checkRateLimit({
      key: rateLimitKey("profile_enquiry.send", session.user.id),
      limit: 10,
      windowMs: 60_000,
    });

    const parsed = z
      .object({
        venueId: z.string().uuid(),
        note: z.string().trim().max(2000).optional(),
        locale: localeSchema.optional(),
      })
      .merge(offerTermsSchema)
      .safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid offer");
    }
    if (!can(actor, "profile_enquiry.send")) {
      throw new AppError("forbidden", "Published act required to submit");
    }

    const offer = parseOfferTerms(parsed.data);
    const result = await submitProfileEnquiry({
      actor,
      venueId: parsed.data.venueId,
      offer,
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    });

    const db = getDb();
    const [profile, venue] = await Promise.all([
      db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.userId, actor.userId),
        columns: { actName: true },
      }),
      db.query.venues.findFirst({
        where: eq(venues.id, parsed.data.venueId),
        columns: { name: true },
      }),
    ]);

    const operators = await listVenueOperatorUserIds(parsed.data.venueId);
    await Promise.all(
      operators.map((userId) =>
        notifyUser({
          userId,
          type: "profile_enquiry_received",
          subjectId: result.enquiryId,
          params: {
            entertainerName: profile?.actName ?? "An act",
            venueName: venue?.name ?? "your venue",
            enquiryId: result.enquiryId,
            bookingId: result.bookingId,
          },
        }),
      ),
    );

    const locale = parsed.data.locale ?? "en";
    revalidatePath(`/${locale}/marketplace/venues/${parsed.data.venueId}`);
    revalidatePath(`/${locale}/marketplace/bookings`);
    revalidatePath(`/${locale}/marketplace/bookings/${result.bookingId}`);
    revalidatePath("/", "layout");
    return {
      ok: true,
      enquiryId: result.enquiryId,
      bookingId: result.bookingId,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendVenueConnectionRequestAction(input: {
  venueId: string;
  entertainerProfileId: string;
  startsAt: string;
  endsAt: string;
  feeEur: number;
  performanceFormat: string;
  cancellationTerms: string;
  productionObligations: string;
  depositTerms?: string;
  changeNote?: string;
  note?: string;
  locale?: "en" | "de";
}): Promise<ActionResult & { bookingId?: string; enquiryId?: string }> {
  try {
    const { session, actor } = await requireActor();
    checkRateLimit({
      key: rateLimitKey("profile_enquiry.connect", session.user.id),
      limit: 10,
      windowMs: 60_000,
    });

    const parsed = z
      .object({
        venueId: z.string().uuid(),
        entertainerProfileId: z.string().uuid(),
        note: z.string().trim().max(2000).optional(),
        locale: localeSchema.optional(),
      })
      .merge(offerTermsSchema)
      .safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid offer");
    }
    if (!can(actor, "direct_request.send", { venueId: parsed.data.venueId })) {
      throw new AppError("forbidden", "Published venue required to connect");
    }

    const offer = parseOfferTerms(parsed.data);
    const result = await sendVenueConnectionRequest({
      actor,
      venueId: parsed.data.venueId,
      entertainerProfileId: parsed.data.entertainerProfileId,
      offer,
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    });

    const db = getDb();
    const [profile, venue] = await Promise.all([
      db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.id, parsed.data.entertainerProfileId),
        columns: { actName: true, userId: true },
      }),
      db.query.venues.findFirst({
        where: eq(venues.id, parsed.data.venueId),
        columns: { name: true },
      }),
    ]);

    if (profile?.userId) {
      await notifyUser({
        userId: profile.userId,
        type: "profile_enquiry_received",
        subjectId: result.enquiryId,
        params: {
          direction: "venue",
          entertainerName: profile.actName ?? "your act",
          venueName: venue?.name ?? "A venue",
          enquiryId: result.enquiryId,
          bookingId: result.bookingId,
        },
      });
    }

    const locale = parsed.data.locale ?? "en";
    revalidatePath(
      `/${locale}/marketplace/entertainers/${parsed.data.entertainerProfileId}`,
    );
    revalidatePath(`/${locale}/marketplace/bookings`);
    revalidatePath(`/${locale}/marketplace/bookings/${result.bookingId}`);
    revalidatePath("/", "layout");
    return {
      ok: true,
      enquiryId: result.enquiryId,
      bookingId: result.bookingId,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function respondToProfileEnquiryAction(input: {
  enquiryId: string;
  decision: "interested" | "passed";
  locale?: "en" | "de";
}): Promise<ActionResult> {
  try {
    const { actor } = await requireActor();
    const parsed = z
      .object({
        enquiryId: z.string().uuid(),
        decision: z.enum(["interested", "passed"]),
        locale: localeSchema.optional(),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid response");
    }

    const enquiry = await getProfileEnquiryById(parsed.data.enquiryId);
    if (!enquiry) throw new AppError("not_found", "Enquiry not found");

    const initiatedByAct =
      enquiry.submittedByUserId === enquiry.entertainerUserId;
    const canVenueRespond =
      initiatedByAct &&
      can(actor, "profile_enquiry.respond", { venueId: enquiry.venueId });
    const canActRespond =
      !initiatedByAct &&
      actor.roles.includes("entertainer") &&
      actor.userId === enquiry.entertainerUserId &&
      actor.entertainerVerified;
    if (!canVenueRespond && !canActRespond) {
      throw new AppError("forbidden", "Cannot respond to this enquiry");
    }

    if (parsed.data.decision !== "passed") {
      throw new AppError(
        "invalid_transition",
        "Accept or counter the open offer instead of marking interested",
      );
    }

    const result = await respondToProfileEnquiry({
      actor,
      enquiryId: parsed.data.enquiryId,
      decision: "passed",
    });

    if (initiatedByAct) {
      await notifyUser({
        userId: enquiry.entertainerUserId,
        type: "profile_enquiry_passed",
        subjectId: enquiry.id,
        params: {
          venueName: enquiry.venueName,
          enquiryId: enquiry.id,
          bookingId: result.bookingId,
        },
      });
    } else {
      const operators = await listVenueOperatorUserIds(enquiry.venueId);
      await Promise.all(
        operators.map((userId) =>
          notifyUser({
            userId,
            type: "profile_enquiry_passed",
            subjectId: enquiry.id,
            params: {
              direction: "act",
              entertainerName: enquiry.actName,
              venueName: enquiry.venueName,
              enquiryId: enquiry.id,
              bookingId: result.bookingId,
            },
          }),
        ),
      );
    }

    const locale = parsed.data.locale ?? "en";
    revalidatePath(`/${locale}/marketplace/bookings`);
    if (result.bookingId) {
      revalidatePath(`/${locale}/marketplace/bookings/${result.bookingId}`);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLeadProposalAction(input: {
  enquiryId: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
  proposedFeeEur?: number | null;
  proposedFormat?: string | null;
  note?: string | null;
  locale?: "en" | "de";
}): Promise<ActionResult> {
  try {
    const { actor } = await requireActor();
    const parsed = z
      .object({
        enquiryId: z.string().uuid(),
        proposedStartsAt: z.string().nullable().optional(),
        proposedEndsAt: z.string().nullable().optional(),
        proposedFeeEur: z.number().min(0).nullable().optional(),
        proposedFormat: z.string().trim().max(200).nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
        locale: localeSchema.optional(),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid lead proposal");
    }

    await updateProfileEnquiryProposal({
      actor,
      enquiryId: parsed.data.enquiryId,
      ...(parsed.data.proposedStartsAt !== undefined
        ? {
            proposedStartsAt: parsed.data.proposedStartsAt
              ? new Date(parsed.data.proposedStartsAt)
              : null,
          }
        : {}),
      ...(parsed.data.proposedEndsAt !== undefined
        ? {
            proposedEndsAt: parsed.data.proposedEndsAt
              ? new Date(parsed.data.proposedEndsAt)
              : null,
          }
        : {}),
      ...(parsed.data.proposedFeeEur !== undefined
        ? {
            proposedFeeCents:
              parsed.data.proposedFeeEur === null
                ? null
                : Math.round(parsed.data.proposedFeeEur * 100),
          }
        : {}),
      ...(parsed.data.proposedFormat !== undefined
        ? { proposedFormat: parsed.data.proposedFormat }
        : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    });

    const locale = parsed.data.locale ?? "en";
    const enquiry = await getProfileEnquiryById(parsed.data.enquiryId);
    revalidatePath(`/${locale}/marketplace/bookings`);
    if (enquiry?.bookingId) {
      revalidatePath(`/${locale}/marketplace/bookings/${enquiry.bookingId}`);
    }
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
