"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  publishEntertainerProfile,
  unpublishEntertainerProfile,
  upsertEntertainerProfile,
} from "@/src/actions/profiles";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { CategorySubcategorySelect } from "@/src/components/profile/category-subcategory-select";
import { LanguageMultiSelect } from "@/src/components/profile/language-multi-select";
import { LocationAutocomplete } from "@/src/components/profile/location-autocomplete";
import { PrefixedUrlInput } from "@/src/components/profile/prefixed-url-input";
import { PublicationControl } from "@/src/components/profile/publication-control";
import { ProfilePreviewButton } from "@/src/components/profile/profile-preview-button";
import {
  ParagraphTextField,
  toParagraphEditorHtml,
} from "@/src/components/profile/paragraph-text-field";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import { LegalIdentityForm } from "@/src/components/legal-identity-form";
import {
  canOwnerPublishProfile,
  canOwnerUnpublishProfile,
  isProfilePublished,
  type ProfilePublicationState,
} from "@/src/domain/profile-publication";
import type { LegalIdentityFields } from "@/src/domain/legal-identity";
import {
  ENTERTAINER_SOCIAL_ORDER,
  type SocialPlatform,
} from "@/src/domain/social-urls";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  NOTES_MAX,
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
  /** Existing profile id — enables marketplace preview. */
  profileId?: string;
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
  legalIdentity?: LegalIdentityFields | null;
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
    <section className="panel grid gap-4 p-6">
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
  return canOwnerPublishProfile((state ?? "draft") as ProfilePublicationState);
}

export function EntertainerProfileForm({
  locale,
  profileId,
  mediaSlot,
  defaultValues,
  publicationState,
  accountEmail,
  legalIdentity = null,
}: Props) {
  const t = useTranslations("profile");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [actName, setActName] = useState(defaultValues?.actName ?? "");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [isPublishing, startPublish] = useTransition();
  const social = defaultValues?.socialLinks ?? {};
  const pubState = (publicationState ?? "draft") as ProfilePublicationState;
  const published = isProfilePublished(pubState);
  const showPublish = canOwnerPublish(pubState);
  const showUnpublish = canOwnerUnpublishProfile(pubState);

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
    save: (payload) => upsertEntertainerProfile(payload),
  });

  function focusPublishField(field: string | undefined) {
    if (!field || typeof document === "undefined") return;
    requestAnimationFrame(() => {
      const target =
        document.getElementById(`field-${field}`) ??
        document.querySelector<HTMLElement>(`[data-field="${field}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = target?.matches("input,select,textarea")
        ? target
        : target?.querySelector<HTMLElement>("input,select,textarea");
      focusable?.focus?.();
    });
  }

  function publishProfile() {
    setPublishError(null);
    setLegalError(null);
    startPublish(async () => {
      const saved = await autosave.saveNow();
      if (!saved?.ok) {
        setPublishError(saved?.message || t("publishProfileFailed"));
        return;
      }
      const result = await publishEntertainerProfile(locale);
      if (!result.ok) {
        setPublishError(result.message || t("publishProfileFailed"));
        const legalMessage = result.fields?.legalIdentity ?? null;
        setLegalError(legalMessage);
        if (result.field === "legalIdentity" || legalMessage) {
          focusPublishField("legalIdentity");
        }
        return;
      }
      router.refresh();
    });
  }

  function unpublishProfile() {
    setPublishError(null);
    setLegalError(null);
    startPublish(async () => {
      const result = await unpublishEntertainerProfile(locale);
      if (!result.ok) {
        setPublishError(result.message || t("unpublishProfileFailed"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <div className="sticky top-14 z-10 bg-[var(--canvas)] py-3 lg:top-0">
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
              {profileId ? (
                <ProfilePreviewButton
                  href={`/marketplace/entertainers/${profileId}?preview=1`}
                  onBeforeNavigate={() => autosave.saveNow()}
                  disabled={autosave.phase === "saving"}
                />
              ) : null}
              <PublicationControl
                state={pubState}
                unpublishedLabel={t("statusUnpublished")}
                suspendedLabel={t("statusSuspended")}
                publishLabel={t("publishProfile")}
                publishingLabel={t("publishingProfile")}
                unpublishLabel={t("unpublishProfile")}
                unpublishingLabel={t("unpublishingProfile")}
                canPublish={showPublish}
                canUnpublish={showUnpublish}
                pending={isPublishing}
                disabled={autosave.phase === "saving"}
                onPublish={publishProfile}
                onUnpublish={unpublishProfile}
              />
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
          ) : published ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t("publishedProfileHint")}
            </p>
          ) : null}
        </div>
      </div>

      <form ref={formRef} className="grid gap-5">
        <Section title={t("displayNameEyebrow")}>
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
        </Section>

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

          <ParagraphTextField
            name="description"
            label={t("description")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.description ?? "",
            )}
            min={DESCRIPTION_MIN}
            max={DESCRIPTION_MAX}
            placeholder={t("descriptionPlaceholder")}
            size="tall"
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
          <div className="grid gap-2">
            <span className="text-sm font-medium text-[var(--ink)]">
              {t("feeRange")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-sm font-medium text-[var(--text-muted)]"
                aria-hidden
              >
                €
              </span>
              <label className="sr-only" htmlFor="profile-fee-min">
                {t("priceMinEur")}
              </label>
              <input
                id="profile-fee-min"
                name="priceMinEur"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                placeholder={t("priceFromPlaceholder")}
                defaultValue={
                  defaultValues && defaultValues.priceMinCents > 0
                    ? Math.round(defaultValues.priceMinCents / 100)
                    : undefined
                }
                className="field w-[7.5rem] shrink-0"
              />
              <span className="text-sm text-[var(--text-muted)]" aria-hidden>
                –
              </span>
              <label className="sr-only" htmlFor="profile-fee-max">
                {t("priceMaxEur")}
              </label>
              <input
                id="profile-fee-max"
                name="priceMaxEur"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                placeholder={t("priceToPlaceholder")}
                defaultValue={
                  defaultValues && defaultValues.priceMaxCents > 0
                    ? Math.round(defaultValues.priceMaxCents / 100)
                    : undefined
                }
                className="field w-[7.5rem] shrink-0"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t("feeRangeHint")}</p>
          </div>

          <LanguageMultiSelect
            name="languages"
            defaultValue={defaultValues?.languages}
            label={t("languages")}
            hint={t("languagesHint")}
          />

          <ParagraphTextField
            name="technicalRequirements"
            label={t("technicalRequirements")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.technicalRequirements ?? "",
            )}
            min={TECHNICAL_MIN}
            max={TECHNICAL_MAX}
            size="medium"
          />

          <ParagraphTextField
            name="equipmentSupplied"
            label={t("equipmentSupplied")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.equipmentSupplied ?? "",
            )}
            min={0}
            max={NOTES_MAX}
            size="short"
          />

          <ParagraphTextField
            name="accessibilityNotes"
            label={t("accessibilityNotes")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.accessibilityNotes ?? "",
            )}
            min={0}
            max={NOTES_MAX}
            size="short"
          />
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

      <LegalIdentityForm
        locale={locale}
        initial={legalIdentity}
        error={legalError}
      />
    </div>
  );
}
