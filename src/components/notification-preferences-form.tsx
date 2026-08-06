"use client";

/**
 * Notification preferences form (client component)
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  setNotificationPreferenceAction,
  setMarketingConsentAction,
} from "@/src/actions/notifications";
import type {
  notificationTypeEnum,
  notificationChannelEnum,
} from "@/src/db/schema";

interface Preference {
  id: string;
  userId: string;
  notificationType: (typeof notificationTypeEnum.enumValues)[number];
  channel: (typeof notificationChannelEnum.enumValues)[number];
  isEnabled: boolean;
}

interface MarketingConsent {
  id: string;
  userId: string;
  hasConsented: boolean;
  consentedAt: Date | null;
  withdrawnAt: Date | null;
}

interface Props {
  preferences: Preference[];
  marketingConsent: MarketingConsent | null;
}

// Notification types grouped by category
const notificationGroups = {
  booking: [
    "booking_request_received",
    "booking_accepted",
    "booking_declined",
    "booking_confirmed",
    "booking_cancelled",
    "booking_post_gig_survey_ready",
  ],
  application: [
    "application_submitted",
    "application_shortlisted",
    "application_rejected",
  ],
  request: [
    "direct_request_received",
    "direct_request_accepted",
    "direct_request_declined",
    "profile_enquiry_received",
    "profile_enquiry_interested",
    "profile_enquiry_passed",
  ],
  agreement: ["agreement_ready", "agreement_signed"],
  approval: [
    "approval_approved",
    "approval_changes_requested",
    "approval_suspended",
  ],
  calendar: ["calendar_conflict_detected", "hold_expiring_soon"],
  venue: ["venue_member_invited", "venue_member_removed"],
  opportunity: ["opportunity_published"],
} as const;

export function NotificationPreferencesForm({
  preferences,
  marketingConsent,
}: Props) {
  const t = useTranslations("notifications");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [localConsent, setLocalConsent] = useState(
    marketingConsent?.hasConsented ?? false,
  );

  // Check if a preference is enabled
  const isEnabled = (
    notificationType: string,
    channel: "in_app" | "email",
  ): boolean => {
    const pref = localPreferences.find(
      (p) => p.notificationType === notificationType && p.channel === channel,
    );
    return pref?.isEnabled ?? true; // Default to enabled
  };

  // Toggle preference
  const togglePreference = (
    notificationType: (typeof notificationTypeEnum.enumValues)[number],
    channel: "in_app" | "email",
  ) => {
    const currentlyEnabled = isEnabled(notificationType, channel);
    const newValue = !currentlyEnabled;

    // Optimistic update
    setLocalPreferences((prev) => {
      const existing = prev.find(
        (p) => p.notificationType === notificationType && p.channel === channel,
      );

      if (existing) {
        return prev.map((p) =>
          p.notificationType === notificationType && p.channel === channel
            ? { ...p, isEnabled: newValue }
            : p,
        );
      }

      return [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          userId: prev[0]?.userId || "",
          notificationType,
          channel,
          isEnabled: newValue,
        },
      ];
    });

    // Save to server
    startTransition(async () => {
      const result = await setNotificationPreferenceAction({
        notificationType,
        channel,
        isEnabled: newValue,
      });

      if (result.ok) {
        setMessage(t("preferencesSaved"));
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error saving preference");
        setTimeout(() => setMessage(""), 3000);
        // Revert optimistic update on error
        setLocalPreferences((prev) =>
          prev.map((p) =>
            p.notificationType === notificationType && p.channel === channel
              ? { ...p, isEnabled: currentlyEnabled }
              : p,
          ),
        );
      }
    });
  };

  // Toggle marketing consent
  const toggleMarketing = () => {
    const newValue = !localConsent;
    setLocalConsent(newValue);

    startTransition(async () => {
      const result = await setMarketingConsentAction({
        hasConsented: newValue,
        consentSource: "settings",
      });

      if (result.ok) {
        setMessage(t("consentUpdated"));
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error updating consent");
        setTimeout(() => setMessage(""), 3000);
        setLocalConsent(!newValue);
      }
    });
  };

  return (
    <div className="grid gap-8">
      {message && (
        <div
          className="rounded-[var(--radius-md)] bg-[var(--success-soft)] p-4 text-sm font-medium"
          role="alert"
        >
          {message}
        </div>
      )}

      {/* Notification Preferences Section */}
      <section className="panel p-6">
        <h2 className="page-title text-xl">{t("notificationsTitle")}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("notificationsBody")}
        </p>

        <div className="mt-6 grid gap-6">
          {Object.entries(notificationGroups).map(([groupKey, types]) => {
            const groupLabel = `${groupKey}Notifications`;
            return (
              <div key={groupKey}>
                <h3 className="mb-3 text-sm font-semibold tracking-[0.12em] text-[var(--text-muted)] uppercase">
                  {t(groupLabel)}
                </h3>
                <div className="grid gap-3">
                  {types.map((type) => (
                    <div
                      key={type}
                      className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--rule)] p-4 sm:grid-cols-[1fr,auto,auto]"
                    >
                      <div>
                        <p className="font-medium">{t(type)}</p>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled(type, "in_app")}
                          onChange={() => togglePreference(type, "in_app")}
                          disabled={isPending}
                          className="h-5 w-5 cursor-pointer rounded border-[var(--rule)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                        />
                        <span className="text-sm font-medium">
                          {t("inAppChannel")}
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled(type, "email")}
                          onChange={() => togglePreference(type, "email")}
                          disabled={isPending}
                          className="h-5 w-5 cursor-pointer rounded border-[var(--rule)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                        />
                        <span className="text-sm font-medium">
                          {t("emailChannel")}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Marketing Consent Section */}
      <section className="panel p-6">
        <h2 className="page-title text-xl">{t("marketingTitle")}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("marketingBody")}
        </p>

        <div className="mt-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={localConsent}
              onChange={toggleMarketing}
              disabled={isPending}
              className="mt-1 h-5 w-5 cursor-pointer rounded border-[var(--rule)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
            />
            <div>
              <p className="font-medium">{t("marketingConsent")}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t("marketingConsentBody")}
              </p>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
