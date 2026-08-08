"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { proposeBookingTerms } from "@/src/actions/bookings";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Defaults = {
  startsAtLocal: string;
  endsAtLocal: string;
  feeEur: number;
  performanceFormat: string;
};

type Props = {
  locale: "en" | "de";
  bookingId: string;
  expectedVersion: number;
  defaults: Defaults;
};

type Payload = {
  startsAt: string;
  endsAt: string;
  feeEur: number;
  performanceFormat: string;
  cancellationTerms: string;
  productionObligations: string;
  depositTerms?: string;
};

export function BookingTermsForm({
  locale,
  bookingId,
  expectedVersion,
  defaults,
}: Props) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const readPayload = useCallback((form: FormData): Payload | null => {
    const startsAt = String(form.get("startsAt") ?? "").trim();
    const endsAt = String(form.get("endsAt") ?? "").trim();
    const performanceFormat = String(
      form.get("performanceFormat") ?? "",
    ).trim();
    const cancellationTerms = String(
      form.get("cancellationTerms") ?? "",
    ).trim();
    const productionObligations = String(
      form.get("productionObligations") ?? "",
    ).trim();
    if (
      !startsAt ||
      !endsAt ||
      !performanceFormat ||
      !cancellationTerms ||
      !productionObligations
    ) {
      return null;
    }
    const depositTerms = String(form.get("depositTerms") ?? "").trim();
    return {
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      feeEur: Number(form.get("feeEur") ?? 0),
      performanceFormat,
      cancellationTerms,
      productionObligations,
      ...(depositTerms ? { depositTerms } : {}),
    };
  }, []);

  const autosave = useProfileAutosave({
    formRef,
    readPayload,
    save: async (payload) => {
      const result = await proposeBookingTerms({
        bookingId,
        expectedVersion,
        locale,
        ...payload,
      });
      if (result.ok) router.refresh();
      return result;
    },
    debounceMs: 2500,
  });

  return (
    <form ref={formRef} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-medium">{t("proposeTitle")}</h3>
        <AutosaveStatus
          phase={autosave.phase}
          errorMessage={autosave.errorMessage}
        />
      </div>
      <p className="text-sm text-[var(--text-muted)]">{t("proposeBody")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{t("startsAt")}</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaults.startsAtLocal}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("endsAt")}</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaults.endsAtLocal}
            className="field"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span>{t("fee")}</span>
        <input
          name="feeEur"
          type="number"
          min={0}
          required
          defaultValue={defaults.feeEur}
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("performanceFormat")}</span>
        <input
          name="performanceFormat"
          required
          defaultValue={defaults.performanceFormat}
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("cancellationTerms")}</span>
        <textarea
          name="cancellationTerms"
          required
          rows={3}
          defaultValue={t("cancellationDefault")}
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("productionObligations")}</span>
        <textarea
          name="productionObligations"
          required
          rows={3}
          defaultValue={t("productionDefault")}
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("depositTerms")}</span>
        <textarea name="depositTerms" rows={2} className="field" />
      </label>
      <Button
        type="button"
        variant="primary"
        pending={autosave.phase === "saving"}
        pendingLabel={ui("working")}
        onClick={() => void autosave.saveNow()}
        className="justify-self-start"
      >
        {t("propose")}
      </Button>
    </form>
  );
}
