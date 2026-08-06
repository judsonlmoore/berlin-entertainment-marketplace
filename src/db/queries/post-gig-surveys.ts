import { and, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  agreements,
  bookingTerms,
  bookings,
  postGigSurveys,
  signatures,
} from "@/src/db/schema/marketplace";
import { notifications } from "@/src/db/schema/notifications";
import { users } from "@/src/db/schema/auth";
import { generateNotificationContent } from "@/src/domain/notifications/templates";
import type { notificationTypeEnum } from "@/src/db/schema";

export async function getPostGigSurveyInvitationForActor(input: {
  bookingId: string;
  signerUserId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(postGigSurveys)
    .where(
      and(
        eq(postGigSurveys.bookingId, input.bookingId),
        eq(postGigSurveys.signerUserId, input.signerUserId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Daily reconciliation job:
 * - Finds confirmed bookings whose agreed endsAt is in the past
 * - Creates post-gig survey invitations for both booking signers
 * - Sends one in-app notification per signer (idempotent via notificationSentAt)
 */
export async function reconcilePostGigSurveyInvitations(input?: {
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const db = getDb();

  const eligibleSigners = await db
    .select({
      bookingId: bookings.id,
      signerUserId: signatures.signerUserId,
      partyRole: signatures.partyRole,
      preferredLocale: users.preferredLocale,
    })
    .from(bookings)
    .innerJoin(bookingTerms, and(eq(bookingTerms.bookingId, bookings.id)))
    .innerJoin(agreements, eq(agreements.bookingId, bookings.id))
    .innerJoin(signatures, eq(signatures.agreementId, agreements.id))
    .innerJoin(users, eq(users.id, signatures.signerUserId))
    .where(
      and(
        eq(bookings.state, "confirmed"),
        isNotNull(bookingTerms.acceptedAt),
        lte(bookingTerms.endsAt, now),
        eq(signatures.status, "signed"),
        inArray(signatures.partyRole, ["venue", "entertainer"]),
      ),
    );

  if (eligibleSigners.length === 0) {
    return { invitationsChecked: 0, notificationsSent: 0, checkedAt: now };
  }

  const bookingIds = Array.from(
    new Set(eligibleSigners.map((r) => r.bookingId)),
  );

  return await db.transaction(async (tx) => {
    await tx
      .insert(postGigSurveys)
      .values(
        eligibleSigners.map((s) => ({
          bookingId: s.bookingId,
          signerUserId: s.signerUserId,
          partyRole: s.partyRole as "venue" | "entertainer",
        })),
      )
      .onConflictDoNothing();

    const invitationsToNotify = await tx
      .select({
        id: postGigSurveys.id,
        bookingId: postGigSurveys.bookingId,
        signerUserId: postGigSurveys.signerUserId,
        partyRole: postGigSurveys.partyRole,
        preferredLocale: users.preferredLocale,
      })
      .from(postGigSurveys)
      .innerJoin(users, eq(users.id, postGigSurveys.signerUserId))
      .where(
        and(
          inArray(postGigSurveys.bookingId, bookingIds),
          eq(postGigSurveys.status, "invited"),
          isNull(postGigSurveys.notificationSentAt),
        ),
      );

    const notificationType: (typeof notificationTypeEnum.enumValues)[number] =
      "booking_post_gig_survey_ready";

    for (const invitation of invitationsToNotify) {
      const content = generateNotificationContent({
        type: notificationType,
        locale: invitation.preferredLocale,
        params: { bookingId: invitation.bookingId },
      });

      await tx.insert(notifications).values({
        recipientUserId: invitation.signerUserId,
        type: notificationType,
        subjectType: "booking",
        subjectId: invitation.bookingId,
        title: content.title,
        body: content.body,
        actionUrl: content.actionUrl,
        actionLabel: content.actionLabel,
        metadata: {
          partyRole: invitation.partyRole,
        },
        isRead: false,
      });

      await tx
        .update(postGigSurveys)
        .set({
          notificationSentAt: now,
          updatedAt: now,
        })
        .where(eq(postGigSurveys.id, invitation.id));
    }

    await tx.insert(auditEvents).values({
      actorUserId: null,
      action: "booking.post_gig_survey_cron_reconcile",
      subjectType: "system",
      subjectId: "post-gig-survey-cron",
      metadata: {
        invitationsEligible: eligibleSigners.length,
        notificationsSent: invitationsToNotify.length,
        checkedAt: now.toISOString(),
      },
    });

    return {
      invitationsChecked: eligibleSigners.length,
      notificationsSent: invitationsToNotify.length,
      checkedAt: now,
    };
  });
}
