"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createOpportunity } from "@/src/actions/opportunities";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  venueId: string;
};

export function OpportunityForm({ locale, venueId }: Props) {
  const t = useTranslations("opportunities");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
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
        const budgetMin = String(form.get("budgetMinEur") ?? "").trim();
        const budgetMax = String(form.get("budgetMaxEur") ?? "").trim();
        const actSizeMin = String(form.get("actSizeMin") ?? "").trim();
        const actSizeMax = String(form.get("actSizeMax") ?? "").trim();
        const deadline = String(form.get("applicationDeadline") ?? "").trim();
        const expectedAudience = String(
          form.get("expectedAudience") ?? "",
        ).trim();
        const productionContext = String(
          form.get("productionContext") ?? "",
        ).trim();
        const notes = String(form.get("notes") ?? "").trim();

        startTransition(async () => {
          const result = await createOpportunity({
            venueId,
            title: String(form.get("title") ?? ""),
            startsAt: new Date(
              String(form.get("startsAt") ?? ""),
            ).toISOString(),
            endsAt: new Date(String(form.get("endsAt") ?? "")).toISOString(),
            formatCategory: String(form.get("formatCategory") ?? ""),
            ...(expectedAudience ? { expectedAudience } : {}),
            ...(budgetMin ? { budgetMinEur: Number(budgetMin) } : {}),
            ...(budgetMax ? { budgetMaxEur: Number(budgetMax) } : {}),
            ...(actSizeMin ? { actSizeMin: Number(actSizeMin) } : {}),
            ...(actSizeMax ? { actSizeMax: Number(actSizeMax) } : {}),
            ...(productionContext ? { productionContext } : {}),
            ...(deadline
              ? { applicationDeadline: new Date(deadline).toISOString() }
              : {}),
            ...(notes ? { notes } : {}),
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
          if (result.id) {
            router.push(`/marketplace/opportunities/${result.id}`);
          }
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("createTitle")}</h3>
      <label className="grid gap-1 text-sm">
        <span>{t("titleLabel")}</span>
        <input
          name="title"
          required
          className="field"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{t("startsAt")}</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("endsAt")}</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            className="field"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span>{t("formatCategory")}</span>
        <input
          name="formatCategory"
          required
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("expectedAudience")}</span>
        <input
          name="expectedAudience"
          className="field"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{t("budgetMin")}</span>
          <input
            name="budgetMinEur"
            type="number"
            min={0}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("budgetMax")}</span>
          <input
            name="budgetMaxEur"
            type="number"
            min={0}
            className="field"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{t("actSizeMin")}</span>
          <input
            name="actSizeMin"
            type="number"
            min={1}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("actSizeMax")}</span>
          <input
            name="actSizeMax"
            type="number"
            min={1}
            className="field"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span>{t("deadline")}</span>
        <input
          name="applicationDeadline"
          type="datetime-local"
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("productionContext")}</span>
        <textarea
          name="productionContext"
          rows={3}
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("notes")}</span>
        <textarea
          name="notes"
          rows={3}
          className="field"
        />
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
        {t("create")}
      </Button>
    </form>
  );
}
