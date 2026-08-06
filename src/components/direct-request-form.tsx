"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendDirectRequest } from "@/src/actions/direct-requests";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type VenueOption = { id: string; name: string };

type Props = {
  locale: "en" | "de";
  entertainerProfileId: string;
  venues: VenueOption[];
};

export function DirectRequestForm({
  locale,
  entertainerProfileId,
  venues,
}: Props) {
  const t = useTranslations("directRequests");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (venues.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{t("noVenues")}</p>;
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        const form = new FormData(event.currentTarget);
        const notes = String(form.get("notes") ?? "").trim();

        startTransition(async () => {
          const result = await sendDirectRequest({
            venueId: String(form.get("venueId") ?? ""),
            entertainerProfileId,
            startsAt: new Date(
              String(form.get("startsAt") ?? ""),
            ).toISOString(),
            endsAt: new Date(String(form.get("endsAt") ?? "")).toISOString(),
            proposedFeeEur: Number(form.get("proposedFeeEur") ?? 0),
            formatCategory: String(form.get("formatCategory") ?? ""),
            ...(notes ? { notes } : {}),
            locale,
          });
          if (!result.ok) {
            setError(
              result.code === "validation" ||
                result.code === "forbidden" ||
                result.code === "conflict"
                ? result.message
                : errors.has(result.code)
                  ? errors(result.code as "validation")
                  : result.message,
            );
            return;
          }
          setMessage(t("sent"));
          router.push("/marketplace/bookings");
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("sendTitle")}</h3>
      <label className="grid gap-1 text-sm">
        <span>{t("venue")}</span>
        <select
          name="venueId"
          required
          className="field"
          defaultValue={venues[0]?.id}
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
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
        <input name="formatCategory" required className="field" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("proposedFee")}</span>
        <input
          name="proposedFeeEur"
          type="number"
          min={0}
          required
          className="field"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("notes")}</span>
        <textarea name="notes" rows={3} className="field" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {message}
        </p>
      ) : null}
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
      >
        {t("send")}
      </Button>
    </form>
  );
}
