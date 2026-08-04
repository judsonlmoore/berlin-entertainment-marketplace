"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createVenue,
  submitVenueProfile,
  updateVenue,
} from "@/src/actions/profiles";
import { Button } from "@/src/components/ui/button";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { CategorySubcategorySelect } from "@/src/components/profile/category-subcategory-select";
import { PrefixedUrlInput } from "@/src/components/profile/prefixed-url-input";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import { StatusLabel } from "@/src/components/ui/status-label";
import { useRouter } from "@/src/i18n/navigation";
import { encodeVenueType, parseVenueType } from "@/src/domain/profile-taxonomy";
import {
  VENUE_SOCIAL_ORDER,
  type SocialPlatform,
} from "@/src/domain/social-urls";

type SocialLinks = Partial<
  Record<
    | "instagram"
    | "facebook"
    | "tiktok"
    | "spotify"
    | "soundcloud"
    | "linkedin"
    | "youtube",
    string
  >
>;

type Props = {
  locale: "en" | "de";
  venueId?: string;
  publicationState?: string;
  defaultContactEmail: string;
  defaultContactPhone?: string;
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
    linkedin: String(form.get("socialLinkedin") ?? ""),
    youtube: String(form.get("socialYoutube") ?? ""),
  };
}

export function VenueProfileForm({
  locale,
  venueId: initialVenueId,
  publicationState,
  defaultContactEmail,
  defaultContactPhone = "",
  defaultValues,
}: Props) {
  const t = useTranslations("profile");
  const errors = useTranslations("errors");
  const status = useTranslations("publication");
  const ui = useTranslations("ui");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [venueId, setVenueId] = useState(initialVenueId);
  const [displayName, setDisplayName] = useState(defaultValues?.name ?? "");
  const venueIdRef = useRef(venueId);
  const social = defaultValues?.socialLinks ?? {};
  const parsedType = parseVenueType(defaultValues?.venueType);

  useEffect(() => {
    venueIdRef.current = venueId;
  }, [venueId]);

  function readForm(form: FormData) {
    const website = String(form.get("websiteUrl") ?? "").trim();
    const addressLine2 = String(form.get("addressLine2") ?? "").trim();
    const capacityContext = String(form.get("capacityContext") ?? "").trim();
    const productionNotes = String(form.get("productionNotes") ?? "").trim();
    const latitude = String(form.get("latitude") ?? "").trim();
    const longitude = String(form.get("longitude") ?? "").trim();
    const categoryId = String(form.get("venueCategory") ?? "");
    const subcategory = String(form.get("venueSubcategory") ?? "");

    return {
      name: String(form.get("name") ?? ""),
      shortDescription: String(form.get("shortDescription") ?? ""),
      addressLine1: String(form.get("addressLine1") ?? ""),
      ...(addressLine2 ? { addressLine2 } : {}),
      district: String(form.get("district") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      ...(latitude ? { latitude } : {}),
      ...(longitude ? { longitude } : {}),
      venueType: encodeVenueType(categoryId, subcategory),
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
      contactPhone: String(form.get("contactPhone") ?? ""),
      locale,
    };
  }

  const autosave = useProfileAutosave({
    formRef,
    readPayload: (form) => {
      const payload = readForm(form);
      if (!payload.name.trim() || !payload.contactEmail.trim()) return null;
      return payload;
    },
    save: async (payload) => {
      const currentId = venueIdRef.current;
      if (currentId) {
        return updateVenue(currentId, payload);
      }
      const result = await createVenue(payload);
      if (result.ok && result.id) {
        setVenueId(result.id);
        venueIdRef.current = result.id;
      }
      return result;
    },
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {publicationState ? (
          <div className="flex flex-wrap items-center gap-3">
            <StatusLabel>{status(publicationState as "draft")}</StatusLabel>
            <p className="text-sm text-[var(--text-muted)]">
              {t("publicationLabel")}
            </p>
          </div>
        ) : (
          <span />
        )}
        <AutosaveStatus
          phase={autosave.phase}
          errorMessage={autosave.errorMessage}
        />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-5 py-4">
        <p className="eyebrow text-[var(--accent)]">
          {t("displayNameEyebrow")}
        </p>
        <h2 className="mt-1 text-[clamp(1.5rem,2vw,2rem)] font-semibold text-[var(--ink)]">
          {displayName.trim() || t("previewVenueFallback")}
        </h2>
      </div>

      <form ref={formRef} className="panel grid gap-6 p-6">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("venueName")}</span>
          <input
            name="name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("shortDescription")}</span>
          <textarea
            name="shortDescription"
            rows={3}
            defaultValue={defaultValues?.shortDescription}
            className="field"
          />
        </label>

        <CategorySubcategorySelect
          kind="venue"
          categoryName="venueCategory"
          subcategoryName="venueSubcategory"
          otherName="venueSubcategoryOther"
          defaultCategory={parsedType.categoryId}
          defaultSubcategoryRaw={parsedType.subcategoryRaw}
          categoryLabel={t("venueType")}
          subcategoryLabel={t("subcategory")}
          otherLabel={t("subcategoryOther")}
        />

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("addressLine1")}</span>
          <input
            name="addressLine1"
            defaultValue={defaultValues?.addressLine1}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("addressLine2")}</span>
          <input
            name="addressLine2"
            defaultValue={defaultValues?.addressLine2 ?? ""}
            className="field"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("district")}</span>
            <input
              name="district"
              defaultValue={defaultValues?.district}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("postalCode")}</span>
            <input
              name="postalCode"
              defaultValue={defaultValues?.postalCode}
              className="field"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("latitude")}</span>
            <input
              name="latitude"
              defaultValue={defaultValues?.latitude ?? ""}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("longitude")}</span>
            <input
              name="longitude"
              defaultValue={defaultValues?.longitude ?? ""}
              className="field"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("audienceDescription")}</span>
          <textarea
            name="audienceDescription"
            rows={3}
            defaultValue={defaultValues?.audienceDescription}
            className="field"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("capacity")}</span>
            <input
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={defaultValues?.capacity ?? 50}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("capacityContext")}</span>
            <input
              name="capacityContext"
              defaultValue={defaultValues?.capacityContext ?? ""}
              className="field"
            />
          </label>
        </div>
        <fieldset className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--rule)] p-4">
          <legend className="px-1 text-sm font-medium">
            {t("productionResources")}
          </legend>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("productionNotes")}</span>
            <textarea
              name="productionNotes"
              rows={2}
              defaultValue={defaultValues?.productionNotes ?? ""}
              className="field"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["productionPa", "productionPa"],
                ["productionMixer", "productionMixer"],
                ["productionMics", "productionMics"],
                ["productionLighting", "productionLighting"],
                ["productionBackline", "productionBackline"],
                ["productionPower", "productionPower"],
                ["productionStage", "productionStage"],
              ] as const
            ).map(([name, labelKey]) => (
              <label key={name} className="grid gap-1 text-sm">
                <span className="font-medium">{t(labelKey)}</span>
                <input
                  name={name}
                  defaultValue={defaultValues?.[name] ?? ""}
                  className="field"
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("houseRules")}</span>
          <textarea
            name="houseRules"
            rows={2}
            defaultValue={defaultValues?.houseRules ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("loadInNotes")}</span>
          <textarea
            name="loadInNotes"
            rows={2}
            defaultValue={defaultValues?.loadInNotes ?? ""}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("accessibilityNotes")}</span>
          <textarea
            name="accessibilityNotes"
            rows={2}
            defaultValue={defaultValues?.accessibilityNotes ?? ""}
            className="field"
          />
        </label>

        <PrefixedUrlInput
          platform="website"
          name="websiteUrl"
          label={t("websiteUrl")}
          defaultValue={defaultValues?.websiteUrl}
        />
        <div className="grid gap-3">
          {VENUE_SOCIAL_ORDER.map((platform: SocialPlatform) => (
            <PrefixedUrlInput
              key={platform}
              platform={platform}
              name={
                platform === "instagram"
                  ? "socialInstagram"
                  : platform === "facebook"
                    ? "socialFacebook"
                    : platform === "tiktok"
                      ? "socialTiktok"
                      : platform === "linkedin"
                        ? "socialLinkedin"
                        : "socialYoutube"
              }
              label={t(
                platform === "instagram"
                  ? "socialInstagram"
                  : platform === "facebook"
                    ? "socialFacebook"
                    : platform === "tiktok"
                      ? "socialTiktok"
                      : platform === "linkedin"
                        ? "socialLinkedin"
                        : "socialYoutube",
              )}
              defaultValue={social[platform as keyof SocialLinks]}
            />
          ))}
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("contactEmail")}</span>
          <input
            name="contactEmail"
            type="email"
            required
            defaultValue={defaultContactEmail}
            className="field"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("contactPhone")}</span>
          <input
            name="contactPhone"
            type="tel"
            defaultValue={defaultContactPhone}
            className="field"
            placeholder="+49 …"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p aria-live="polite" className="text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--rule)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">{t("autosaveHint")}</p>
          {venueId ? (
            <Button
              type="button"
              pending={pending}
              pendingLabel={ui("working")}
              variant="primary"
              className="ml-auto"
              onClick={() => {
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  await autosave.saveNow();
                  const result = await submitVenueProfile(venueId, locale);
                  if (!result.ok) {
                    setError(
                      result.code === "invalid_transition"
                        ? errors("invalid_transition")
                        : result.code === "validation"
                          ? errors("validation")
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
      </form>
    </div>
  );
}
