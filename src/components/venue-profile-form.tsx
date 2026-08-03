"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createVenue,
  submitVenueProfile,
  updateVenue,
} from "@/src/actions/profiles";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  venueId?: string;
  publicationState?: string;
  defaultContactEmail: string;
  defaultValues?: {
    name: string;
    shortDescription: string;
    addressLine1: string;
    addressLine2?: string | null;
    district: string;
    postalCode: string;
    latitude?: string | null;
    longitude?: string | null;
    venueType: string;
    audienceDescription: string;
    capacity: number;
    capacityContext?: string | null;
    productionNotes?: string;
    websiteUrl?: string | null;
  };
};

export function VenueProfileForm({
  locale,
  venueId,
  publicationState,
  defaultContactEmail,
  defaultValues,
}: Props) {
  const t = useTranslations("profile");
  const errors = useTranslations("errors");
  const status = useTranslations("publication");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function readForm(form: FormData) {
    const website = String(form.get("websiteUrl") ?? "").trim();
    const addressLine2 = String(form.get("addressLine2") ?? "").trim();
    const capacityContext = String(form.get("capacityContext") ?? "").trim();
    const productionNotes = String(form.get("productionNotes") ?? "").trim();
    const latitude = String(form.get("latitude") ?? "").trim();
    const longitude = String(form.get("longitude") ?? "").trim();

    return {
      name: String(form.get("name") ?? ""),
      shortDescription: String(form.get("shortDescription") ?? ""),
      addressLine1: String(form.get("addressLine1") ?? ""),
      ...(addressLine2 ? { addressLine2 } : {}),
      district: String(form.get("district") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      ...(latitude ? { latitude } : {}),
      ...(longitude ? { longitude } : {}),
      venueType: String(form.get("venueType") ?? ""),
      audienceDescription: String(form.get("audienceDescription") ?? ""),
      capacity: Number(form.get("capacity") ?? 1),
      ...(capacityContext ? { capacityContext } : {}),
      ...(productionNotes ? { productionNotes } : {}),
      ...(website ? { websiteUrl: website } : { websiteUrl: "" }),
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
            const payload = readForm(form);
            const result = venueId
              ? await updateVenue(venueId, payload)
              : await createVenue(payload);
            if (!result.ok) {
              setError(
                result.code === "validation" || result.code === "forbidden"
                  ? errors(result.code)
                  : result.message,
              );
              return;
            }
            setMessage(t("saved"));
            if (!venueId && result.id) {
              router.push(`/profile/venues/${result.id}`);
            }
            router.refresh();
          });
        }}
      >
        <label className="grid gap-1 text-sm">
          <span>{t("venueName")}</span>
          <input
            name="name"
            required
            defaultValue={defaultValues?.name}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("shortDescription")}</span>
          <textarea
            name="shortDescription"
            required
            rows={3}
            defaultValue={defaultValues?.shortDescription}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("addressLine1")}</span>
          <input
            name="addressLine1"
            required
            defaultValue={defaultValues?.addressLine1}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("addressLine2")}</span>
          <input
            name="addressLine2"
            defaultValue={defaultValues?.addressLine2 ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>{t("district")}</span>
            <input
              name="district"
              required
              defaultValue={defaultValues?.district}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("postalCode")}</span>
            <input
              name="postalCode"
              required
              defaultValue={defaultValues?.postalCode}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>{t("latitude")}</span>
            <input
              name="latitude"
              defaultValue={defaultValues?.latitude ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("longitude")}</span>
            <input
              name="longitude"
              defaultValue={defaultValues?.longitude ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>{t("venueType")}</span>
          <input
            name="venueType"
            required
            defaultValue={defaultValues?.venueType}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("audienceDescription")}</span>
          <textarea
            name="audienceDescription"
            required
            rows={3}
            defaultValue={defaultValues?.audienceDescription}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>{t("capacity")}</span>
            <input
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={defaultValues?.capacity ?? 50}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("capacityContext")}</span>
            <input
              name="capacityContext"
              defaultValue={defaultValues?.capacityContext ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>{t("productionNotes")}</span>
          <textarea
            name="productionNotes"
            rows={3}
            defaultValue={defaultValues?.productionNotes ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("websiteUrl")}</span>
          <input
            name="websiteUrl"
            type="url"
            defaultValue={defaultValues?.websiteUrl ?? ""}
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
        <Button
          type="submit"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
        >
          {venueId ? t("saveDraft") : t("createVenue")}
        </Button>
      </form>

      {venueId ? (
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await submitVenueProfile(venueId, locale);
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
        </Button>
      ) : null}
    </div>
  );
}
