"use server";

/**
 * Server actions for managing notification preferences
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import {
  getUserNotificationPreferences,
  setNotificationPreference,
  setMarketingConsent,
  getMarketingConsent,
} from "@/src/db/queries/notifications";
import type {
  notificationTypeEnum,
  notificationChannelEnum,
} from "@/src/db/schema";

const setPreferenceSchema = z.object({
  notificationType: z.enum([
    "booking_request_received",
    "booking_accepted",
    "booking_declined",
    "booking_confirmed",
    "booking_cancelled",
    "booking_post_gig_survey_ready",
    "application_submitted",
    "application_shortlisted",
    "application_rejected",
    "agreement_ready",
    "agreement_signed",
    "approval_approved",
    "approval_changes_requested",
    "approval_suspended",
    "direct_request_received",
    "direct_request_accepted",
    "direct_request_declined",
    "profile_enquiry_received",
    "profile_enquiry_interested",
    "profile_enquiry_passed",
    "opportunity_published",
    "calendar_conflict_detected",
    "hold_expiring_soon",
    "venue_member_invited",
    "venue_member_removed",
  ]),
  channel: z.enum(["in_app", "email"]),
  isEnabled: z.boolean(),
});

const setMarketingConsentSchema = z.object({
  hasConsented: z.boolean(),
  consentSource: z.string().optional(),
});

export async function getNotificationPreferencesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const preferences = await getUserNotificationPreferences(session.user.id);

  return { ok: true as const, data: preferences };
}

export async function setNotificationPreferenceAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const parsed = setPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Invalid input",
      details: parsed.error.issues,
    };
  }

  try {
    const preference = await setNotificationPreference({
      userId: session.user.id,
      notificationType: parsed.data
        .notificationType as (typeof notificationTypeEnum.enumValues)[number],
      channel: parsed.data
        .channel as (typeof notificationChannelEnum.enumValues)[number],
      isEnabled: parsed.data.isEnabled,
    });

    revalidatePath("/marketplace/settings/notifications");

    return { ok: true as const, data: preference };
  } catch (error) {
    console.error("Failed to set notification preference:", error);
    return {
      ok: false as const,
      error: "Failed to update preference",
    };
  }
}

export async function getMarketingConsentAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const consent = await getMarketingConsent(session.user.id);

  return { ok: true as const, data: consent };
}

export async function setMarketingConsentAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const parsed = setMarketingConsentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Invalid input",
      details: parsed.error.issues,
    };
  }

  try {
    const consent = await setMarketingConsent({
      userId: session.user.id,
      hasConsented: parsed.data.hasConsented,
      consentSource: parsed.data.consentSource || "settings",
    });

    revalidatePath("/marketplace/settings/notifications");

    return { ok: true as const, data: consent };
  } catch (error) {
    console.error("Failed to set marketing consent:", error);
    return {
      ok: false as const,
      error: "Failed to update consent",
    };
  }
}
