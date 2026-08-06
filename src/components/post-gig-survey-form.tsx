"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitPostGigSurveyResponse } from "@/src/actions/post-gig-surveys";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function PostGigSurveyForm({
  locale,
  bookingId,
  status,
}: {
  locale: "en" | "de";
  bookingId: string;
  status: "invited" | "submitted";
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "submitted") {
    return (
      <div className="grid gap-2">
        <h3 className="text-lg font-medium">
          {t("postGigSurveySubmittedTitle")}
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          {t("postGigSurveySubmittedBody")}
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);

        const overall = String(form.get("overall") ?? "");
        const improvementTextRaw = String(form.get("improvementText") ?? "");
        const improvementText = improvementTextRaw.trim() || undefined;
        const wouldBookAgain = String(form.get("wouldBookAgain") ?? "");

        startTransition(async () => {
          const result = await submitPostGigSurveyResponse({
            bookingId,
            locale,
            response: {
              overall,
              improvementText,
              wouldBookAgain,
            },
          });

          if (!result.ok) {
            setError(result.message);
            return;
          }

          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("postGigSurveyTitle")}</h3>
      <p className="text-sm text-[var(--text-muted)]">
        {t("postGigSurveyBody")}
      </p>

      <label className="grid gap-1 text-sm">
        <span>{t("postGigSurveyQ1Label")}</span>
        <select name="overall" className="field" required defaultValue="okay">
          <option value="great">{t("postGigSurveyQ1Great")}</option>
          <option value="okay">{t("postGigSurveyQ1Okay")}</option>
          <option value="bad">{t("postGigSurveyQ1Bad")}</option>
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        <span>{t("postGigSurveyQ2Label")}</span>
        <textarea
          name="improvementText"
          rows={3}
          className="field"
          placeholder={t("postGigSurveyQ2Placeholder")}
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span>{t("postGigSurveyQ3Label")}</span>
        <select
          name="wouldBookAgain"
          className="field"
          required
          defaultValue="yes"
        >
          <option value="yes">{t("postGigSurveyQ3Yes")}</option>
          <option value="no">{t("postGigSurveyQ3No")}</option>
        </select>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
      >
        {t("postGigSurveySubmit")}
      </Button>
    </form>
  );
}
