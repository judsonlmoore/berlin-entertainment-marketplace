"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { saveLegalIdentityAction } from "@/src/actions/legal-identity";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import type { LegalIdentityFields } from "@/src/domain/legal-identity";

type Props = {
  locale: "en" | "de";
  initial: LegalIdentityFields | null;
  /** Section field error shown above the form. */
  error?: string | null;
  onSaved?: (fields: LegalIdentityFields) => void;
  /** Wizard already shows the page title — hide the form heading. */
  embedded?: boolean;
};

export function LegalIdentityForm({
  locale,
  initial,
  error = null,
  onSaved,
  embedded = false,
}: Props) {
  const t = useTranslations("profile");
  const formRef = useRef<HTMLFormElement>(null);

  const readPayload = useCallback(
    (form: FormData) => {
      return {
        entityType: String(form.get("entityType") ?? "individual") as
          "individual" | "freelancer" | "registered_business",
        legalName: String(form.get("legalName") ?? ""),
        tradingName: String(form.get("tradingName") ?? "") || null,
        addressLine1: String(form.get("addressLine1") ?? ""),
        addressLine2: String(form.get("addressLine2") ?? "") || null,
        postalCode: String(form.get("postalCode") ?? ""),
        city: String(form.get("city") ?? ""),
        countryCode: String(form.get("countryCode") ?? "DE"),
        taxId: String(form.get("taxId") ?? "") || null,
        companyRegisterId: String(form.get("companyRegisterId") ?? "") || null,
        invoiceEmail: String(form.get("invoiceEmail") ?? ""),
        iban: String(form.get("iban") ?? "") || null,
        bic: String(form.get("bic") ?? "") || null,
        paymentNote: String(form.get("paymentNote") ?? "") || null,
        locale,
      };
    },
    [locale],
  );

  const autosave = useProfileAutosave({
    formRef,
    readPayload: (form) => {
      const payload = readPayload(form);
      if (!payload.legalName.trim() || !payload.invoiceEmail.trim())
        return null;
      return payload;
    },
    save: async (payload) => {
      const result = await saveLegalIdentityAction(payload);
      if (result.ok) {
        onSaved?.({
          entityType: payload.entityType,
          legalName: payload.legalName,
          tradingName: payload.tradingName,
          addressLine1: payload.addressLine1,
          addressLine2: payload.addressLine2,
          postalCode: payload.postalCode,
          city: payload.city,
          countryCode: payload.countryCode,
          taxId: payload.taxId,
          companyRegisterId: payload.companyRegisterId,
          invoiceEmail: payload.invoiceEmail,
          iban: payload.iban,
          bic: payload.bic,
          paymentNote: payload.paymentNote,
        });
      }
      return result;
    },
    debounceMs: 2500,
  });

  return (
    <form
      ref={formRef}
      id="field-legalIdentity"
      data-field="legalIdentity"
      className={
        error
          ? "panel grid gap-4 border-[var(--danger)] p-6"
          : "panel grid gap-4 p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {embedded ? null : (
            <h3 className="text-sm font-semibold tracking-[0.12em] text-[var(--ink)] uppercase">
              {t("sectionLegal")}
            </h3>
          )}
          <p
            className={
              embedded
                ? "text-sm text-[var(--text-muted)]"
                : "mt-1 text-sm text-[var(--text-muted)]"
            }
          >
            {t("legalBody")}
          </p>
        </div>
        <AutosaveStatus
          phase={autosave.phase}
          errorMessage={autosave.errorMessage}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <p className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-muted)]">
        {t("legalHiddenUntilContract")}
      </p>

      <label className="label">
        <span className="field-label">{t("entityType")}</span>
        <select
          name="entityType"
          className="field"
          defaultValue={initial?.entityType ?? "individual"}
        >
          <option value="individual">{t("entityIndividual")}</option>
          <option value="freelancer">{t("entityFreelancer")}</option>
          <option value="registered_business">{t("entityBusiness")}</option>
        </select>
      </label>
      <label className="label">
        <span className="field-label">{t("legalName")}</span>
        <input
          name="legalName"
          className="field"
          defaultValue={initial?.legalName ?? ""}
          required
        />
      </label>
      <label className="label">
        <span className="field-label">{t("tradingName")}</span>
        <input
          name="tradingName"
          className="field"
          defaultValue={initial?.tradingName ?? ""}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("addressLine1")}</span>
        <input
          name="addressLine1"
          className="field"
          defaultValue={initial?.addressLine1 ?? ""}
          required
        />
      </label>
      <label className="label">
        <span className="field-label">{t("addressLine2")}</span>
        <input
          name="addressLine2"
          className="field"
          defaultValue={initial?.addressLine2 ?? ""}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="label">
          <span className="field-label">{t("postalCode")}</span>
          <input
            name="postalCode"
            className="field"
            defaultValue={initial?.postalCode ?? ""}
            required
          />
        </label>
        <label className="label">
          <span className="field-label">{t("city")}</span>
          <input
            name="city"
            className="field"
            defaultValue={initial?.city ?? ""}
            required
          />
        </label>
        <label className="label">
          <span className="field-label">{t("countryCode")}</span>
          <input
            name="countryCode"
            className="field"
            defaultValue={initial?.countryCode ?? "DE"}
            maxLength={2}
            required
          />
        </label>
      </div>
      <label className="label">
        <span className="field-label">{t("taxId")}</span>
        <input
          name="taxId"
          className="field"
          defaultValue={initial?.taxId ?? ""}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("companyRegisterId")}</span>
        <input
          name="companyRegisterId"
          className="field"
          defaultValue={initial?.companyRegisterId ?? ""}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("invoiceEmail")}</span>
        <input
          name="invoiceEmail"
          type="email"
          className="field"
          defaultValue={initial?.invoiceEmail ?? ""}
          required
        />
      </label>
      <label className="label">
        <span className="field-label">{t("iban")}</span>
        <input
          name="iban"
          className="field"
          defaultValue={initial?.iban ?? ""}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("bic")}</span>
        <input name="bic" className="field" defaultValue={initial?.bic ?? ""} />
      </label>
      <label className="label">
        <span className="field-label">{t("paymentNote")}</span>
        <textarea
          name="paymentNote"
          rows={2}
          className="field"
          defaultValue={initial?.paymentNote ?? ""}
        />
      </label>
    </form>
  );
}
