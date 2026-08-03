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

type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  spotify?: string;
  soundcloud?: string;
};

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
    productionPa?: string;
    productionMixer?: string;
    productionMics?: string;
    productionLighting?: string;
    productionBackline?: string;
    productionPower?: string;
    productionStage?: string;
    houseRules?: string | null;
    loadInNotes?: string | null;
    accessibilityNotes?: string | null;
    socialLinks?: SocialLinks;
    websiteUrl?: string | null;
  };
};

function readSocialLinks(form: FormData): SocialLinks {
  return {
    instagram: String(form.get("socialInstagram") ?? ""),
    facebook: String(form.get("socialFacebook") ?? ""),
    tiktok: String(form.get("socialTiktok") ?? ""),
    spotify: String(form.get("socialSpotify") ?? ""),
    soundcloud: String(form.get("socialSoundcloud") ?? ""),
  };
}

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
  const social = defaultValues?.socialLinks ?? {};

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
      productionNotes,
      productionPa: String(form.get("productionPa") ?? ""),
      productionMixer: String(form.get("productionMixer") ?? ""),
      productionMics: String(form.get("productionMics") ?? ""),
      productionLighting: String(form.get("productionLighting") ?? ""),
      productionBackline: String(form.get("productionBackline") ?? ""),
      productionPower: String(form.get("productionPower") ?? ""),
      productionStage: String(form.get("productionStage") ?? ""),
      houseRules: String(form.get("houseRules") ?? ""),
      loadInNotes: String(form.get("loadInNotes") ?? ""),
      accessibilityNotes: String(form.get("accessibilityNotes") ?? ""),
      socialLinks: readSocialLinks(form),
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
        <fieldset className="grid gap-2 border border-[var(--rule)] p-3">
          <legend className="px-1 text-sm">{t("productionResources")}</legend>
          <label className="grid gap-1 text-sm">
            <span>{t("productionNotes")}</span>
            <textarea
              name="productionNotes"
              rows={2}
              defaultValue={defaultValues?.productionNotes ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>{t("productionPa")}</span>
              <input
                name="productionPa"
                defaultValue={defaultValues?.productionPa ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("productionMixer")}</span>
              <input
                name="productionMixer"
                defaultValue={defaultValues?.productionMixer ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("productionMics")}</span>
              <input
                name="productionMics"
                defaultValue={defaultValues?.productionMics ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("productionLighting")}</span>
              <input
                name="productionLighting"
                defaultValue={defaultValues?.productionLighting ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("productionBackline")}</span>
              <input
                name="productionBackline"
                defaultValue={defaultValues?.productionBackline ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("productionPower")}</span>
              <input
                name="productionPower"
                defaultValue={defaultValues?.productionPower ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("productionStage")}</span>
              <input
                name="productionStage"
                defaultValue={defaultValues?.productionStage ?? ""}
                className="border border-[var(--line)] bg-transparent px-3 py-2"
              />
            </label>
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm">
          <span>{t("houseRules")}</span>
          <textarea
            name="houseRules"
            rows={2}
            defaultValue={defaultValues?.houseRules ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("loadInNotes")}</span>
          <textarea
            name="loadInNotes"
            rows={2}
            defaultValue={defaultValues?.loadInNotes ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("accessibilityNotes")}</span>
          <textarea
            name="accessibilityNotes"
            rows={2}
            defaultValue={defaultValues?.accessibilityNotes ?? ""}
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
        <fieldset className="grid gap-2 border border-[var(--rule)] p-3">
          <legend className="px-1 text-sm">{t("socialLinks")}</legend>
          <label className="grid gap-1 text-sm">
            <span>{t("socialInstagram")}</span>
            <input
              name="socialInstagram"
              type="url"
              defaultValue={social.instagram ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("socialFacebook")}</span>
            <input
              name="socialFacebook"
              type="url"
              defaultValue={social.facebook ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("socialTiktok")}</span>
            <input
              name="socialTiktok"
              type="url"
              defaultValue={social.tiktok ?? ""}
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
        </fieldset>
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
