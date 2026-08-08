"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { updateLeadProposalAction } from "@/src/actions/profile-enquiries";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import { parseDatetimeLocalInTimeZone } from "@/src/lib/format";

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

type Payload = {
  note: string;
  proposedFormat: string;
  proposedFeeEur: number | null;
  proposedStartsAt: string | null;
  proposedEndsAt: string | null;
};

export function LeadProposalForm({ locale, enquiryId, initial }: Props) {
  const t = useTranslations("leads");
  const formRef = useRef<HTMLFormElement>(null);

  const readPayload = useCallback((form: FormData): Payload => {
    const startsLocal = String(form.get("proposedStartsAt") ?? "").trim();
    const endsLocal = String(form.get("proposedEndsAt") ?? "").trim();
    const feeRaw = String(form.get("proposedFeeEur") ?? "").trim();
    return {
      note: String(form.get("note") ?? ""),
      proposedFormat: String(form.get("proposedFormat") ?? ""),
      proposedFeeEur: feeRaw === "" ? null : Number(feeRaw),
      proposedStartsAt: startsLocal
        ? parseDatetimeLocalInTimeZone(startsLocal).toISOString()
        : null,
      proposedEndsAt: endsLocal
        ? parseDatetimeLocalInTimeZone(endsLocal).toISOString()
        : null,
    };
  }, []);

  const autosave = useProfileAutosave({
    formRef,
    readPayload,
    save: async (payload) =>
      updateLeadProposalAction({
        enquiryId,
        locale,
        ...payload,
      }),
    debounceMs: 2000,
  });

  return (
    <form ref={formRef} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-medium">{t("proposalTitle")}</h3>
        <AutosaveStatus
          phase={autosave.phase}
          errorMessage={autosave.errorMessage}
        />
      </div>
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
    </form>
  );
}
