"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  submitEntertainerProfile,
  upsertEntertainerProfile,
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
    genres?: string | null;
    performanceFormats?: string | null;
    languages?: string | null;
    accessibilityNotes?: string | null;
    equipmentSupplied?: string | null;
    websiteUrl?: string | null;
    socialLinks?: SocialLinks;
  };
  publicationState?: string;
  defaultContactEmail: string;
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

export function EntertainerProfileForm({
  locale,
  defaultValues,
  publicationState,
  defaultContactEmail,
}: Props) {
  const t = useTranslations("profile");
  const errors = useTranslations("errors");
  const status = useTranslations("publication");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const social = defaultValues?.socialLinks ?? {};

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
      genres: String(form.get("genres") ?? ""),
      performanceFormats: String(form.get("performanceFormats") ?? ""),
      languages: String(form.get("languages") ?? ""),
      accessibilityNotes: String(form.get("accessibilityNotes") ?? ""),
      equipmentSupplied: String(form.get("equipmentSupplied") ?? ""),
      websiteUrl: String(form.get("websiteUrl") ?? ""),
      socialLinks: readSocialLinks(form),
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
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("category")}</span>
          <input
            name="category"
            required
            defaultValue={defaultValues?.category}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("genres")}</span>
          <input
            name="genres"
            defaultValue={defaultValues?.genres ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("description")}</span>
          <textarea
            name="description"
            required
            rows={4}
            defaultValue={defaultValues?.description}
            className="field"
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
              className="field"
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
              className="field"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>{t("performanceFormats")}</span>
          <input
            name="performanceFormats"
            defaultValue={defaultValues?.performanceFormats ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("berlinBase")}</span>
          <input
            name="berlinBase"
            required
            defaultValue={defaultValues?.berlinBase}
            className="field"
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
            className="field"
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
              className="field"
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
              className="field"
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
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("languages")}</span>
          <input
            name="languages"
            defaultValue={defaultValues?.languages ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("accessibilityNotes")}</span>
          <textarea
            name="accessibilityNotes"
            rows={2}
            defaultValue={defaultValues?.accessibilityNotes ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("equipmentSupplied")}</span>
          <textarea
            name="equipmentSupplied"
            rows={2}
            defaultValue={defaultValues?.equipmentSupplied ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("websiteUrl")}</span>
          <input
            name="websiteUrl"
            type="url"
            defaultValue={defaultValues?.websiteUrl ?? ""}
            className="field"
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
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("socialFacebook")}</span>
            <input
              name="socialFacebook"
              type="url"
              defaultValue={social.facebook ?? ""}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("socialTiktok")}</span>
            <input
              name="socialTiktok"
              type="url"
              defaultValue={social.tiktok ?? ""}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("socialSpotify")}</span>
            <input
              name="socialSpotify"
              type="url"
              defaultValue={social.spotify ?? ""}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("socialSoundcloud")}</span>
            <input
              name="socialSoundcloud"
              type="url"
              defaultValue={social.soundcloud ?? ""}
              className="field"
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
            className="field"
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
          {t("saveDraft")}
        </Button>
      </form>

      {defaultValues ? (
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
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
        </Button>
      ) : null}
    </div>
  );
}
