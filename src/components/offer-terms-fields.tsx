"use client";

import { useTranslations } from "next-intl";

export type OfferTermsFieldDefaults = {
  startsAtLocal: string;
  endsAtLocal: string;
  feeEur: number;
  performanceFormat: string;
  cancellationTerms?: string;
  productionObligations?: string;
  depositTerms?: string;
};

type Props = {
  defaults: OfferTermsFieldDefaults;
  /** Require change note (counters). */
  requireChangeNote?: boolean;
  /** Optional freeform note (profile send only). */
  includeNote?: boolean;
};

/**
 * Shared commercial-term fields for Send offer / Counter modals.
 */
export function OfferTermsFields({
  defaults,
  requireChangeNote = false,
  includeNote = false,
}: Props) {
  const t = useTranslations("bookings");
  const leadsT = useTranslations("leads");

  return (
    <>
      <label className="label">
        <span className="field-label">{t("startsAt")}</span>
        <input
          name="startsAt"
          type="datetime-local"
          className="field"
          required
          defaultValue={defaults.startsAtLocal}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("endsAt")}</span>
        <input
          name="endsAt"
          type="datetime-local"
          className="field"
          required
          defaultValue={defaults.endsAtLocal}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("fee")}</span>
        <input
          name="feeEur"
          type="number"
          min={0}
          step="0.01"
          className="field"
          required
          defaultValue={defaults.feeEur}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("performanceFormat")}</span>
        <input
          name="performanceFormat"
          className="field"
          required
          defaultValue={defaults.performanceFormat}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("cancellationTerms")}</span>
        <textarea
          name="cancellationTerms"
          rows={3}
          className="field"
          required
          defaultValue={
            defaults.cancellationTerms ?? t("cancellationDefault")
          }
        />
      </label>
      <label className="label">
        <span className="field-label">{t("productionObligations")}</span>
        <textarea
          name="productionObligations"
          rows={3}
          className="field"
          required
          defaultValue={
            defaults.productionObligations ?? t("productionDefault")
          }
        />
      </label>
      <label className="label">
        <span className="field-label">
          {t("depositTerms")} ({t("optional")})
        </span>
        <textarea
          name="depositTerms"
          rows={2}
          className="field"
          defaultValue={defaults.depositTerms ?? ""}
          placeholder={t("depositTermsPlaceholder")}
        />
      </label>
      {requireChangeNote ? (
        <label className="label">
          <span className="field-label">
            {t("changeNote")} ({t("required")})
          </span>
          <textarea
            name="changeNote"
            rows={3}
            className="field"
            required
            placeholder={t("changeNotePlaceholder")}
          />
        </label>
      ) : null}
      {includeNote ? (
        <label className="label">
          <span className="field-label">
            {leadsT("noteLabel")} ({t("optional")})
          </span>
          <textarea
            name="note"
            rows={2}
            className="field"
            maxLength={2000}
            placeholder={leadsT("notePlaceholder")}
          />
        </label>
      ) : null}
    </>
  );
}
