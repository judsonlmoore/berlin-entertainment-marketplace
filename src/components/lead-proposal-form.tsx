"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { updateLeadProposalAction } from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";

type Props = {
  locale: "en" | "de";
  enquiryId: string;
  initial: {
    note: string;
    proposedStartsAt: string;
    proposedEndsAt: string;
    proposedFeeEur: string;
    proposedFormat: string;
  };
};

export function LeadProposalForm({ locale, enquiryId, initial }: Props) {
  const t = useTranslations("leads");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    const startsLocal = String(formData.get("proposedStartsAt") ?? "").trim();
    const endsLocal = String(formData.get("proposedEndsAt") ?? "").trim();
    const feeRaw = String(formData.get("proposedFeeEur") ?? "").trim();

    startTransition(async () => {
      const result = await updateLeadProposalAction({
        enquiryId,
        locale,
        note: String(formData.get("note") ?? ""),
        proposedFormat: String(formData.get("proposedFormat") ?? ""),
        proposedFeeEur: feeRaw === "" ? null : Number(feeRaw),
        proposedStartsAt: startsLocal
          ? new Date(startsLocal).toISOString()
          : null,
        proposedEndsAt: endsLocal ? new Date(endsLocal).toISOString() : null,
      });
      if (!result.ok) {
        setError(
          result.code === "validation" || result.code === "forbidden"
            ? errors(result.code)
            : result.message,
        );
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3">
      <h3 className="text-lg font-medium">{t("proposalTitle")}</h3>
      <p className="text-sm text-[var(--text-muted)]">{t("proposalBody")}</p>
      <label className="label">
        <span className="field-label">{t("proposedFormat")}</span>
        <input
          name="proposedFormat"
          defaultValue={initial.proposedFormat}
          className="field"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          <span className="field-label">{t("proposedStartsAt")}</span>
          <input
            type="datetime-local"
            name="proposedStartsAt"
            defaultValue={initial.proposedStartsAt}
            className="field"
          />
        </label>
        <label className="label">
          <span className="field-label">{t("proposedEndsAt")}</span>
          <input
            type="datetime-local"
            name="proposedEndsAt"
            defaultValue={initial.proposedEndsAt}
            className="field"
          />
        </label>
      </div>
      <label className="label">
        <span className="field-label">{t("proposedFeeEur")}</span>
        <input
          type="number"
          name="proposedFeeEur"
          min={0}
          step={1}
          defaultValue={initial.proposedFeeEur}
          className="field"
        />
      </label>
      <label className="label">
        <span className="field-label">{t("noteLabel")}</span>
        <textarea
          name="note"
          rows={3}
          defaultValue={initial.note}
          className="field"
        />
      </label>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? t("savingProposal") : t("saveProposal")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-[var(--ink)]">
          {t("proposalSaved")}
        </p>
      ) : null}
    </form>
  );
}
