"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  submitEntertainerProfile,
  upsertEntertainerProfile,
} from "@/src/actions/profiles";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  defaultValues?: {
    actName: string;
    category: string;
    description: string;
    groupSize: number;
    berlinBase: string;
    travelRadiusKm: number;
    priceMinCents: number;
    priceMaxCents: number;
    durationMinutes: number;
    technicalRequirements: string;
  };
  publicationState?: string;
  defaultContactEmail: string;
};

export function EntertainerProfileForm({
  locale,
  defaultValues,
  publicationState,
  defaultContactEmail,
}: Props) {
  const t = useTranslations("profile");
  const errors = useTranslations("errors");
  const status = useTranslations("publication");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function readForm(form: FormData) {
    return {
      actName: String(form.get("actName") ?? ""),
      category: String(form.get("category") ?? ""),
      description: String(form.get("description") ?? ""),
      groupSize: Number(form.get("groupSize") ?? 1),
      berlinBase: String(form.get("berlinBase") ?? ""),
      travelRadiusKm: Number(form.get("travelRadiusKm") ?? 25),
      priceMinCents: Math.round(Number(form.get("priceMinEur") ?? 0) * 100),
      priceMaxCents: Math.round(Number(form.get("priceMaxEur") ?? 0) * 100),
      durationMinutes: Number(form.get("durationMinutes") ?? 60),
      technicalRequirements: String(form.get("technicalRequirements") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      locale,
    };
  }

  return (
    <div className="grid gap-4">
      {publicationState ? (
        <p className="text-sm text-[var(--muted)]">
          {t("publicationLabel")}: {status(publicationState as "draft")}
        </p>
      ) : null}
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await upsertEntertainerProfile(readForm(form));
            if (!result.ok) {
              setError(
                result.code === "validation" ||
                  result.code === "forbidden" ||
                  result.code === "unauthorized"
                  ? errors(result.code)
                  : result.message,
              );
              return;
            }
            setMessage(t("saved"));
            router.refresh();
          });
        }}
      >
        <label className="grid gap-1 text-sm">
          <span>{t("actName")}</span>
          <input
            name="actName"
            required
            defaultValue={defaultValues?.actName}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("category")}</span>
          <input
            name="category"
            required
            defaultValue={defaultValues?.category}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("description")}</span>
          <textarea
            name="description"
            required
            rows={4}
            defaultValue={defaultValues?.description}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>{t("groupSize")}</span>
            <input
              name="groupSize"
              type="number"
              min={1}
              required
              defaultValue={defaultValues?.groupSize ?? 1}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("durationMinutes")}</span>
            <input
              name="durationMinutes"
              type="number"
              min={1}
              required
              defaultValue={defaultValues?.durationMinutes ?? 60}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>{t("berlinBase")}</span>
          <input
            name="berlinBase"
            required
            defaultValue={defaultValues?.berlinBase}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("travelRadiusKm")}</span>
          <input
            name="travelRadiusKm"
            type="number"
            min={0}
            required
            defaultValue={defaultValues?.travelRadiusKm ?? 25}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>{t("priceMinEur")}</span>
            <input
              name="priceMinEur"
              type="number"
              min={0}
              step="1"
              required
              defaultValue={
                defaultValues
                  ? Math.round(defaultValues.priceMinCents / 100)
                  : 0
              }
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("priceMaxEur")}</span>
            <input
              name="priceMaxEur"
              type="number"
              min={0}
              step="1"
              required
              defaultValue={
                defaultValues
                  ? Math.round(defaultValues.priceMaxCents / 100)
                  : 0
              }
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>{t("technicalRequirements")}</span>
          <textarea
            name="technicalRequirements"
            required
            rows={3}
            defaultValue={defaultValues?.technicalRequirements}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("contactEmail")}</span>
          <input
            name="contactEmail"
            type="email"
            required
            defaultValue={defaultContactEmail}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="bg-[var(--accent)] px-4 py-3 text-[var(--background)] disabled:opacity-60"
        >
          {t("saveDraft")}
        </button>
      </form>

      {defaultValues ? (
        <button
          type="button"
          disabled={pending}
          className="border border-[var(--line)] px-4 py-3 disabled:opacity-60"
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await submitEntertainerProfile(locale);
              if (!result.ok) {
                setError(
                  result.code === "invalid_transition"
                    ? errors("invalid_transition")
                    : result.message,
                );
                return;
              }
              setMessage(t("submitted"));
              router.refresh();
            });
          }}
        >
          {t("submitForReview")}
        </button>
      ) : null}
    </div>
  );
}
