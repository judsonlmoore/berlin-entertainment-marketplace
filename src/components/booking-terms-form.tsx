"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { proposeBookingTerms } from "@/src/actions/bookings";
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

export function BookingTermsForm({
  locale,
  bookingId,
  expectedVersion,
  defaults,
}: Props) {
  const t = useTranslations("bookings");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const depositTerms = String(form.get("depositTerms") ?? "").trim();

        startTransition(async () => {
          const result = await proposeBookingTerms({
            bookingId,
            expectedVersion,
            startsAt: new Date(
              String(form.get("startsAt") ?? ""),
            ).toISOString(),
            endsAt: new Date(String(form.get("endsAt") ?? "")).toISOString(),
            feeEur: Number(form.get("feeEur") ?? 0),
            performanceFormat: String(form.get("performanceFormat") ?? ""),
            cancellationTerms: String(form.get("cancellationTerms") ?? ""),
            productionObligations: String(
              form.get("productionObligations") ?? "",
            ),
            ...(depositTerms ? { depositTerms } : {}),
            locale,
          });
          if (!result.ok) {
            setError(
              errors.has(result.code)
                ? errors(result.code as "validation")
                : result.message,
            );
            return;
          }
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("proposeTitle")}</h3>
      <p className="text-sm text-[var(--muted)]">{t("proposeBody")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{t("startsAt")}</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaults.startsAtLocal}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("endsAt")}</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaults.endsAtLocal}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
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
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("performanceFormat")}</span>
        <input
          name="performanceFormat"
          required
          defaultValue={defaults.performanceFormat}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("cancellationTerms")}</span>
        <textarea
          name="cancellationTerms"
          required
          rows={3}
          defaultValue={t("cancellationDefault")}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("productionObligations")}</span>
        <textarea
          name="productionObligations"
          required
          rows={3}
          defaultValue={t("productionDefault")}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("depositTerms")}</span>
        <textarea
          name="depositTerms"
          rows={2}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-[var(--accent)] px-4 py-3 text-[var(--background)] disabled:opacity-60"
      >
        {t("propose")}
      </button>
    </form>
  );
}
