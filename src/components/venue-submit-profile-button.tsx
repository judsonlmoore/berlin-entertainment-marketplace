"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import { submitProfileEnquiryAction } from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";

type Props = {
  locale: "en" | "de";
  venueId: string;
  canSubmit: boolean;
  publishRequired: boolean;
  activeEnquiryBookingId?: string | null;
  cooldownDaysRemaining?: number | null;
};

/**
 * Hero primary CTA for talent → venue profile enquiry (parity with
 * ConnectionRequestButton on act pages). Optional note is collapsed.
 */
export function VenueSubmitProfileButton({
  locale,
  venueId,
  canSubmit,
  publishRequired,
  activeEnquiryBookingId,
  cooldownDaysRemaining,
}: Props) {
  const t = useTranslations("leads");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cooldownDays = cooldownDaysRemaining ?? null;
  const onCooldown = cooldownDays != null && cooldownDays > 0;
  const hasActive = Boolean(activeEnquiryBookingId);
  const inactive = onCooldown || hasActive;

  if (publishRequired) {
    return (
      <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
        {t("publishRequired")}{" "}
        <Link href="/profile" className="font-medium underline">
          {t("goToProfile")}
        </Link>
      </p>
    );
  }

  if (!canSubmit && !hasActive && !onCooldown) {
    return null;
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {!inactive && canSubmit ? (
        <>
          <button
            type="button"
            className="text-right text-sm text-[var(--text-muted)] underline-offset-2 hover:underline"
            onClick={() => setNoteOpen((open) => !open)}
            aria-expanded={noteOpen}
          >
            {noteOpen ? t("noteDisclosureHide") : t("noteDisclosureShow")}
          </button>
          {noteOpen ? (
            <label className="grid w-full max-w-xs gap-1 text-sm sm:justify-items-end">
              <span className="sr-only">{t("noteLabel")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={2000}
                className="field w-full"
                placeholder={t("notePlaceholder")}
              />
            </label>
          ) : null}
        </>
      ) : null}
      <Button
        type="button"
        variant="primary"
        disabled={pending || inactive || !canSubmit}
        pending={pending}
        pendingLabel={t("submitting")}
        onClick={() => {
          if (inactive || !canSubmit) return;
          setError(null);
          startTransition(async () => {
            const result = await submitProfileEnquiryAction({
              venueId,
              ...(note.trim() ? { note: note.trim() } : {}),
              locale,
            });
            if (!result.ok) {
              setError(
                result.code === "validation" || result.code === "forbidden"
                  ? errors(result.code)
                  : result.message,
              );
              return;
            }
            setNote("");
            setNoteOpen(false);
            router.refresh();
          });
        }}
      >
        {t("submitProfileCta")}
      </Button>
      {onCooldown ? (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {t("enquiryCooldown", { days: cooldownDays })}
          {activeEnquiryBookingId ? (
            <>
              {" "}
              <Link
                href={`/marketplace/bookings/${activeEnquiryBookingId}`}
                className="font-medium underline"
              >
                {t("viewLead")}
              </Link>
            </>
          ) : null}
        </p>
      ) : hasActive ? (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {t("enquiryAlreadyActive")}{" "}
          <Link
            href={`/marketplace/bookings/${activeEnquiryBookingId}`}
            className="font-medium underline"
          >
            {t("viewLead")}
          </Link>
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="max-w-xs text-right text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
