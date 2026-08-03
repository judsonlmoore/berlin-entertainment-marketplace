"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { upsertAvailability } from "@/src/actions/calendar";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type ResourceOption = {
  key: string;
  ownerType: "entertainer" | "venue_space";
  ownerId: string;
  label: string;
};

type Props = {
  locale: "en" | "de";
  resources: ResourceOption[];
  defaultStartsAt: string;
  defaultEndsAt: string;
};

export function CalendarEntryForm({
  locale,
  resources,
  defaultStartsAt,
  defaultEndsAt,
}: Props) {
  const t = useTranslations("calendar");
  const ui = useTranslations("ui");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<
    "available" | "unavailable" | "tentative_hold"
  >("available");

  if (resources.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{t("noResources")}</p>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const resourceKey = String(form.get("resource") ?? "");
        const resource = resources.find((item) => item.key === resourceKey);
        if (!resource) {
          setError(t("noResources"));
          return;
        }
        const holdExpiresAt = String(form.get("holdExpiresAt") ?? "").trim();

        startTransition(async () => {
          const result = await upsertAvailability({
            ownerType: resource.ownerType,
            ownerId: resource.ownerId,
            startsAt: new Date(
              String(form.get("startsAt") ?? ""),
            ).toISOString(),
            endsAt: new Date(String(form.get("endsAt") ?? "")).toISOString(),
            state,
            ...(state === "tentative_hold" && holdExpiresAt
              ? {
                  holdExpiresAt: new Date(holdExpiresAt).toISOString(),
                }
              : {}),
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
      <h3 className="text-lg font-medium">{t("addTitle")}</h3>
      <label className="label">
        <span>{t("resource")}</span>
        <select
          name="resource"
          className="field"
          defaultValue={resources[0]?.key}
        >
          {resources.map((resource) => (
            <option key={resource.key} value={resource.key}>
              {resource.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          <span>{t("startsAt")}</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStartsAt}
            className="field"
          />
        </label>
        <label className="label">
          <span>{t("endsAt")}</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaultEndsAt}
            className="field"
          />
        </label>
      </div>
      <label className="label">
        <span>{t("state")}</span>
        <select
          className="field"
          value={state}
          onChange={(event) =>
            setState(
              event.target.value as
                "available" | "unavailable" | "tentative_hold",
            )
          }
        >
          <option value="available">{t("stateAvailable")}</option>
          <option value="unavailable">{t("stateUnavailable")}</option>
          <option value="tentative_hold">{t("stateHold")}</option>
        </select>
      </label>
      {state === "tentative_hold" ? (
        <label className="label">
          <span>{t("holdExpiresAt")}</span>
          <input
            name="holdExpiresAt"
            type="datetime-local"
            required
            className="field"
          />
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <Button type="submit" pending={pending} pendingLabel={ui("working")}>
        {t("add")}
      </Button>
    </form>
  );
}
