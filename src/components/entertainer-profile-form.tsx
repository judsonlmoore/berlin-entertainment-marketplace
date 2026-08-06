"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  submitEntertainerProfile,
  upsertEntertainerProfile,
} from "@/src/actions/profiles";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { CategorySubcategorySelect } from "@/src/components/profile/category-subcategory-select";
import { LanguageMultiSelect } from "@/src/components/profile/language-multi-select";
import { LocationAutocomplete } from "@/src/components/profile/location-autocomplete";
import { PrefixedUrlInput } from "@/src/components/profile/prefixed-url-input";
import { PublicationStatusTag } from "@/src/components/profile/publication-status-tag";
import {
  CharacterCountedTextarea,
  RichTextField,
} from "@/src/components/profile/rich-text-field";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import {
  ENTERTAINER_SOCIAL_ORDER,
  type SocialPlatform,
} from "@/src/domain/social-urls";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TECHNICAL_MAX,
  TECHNICAL_MIN,
} from "@/src/domain/sanitize-input";
import { useRouter } from "@/src/i18n/navigation";

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
  mediaSlot?: ReactNode;
  defaultValues?: {
    actName: string;
    category: string;
    description: string;
    groupSize: number;
    berlinBase: string;
    baseLatitude?: string | null;
    baseLongitude?: string | null;
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
  /** Account email used for contact upsert — not shown on this form. */
  accountEmail: string;
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-[var(--rule)] pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold tracking-[0.12em] text-[var(--ink)] uppercase">
          {title}
        </h3>
        {hint ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function toEditorHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}

function socialFieldName(platform: SocialPlatform): string {
  switch (platform) {
    case "instagram":
      return "socialInstagram";
    case "facebook":
      return "socialFacebook";
    case "tiktok":
      return "socialTiktok";
    case "spotify":
      return "socialSpotify";
    case "soundcloud":
      return "socialSoundcloud";
    case "linkedin":
      return "socialLinkedin";
    case "youtube":
      return "socialYoutube";
    default:
      return "websiteUrl";
  }
}

function socialLabelKey(platform: SocialPlatform) {
  switch (platform) {
    case "instagram":
      return "socialInstagram" as const;
    case "facebook":
      return "socialFacebook" as const;
    case "tiktok":
      return "socialTiktok" as const;
    case "spotify":
      return "socialSpotify" as const;
    case "soundcloud":
      return "socialSoundcloud" as const;
    case "linkedin":
      return "socialLinkedin" as const;
    case "youtube":
      return "socialYoutube" as const;
    default:
      return "websiteUrl" as const;
  }
}

function canOwnerPublish(state: string | undefined): boolean {
  return !state || state === "draft" || state === "changes_requested";
}

export function EntertainerProfileForm({
  locale,
  mediaSlot,
  defaultValues,
  publicationState,
  accountEmail,
}: Props) {
  const t = useTranslations("profile");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [actName, setActName] = useState(defaultValues?.actName ?? "");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, startPublish] = useTransition();
  const social = defaultValues?.socialLinks ?? {};
  const pubState = publicationState ?? "draft";

  function readForm(form: FormData) {
    return {
      actName: String(form.get("actName") ?? ""),
      category: String(form.get("category") ?? ""),
      description: String(form.get("description") ?? ""),
      groupSize: Number(form.get("groupSize") ?? 1),
      berlinBase: String(form.get("berlinBase") ?? ""),
      baseLatitude: String(form.get("baseLatitude") ?? ""),
      baseLongitude: String(form.get("baseLongitude") ?? ""),
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
      socialLinks: {
        instagram: String(form.get("socialInstagram") ?? ""),
        facebook: String(form.get("socialFacebook") ?? ""),
        tiktok: String(form.get("socialTiktok") ?? ""),
        spotify: String(form.get("socialSpotify") ?? ""),
        soundcloud: String(form.get("socialSoundcloud") ?? ""),
        linkedin: String(form.get("socialLinkedin") ?? ""),
        youtube: String(form.get("socialYoutube") ?? ""),
      },
      contactEmail: accountEmail,
      contactPhone: "",
      locale,
    };
  }

  const autosave = useProfileAutosave({
    formRef,
    readPayload: (form) => {
      const payload = readForm(form);
      if (!payload.actName.trim() || !payload.contactEmail.trim()) return null;
      return payload;
    },
    save: async (payload) => {
      const result = await upsertEntertainerProfile(payload);
      if (
        result.ok &&
        (pubState === "approved" || pubState === "submitted")
      ) {
        router.refresh();
      }
      return result;
    },
  });

  function publishProfile() {
    setPublishError(null);
    startPublish(async () => {
      // Flush pending edits so submit validates the latest draft.
      await autosave.saveNow();
      const result = await submitEntertainerProfile(locale);
      if (!result.ok) {
        setPublishError(result.message || t("publishProfileFailed"));
        return;
      }
      router.refresh();
    });
  }

  const showPublish = canOwnerPublish(pubState);

  return (
    <div className="grid gap-5">
      <div className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <p className="eyebrow text-[var(--accent)]">
              {t("displayNameEyebrow")}
            </p>
            <h2 className="page-title mt-1 text-[clamp(1.5rem,2vw,2rem)]">
              {actName.trim() || t("previewNameFallback")}
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <AutosaveStatus
              phase={autosave.phase}
              errorMessage={autosave.errorMessage}
            />
            {showPublish ? (
              <button
                type="button"
                disabled={isPublishing || autosave.phase === "saving"}
                onClick={publishProfile}
                className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
              >
                {isPublishing ? t("publishingProfile") : t("publishProfile")}
              </button>
            ) : (
              <PublicationStatusTag
                state={pubState}
                draftLabel={t("statusDraft")}
                underReviewLabel={t("statusUnderReview")}
                verifiedLabel={t("statusVerified")}
              />
            )}
          </div>
        </div>
        {publishError ? (
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
            {publishError}
          </p>
        ) : showPublish ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {t("publishProfileHint")}
          </p>
        ) : null}
      </div>

      <form ref={formRef} className="panel grid gap-6 p-6">
        {mediaSlot ? (
          <Section title={t("sectionMedia")}>{mediaSlot}</Section>
        ) : (
          <Section title={t("sectionMedia")}>
            <p className="text-sm text-[var(--text-muted)]">
              {t("portfolioNeedProfile")}
            </p>
          </Section>
        )}

        <Section title={t("sectionBasics")}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("actName")}</span>
            <input
              name="actName"
              required
              className="field"
              value={actName}
              onChange={(event) => setActName(event.target.value)}
            />
          </label>

          <CategorySubcategorySelect
            kind="entertainer"
            categoryName="category"
            subcategoryName="genres"
            otherName="subcategoryOther"
            defaultCategory={defaultValues?.category}
            defaultSubcategoryRaw={defaultValues?.genres}
            categoryLabel={t("category")}
            subcategoryLabel={t("subcategory")}
            otherLabel={t("subcategoryOther")}
          />

          <RichTextField
            name="description"
            label={t("description")}
            defaultValue={toEditorHtml(defaultValues?.description ?? "")}
            min={DESCRIPTION_MIN}
            max={DESCRIPTION_MAX}
            placeholder={t("descriptionPlaceholder")}
          />
        </Section>

        <Section title={t("sectionDetails")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("groupSize")}</span>
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
              <span className="font-medium">{t("durationMinutes")}</span>
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
            <span className="font-medium">{t("performanceFormats")}</span>
            <input
              name="performanceFormats"
              defaultValue={defaultValues?.performanceFormats ?? ""}
              className="field"
            />
          </label>

          <LocationAutocomplete
            label={t("baseLocation")}
            hint={t("baseLocationHint")}
            nameLabel="berlinBase"
            nameLatitude="baseLatitude"
            nameLongitude="baseLongitude"
            defaultLabel={defaultValues?.berlinBase ?? ""}
            defaultLatitude={defaultValues?.baseLatitude ?? ""}
            defaultLongitude={defaultValues?.baseLongitude ?? ""}
          />

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("travelRadiusKm")}</span>
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
              <span className="font-medium">{t("priceMinEur")}</span>
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
              <span className="font-medium">{t("priceMaxEur")}</span>
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

          <CharacterCountedTextarea
            name="technicalRequirements"
            label={t("technicalRequirements")}
            defaultValue={defaultValues?.technicalRequirements ?? ""}
            min={TECHNICAL_MIN}
            max={TECHNICAL_MAX}
            rows={4}
          />

          <LanguageMultiSelect
            name="languages"
            defaultValue={defaultValues?.languages}
            label={t("languages")}
            hint={t("languagesHint")}
          />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("accessibilityNotes")}</span>
            <textarea
              name="accessibilityNotes"
              rows={2}
              defaultValue={defaultValues?.accessibilityNotes ?? ""}
              className="field"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("equipmentSupplied")}</span>
            <textarea
              name="equipmentSupplied"
              rows={2}
              defaultValue={defaultValues?.equipmentSupplied ?? ""}
              className="field"
            />
          </label>
        </Section>

        <Section title={t("sectionLinks")} hint={t("linksHint")}>
          <PrefixedUrlInput
            platform="website"
            name="websiteUrl"
            label={t("websiteUrl")}
            defaultValue={defaultValues?.websiteUrl}
          />
          <div className="grid gap-3">
            {ENTERTAINER_SOCIAL_ORDER.map((platform) => (
              <PrefixedUrlInput
                key={platform}
                platform={platform}
                name={socialFieldName(platform)}
                label={t(socialLabelKey(platform))}
                defaultValue={social[platform as keyof SocialLinks]}
              />
            ))}
          </div>
        </Section>
      </form>
    </div>
  );
}
