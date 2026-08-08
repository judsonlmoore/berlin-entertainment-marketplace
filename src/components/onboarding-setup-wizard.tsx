"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  createVenue,
  publishEntertainerProfile,
  publishVenueProfile,
  updateVenue as updateVenueProfile,
  upsertEntertainerProfile,
} from "@/src/actions/profiles";
import { LegalIdentityForm } from "@/src/components/legal-identity-form";
import { CategorySubcategorySelect } from "@/src/components/profile/category-subcategory-select";
import { LocationAutocomplete } from "@/src/components/profile/location-autocomplete";
import {
  ParagraphTextField,
  toParagraphEditorHtml,
} from "@/src/components/profile/paragraph-text-field";
import { PrefixedUrlInput } from "@/src/components/profile/prefixed-url-input";
import { VenuePlacesSearch } from "@/src/components/profile/venue-places-search";
import { Button } from "@/src/components/ui/button";
import { WizardHeroUpload } from "@/src/components/wizard-hero-upload";
import { checkEntertainerPublishReadiness } from "@/src/domain/entertainer-publish-readiness";
import { isLegalIdentityComplete } from "@/src/domain/legal-identity";
import type { LegalIdentityFields } from "@/src/domain/legal-identity";
import {
  wizardChapters,
  wizardStepsForRole,
  type WizardStepDef,
} from "@/src/domain/onboarding-wizard-steps";
import {
  encodeSubcategory,
  encodeVenueType,
  getCategoryNode,
  parseSubcategory,
  parseVenueType,
  VENUE_CATEGORIES,
} from "@/src/domain/profile-taxonomy";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  NOTES_MAX,
  SHORT_DESCRIPTION_MAX,
  TECHNICAL_MAX,
  validateRichTextField,
} from "@/src/domain/sanitize-input";
import { checkVenuePublishReadiness } from "@/src/domain/venue-publish-readiness";
import { Link, useRouter } from "@/src/i18n/navigation";
import type { PlacesPrefill } from "@/src/integrations/google-places";
import {
  clearWizardSessionCookieHeader,
  wizardSessionCookieHeader,
} from "@/src/lib/onboarding-wizard-session";

type Role = "entertainer" | "venue";

export type EntertainerDraft = {
  profileId: string | null;
  actName: string;
  category: string;
  genres: string;
  description: string;
  berlinBase: string;
  baseLatitude: string;
  baseLongitude: string;
  travelRadiusKm: number;
  priceMinCents: number;
  priceMaxCents: number;
  websiteUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  technicalRequirements: string;
  imageCount: number;
  heroImageId: string | null;
  hasExternalOrVideoLink: boolean;
};

export type VenueDraft = {
  venueId: string | null;
  name: string;
  venueType: string;
  shortDescription: string;
  googlePlaceId: string;
  addressLine1: string;
  addressLine2: string;
  district: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  websiteUrl: string;
  audienceDescription: string;
  capacity: number;
  capacityContext: string;
  productionNotes: string;
  imageCount: number;
  heroImageId: string | null;
};

type Props = {
  locale: "en" | "de";
  role: Role;
  accountEmail: string;
  entertainerDraft: EntertainerDraft;
  venueDraft: VenueDraft;
  legalIdentity: LegalIdentityFields | null;
  /** First incomplete step index for resume within the same wizard session. */
  initialStepIndex?: number;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function stepCopyId(role: Role, step: WizardStepDef): string {
  if (role === "venue" && step.id === "description") return "venue_description";
  return step.id;
}

function activateWizardCookie() {
  document.cookie = wizardSessionCookieHeader();
}

function clearWizardCookie() {
  document.cookie = clearWizardSessionCookieHeader();
}

export function OnboardingSetupWizard({
  locale,
  role,
  accountEmail,
  entertainerDraft,
  venueDraft,
  legalIdentity,
  initialStepIndex = 0,
}: Props) {
  const t = useTranslations("onboardingFlow");
  const tProfile = useTranslations("profile");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const steps = useMemo(() => wizardStepsForRole(role), [role]);
  const chapters = useMemo(() => wizardChapters(steps), [steps]);
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(Math.max(initialStepIndex, 0), steps.length - 1),
  );
  const [entertainer, setEntertainer] =
    useState<EntertainerDraft>(entertainerDraft);
  const [venue, setVenue] = useState<VenueDraft>(venueDraft);
  const [legalComplete, setLegalComplete] = useState(
    isLegalIdentityComplete(legalIdentity),
  );
  const [venueTypeKey, setVenueTypeKey] = useState(0);
  const [shortDescriptionKey, setShortDescriptionKey] = useState(0);
  const [addressConfirmOpen, setAddressConfirmOpen] = useState(
    Boolean(venueDraft.addressLine1),
  );

  const step = steps[stepIndex]!;
  const chapterRoleKey = role === "entertainer" ? "entertainer" : "venue";

  useEffect(() => {
    activateWizardCookie();
  }, []);

  const updateEntertainer = (patch: Partial<EntertainerDraft>) => {
    setEntertainer((prev) => ({ ...prev, ...patch }));
  };
  const patchVenue = (patch: Partial<VenueDraft>) => {
    setVenue((prev) => ({ ...prev, ...patch }));
  };

  const applyVenuePlacePrefill = (prefill: PlacesPrefill) => {
    const nextName = prefill.name.trim() || venue.name;
    let nextVenueType = venue.venueType;
    if (
      prefill.venueTypeHint &&
      getCategoryNode(VENUE_CATEGORIES, prefill.venueTypeHint)
    ) {
      const node = getCategoryNode(VENUE_CATEGORIES, prefill.venueTypeHint);
      const firstSub = node?.children[0]?.id ?? "";
      nextVenueType = encodeVenueType(
        prefill.venueTypeHint,
        encodeSubcategory(firstSub, ""),
      );
      setVenueTypeKey((key) => key + 1);
    }
    const nextShortDescription =
      venue.shortDescription.trim().length > 0
        ? venue.shortDescription
        : nextName
          ? `<p>${nextName}</p>`
          : venue.shortDescription;
    if (nextShortDescription !== venue.shortDescription) {
      setShortDescriptionKey((key) => key + 1);
    }
    patchVenue({
      name: nextName,
      venueType: nextVenueType,
      shortDescription: nextShortDescription,
      googlePlaceId: prefill.googlePlaceId,
      addressLine1: prefill.addressLine1,
      addressLine2: prefill.addressLine2 ?? "",
      district: prefill.district,
      postalCode: prefill.postalCode,
      latitude: prefill.latitude,
      longitude: prefill.longitude,
      websiteUrl: prefill.websiteUrl || venue.websiteUrl,
    });
    setAddressConfirmOpen(true);
  };

  function mapActionError(result: {
    ok: false;
    code: string;
    message: string;
  }): string {
    return result.code === "validation" ||
      result.code === "unauthorized" ||
      result.code === "forbidden"
      ? errors(result.code as "validation" | "unauthorized" | "forbidden")
      : result.message;
  }

  async function persistEntertainer(
    patch: Partial<EntertainerDraft> = {},
  ): Promise<boolean> {
    const next = { ...entertainer, ...patch };
    const socialLinks: Record<string, string> = {};
    if (next.instagramUrl.trim())
      socialLinks.instagram = next.instagramUrl.trim();
    if (next.youtubeUrl.trim()) socialLinks.youtube = next.youtubeUrl.trim();

    const saved = await upsertEntertainerProfile({
      actName: next.actName.trim() || "Untitled act",
      category: next.category,
      genres: next.genres,
      description: next.description,
      groupSize: 1,
      berlinBase: next.berlinBase,
      baseLatitude: next.baseLatitude,
      baseLongitude: next.baseLongitude,
      travelRadiusKm: next.travelRadiusKm,
      priceMinCents: next.priceMinCents,
      priceMaxCents: next.priceMaxCents,
      durationMinutes: 60,
      technicalRequirements: next.technicalRequirements,
      websiteUrl: next.websiteUrl,
      socialLinks,
      contactEmail: accountEmail,
      locale,
    });
    if (!saved.ok) {
      setError(mapActionError(saved));
      return false;
    }
    const hasLink = Boolean(
      next.websiteUrl.trim() ||
      next.instagramUrl.trim() ||
      next.youtubeUrl.trim(),
    );
    setEntertainer({
      ...next,
      profileId: saved.id ?? next.profileId,
      hasExternalOrVideoLink: hasLink || next.hasExternalOrVideoLink,
    });
    return true;
  }

  async function persistVenue(
    patch: Partial<VenueDraft> = {},
  ): Promise<boolean> {
    const next = { ...venue, ...patch };
    const payload = {
      name: next.name.trim() || "Untitled venue",
      shortDescription: next.shortDescription,
      venueType: next.venueType,
      addressLine1: next.addressLine1,
      ...(next.addressLine2 ? { addressLine2: next.addressLine2 } : {}),
      district: next.district,
      postalCode: next.postalCode,
      ...(next.latitude ? { latitude: next.latitude } : {}),
      ...(next.longitude ? { longitude: next.longitude } : {}),
      ...(next.googlePlaceId ? { googlePlaceId: next.googlePlaceId } : {}),
      ...(next.websiteUrl ? { websiteUrl: next.websiteUrl } : {}),
      audienceDescription: next.audienceDescription,
      capacity: next.capacity > 0 ? next.capacity : 50,
      capacityContext: next.capacityContext,
      productionNotes: next.productionNotes,
      contactEmail: accountEmail,
      locale,
    };
    const saved = next.venueId
      ? await updateVenueProfile(next.venueId, payload)
      : await createVenue(payload);
    if (!saved.ok) {
      setError(mapActionError(saved));
      return false;
    }
    setVenue({
      ...next,
      venueId: saved.id ?? next.venueId,
    });
    return true;
  }

  function currentStepValid(): boolean {
    if (step.kind === "chapter_intro" || step.kind === "publish") return true;
    if (role === "entertainer") {
      switch (step.id) {
        case "act_name":
          return entertainer.actName.trim().length >= 2;
        case "category": {
          const sub = parseSubcategory(entertainer.genres);
          return (
            entertainer.category.trim().length > 0 &&
            sub.subcategoryId.trim().length > 0
          );
        }
        case "description": {
          const check = validateRichTextField(entertainer.description, {
            min: DESCRIPTION_MIN,
            max: DESCRIPTION_MAX,
          });
          return check.ok;
        }
        case "location":
          return entertainer.berlinBase.trim().length >= 2;
        case "fee":
          return (
            entertainer.priceMaxCents > 0 &&
            entertainer.priceMaxCents >= entertainer.priceMinCents
          );
        case "links":
          return (
            entertainer.websiteUrl.trim().length > 0 ||
            entertainer.instagramUrl.trim().length > 0 ||
            entertainer.youtubeUrl.trim().length > 0
          );
        case "hero_photo":
          return entertainer.imageCount > 0 || Boolean(entertainer.heroImageId);
        default:
          return true;
      }
    }

    switch (step.id) {
      case "venue_name":
        return venue.name.trim().length >= 2;
      case "venue_type": {
        const parsed = parseVenueType(venue.venueType);
        return (
          parsed.categoryId.trim().length > 0 &&
          parsed.subcategoryRaw.trim().length > 0
        );
      }
      case "description": {
        const check = validateRichTextField(venue.shortDescription, {
          min: DESCRIPTION_MIN,
          max: SHORT_DESCRIPTION_MAX,
        });
        return check.ok;
      }
      case "address":
        return (
          venue.addressLine1.trim().length > 0 &&
          venue.district.trim().length > 0 &&
          venue.postalCode.trim().length > 0
        );
      case "capacity": {
        const audience = validateRichTextField(venue.audienceDescription, {
          min: DESCRIPTION_MIN,
          max: NOTES_MAX,
        });
        return venue.capacity >= 1 && audience.ok;
      }
      case "hero_photo":
        return venue.imageCount > 0 || Boolean(venue.heroImageId);
      default:
        return true;
    }
  }

  async function saveCurrentStep(): Promise<boolean> {
    setError(null);
    if (step.kind === "chapter_intro" || step.kind === "legal") {
      return true;
    }
    if (role === "entertainer") {
      if (step.id === "act_name" || step.id === "category") {
        return persistEntertainer();
      }
      if (
        step.id === "description" ||
        step.id === "location" ||
        step.id === "fee" ||
        step.id === "links" ||
        step.id === "notes"
      ) {
        if (!entertainer.profileId && !entertainer.actName.trim()) {
          setError(t("fieldsIncomplete"));
          return false;
        }
        return persistEntertainer();
      }
      return true;
    }

    if (step.id === "venue_name" || step.id === "venue_type") {
      return persistVenue();
    }
    if (
      step.id === "description" ||
      step.id === "address" ||
      step.id === "capacity" ||
      step.id === "notes"
    ) {
      if (!venue.venueId && !venue.name.trim()) {
        setError(t("fieldsIncomplete"));
        return false;
      }
      return persistVenue();
    }
    return true;
  }

  function goNext() {
    startTransition(async () => {
      setError(null);
      if (!currentStepValid()) {
        if (!step.skippable) {
          setError(t("fieldsIncomplete"));
          return;
        }
      } else if (!(await saveCurrentStep())) {
        return;
      }

      if (stepIndex < steps.length - 1) {
        setStepIndex((i) => i + 1);
      }
    });
  }

  function goSkip() {
    if (!step.skippable) return;
    startTransition(async () => {
      // Persist draft name if we somehow skipped past without a row.
      if (role === "entertainer" && !entertainer.profileId) {
        if (entertainer.actName.trim().length < 2) {
          setError(t("fieldsIncomplete"));
          return;
        }
        if (!(await persistEntertainer())) return;
      }
      if (role === "venue" && !venue.venueId) {
        if (venue.name.trim().length < 2) {
          setError(t("fieldsIncomplete"));
          return;
        }
        if (!(await persistVenue())) return;
      }
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      setError(null);
    });
  }

  function saveAndExit() {
    startTransition(async () => {
      if (role === "entertainer") {
        if (entertainer.actName.trim().length >= 2) {
          if (!(await persistEntertainer())) return;
        } else if (!entertainer.profileId) {
          setError(t("fieldsIncomplete"));
          return;
        }
      } else if (venue.name.trim().length >= 2) {
        if (!(await persistVenue())) return;
      } else if (!venue.venueId) {
        setError(t("fieldsIncomplete"));
        return;
      }
      clearWizardCookie();
      router.push("/marketplace");
      router.refresh();
    });
  }

  function exploreMarketplace() {
    clearWizardCookie();
    router.push("/marketplace");
    router.refresh();
  }

  function publishNow() {
    startTransition(async () => {
      setError(null);
      if (role === "entertainer") {
        if (!(await persistEntertainer())) return;
        const result = await publishEntertainerProfile(locale);
        if (!result.ok) {
          setError(mapActionError(result));
          return;
        }
      } else {
        if (!venue.venueId) {
          setError(t("fieldsIncomplete"));
          return;
        }
        if (!(await persistVenue())) return;
        const result = await publishVenueProfile(venue.venueId, locale);
        if (!result.ok) {
          setError(mapActionError(result));
          return;
        }
      }
      clearWizardCookie();
      router.push("/marketplace");
      router.refresh();
    });
  }

  const readiness =
    role === "entertainer"
      ? checkEntertainerPublishReadiness({
          actName: entertainer.actName,
          category: entertainer.category,
          genres: entertainer.genres,
          description: entertainer.description,
          groupSize: 1,
          berlinBase: entertainer.berlinBase,
          travelRadiusKm: entertainer.travelRadiusKm,
          priceMinCents: entertainer.priceMinCents,
          priceMaxCents: entertainer.priceMaxCents,
          websiteUrl: entertainer.websiteUrl,
          socialLinks: {
            ...(entertainer.instagramUrl
              ? { instagram: entertainer.instagramUrl }
              : {}),
            ...(entertainer.youtubeUrl
              ? { youtube: entertainer.youtubeUrl }
              : {}),
          },
          imageCount:
            entertainer.imageCount || (entertainer.heroImageId ? 1 : 0),
          hasExternalOrVideoLink:
            entertainer.hasExternalOrVideoLink ||
            Boolean(
              entertainer.websiteUrl.trim() ||
              entertainer.instagramUrl.trim() ||
              entertainer.youtubeUrl.trim(),
            ),
          legalIdentityComplete: legalComplete,
        })
      : checkVenuePublishReadiness({
          name: venue.name,
          shortDescription: venue.shortDescription,
          addressLine1: venue.addressLine1,
          district: venue.district,
          postalCode: venue.postalCode,
          venueType: venue.venueType,
          audienceDescription: venue.audienceDescription,
          capacity: venue.capacity,
          legalIdentityComplete: legalComplete,
        });

  const copyId = stepCopyId(role, step);
  const title =
    step.kind === "chapter_intro"
      ? t(`chapters.${step.chapter}.${chapterRoleKey}.title`)
      : t(`steps.${copyId}.title`);
  const body =
    step.kind === "chapter_intro"
      ? t(`chapters.${step.chapter}.${chapterRoleKey}.body`)
      : t(`steps.${copyId}.body`);

  const canSkip = step.skippable && step.kind !== "publish";
  const nextDisabled =
    pending ||
    (!step.skippable && !currentStepValid() && step.kind !== "publish");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/marketplace/help"
          className="text-sm font-medium text-[var(--text-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
        >
          {t("questions")}
        </Link>
        <button
          type="button"
          onClick={saveAndExit}
          disabled={pending}
          className="text-sm font-medium text-[var(--ink)] underline-offset-4 hover:underline disabled:opacity-60"
        >
          {t("saveAndExit")}
        </button>
      </div>

      <div
        className="grid gap-2"
        aria-label={t("chapterProgress", { chapter: step.chapter })}
      >
        <ol className="flex gap-2">
          {chapters.map((chapter) => {
            const active = chapter === step.chapter;
            const past =
              chapters.indexOf(chapter) < chapters.indexOf(step.chapter);
            return (
              <li
                key={chapter}
                className={`h-1.5 flex-1 rounded-full ${
                  active || past ? "bg-[var(--primary)]" : "bg-[var(--rule)]"
                }`}
              />
            );
          })}
        </ol>
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {t("stepOf", { current: stepIndex + 1, total: steps.length })} ·{" "}
          {role === "entertainer" ? t("entertainerPath") : t("venuePath")}
        </p>
      </div>

      <div>
        <p className="eyebrow text-[var(--accent)]">
          {t("chapterProgress", { chapter: step.chapter })}
        </p>
        <h1 className="page-title mt-2 text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {title}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">{body}</p>
      </div>

      <div className="panel grid flex-1 gap-4 p-6">
        {step.id === "act_name" ? (
          <Field label={t("fields.actName")}>
            <input
              className="field"
              value={entertainer.actName}
              onChange={(e) => updateEntertainer({ actName: e.target.value })}
              autoFocus
            />
          </Field>
        ) : null}

        {step.id === "category" && role === "entertainer" ? (
          <CategorySubcategorySelect
            kind="entertainer"
            categoryName="category"
            subcategoryName="genres"
            otherName="subcategoryOther"
            defaultCategory={entertainer.category}
            defaultSubcategoryRaw={entertainer.genres}
            categoryLabel={tProfile("category")}
            subcategoryLabel={tProfile("subcategory")}
            otherLabel={tProfile("subcategoryOther")}
            onSelectionChange={({ categoryId, subcategoryId, otherLabel }) => {
              updateEntertainer({
                category: categoryId,
                genres: encodeSubcategory(subcategoryId, otherLabel),
              });
            }}
          />
        ) : null}

        {step.id === "description" && role === "entertainer" ? (
          <ParagraphTextField
            label={t("fields.description")}
            defaultValue={toParagraphEditorHtml(entertainer.description)}
            min={DESCRIPTION_MIN}
            max={DESCRIPTION_MAX}
            placeholder={tProfile("descriptionPlaceholder")}
            onChange={(html) => updateEntertainer({ description: html })}
            size="tall"
          />
        ) : null}

        {step.id === "hero_photo" ? (
          <WizardHeroUpload
            entertainerProfileId={
              role === "entertainer"
                ? (entertainer.profileId ?? undefined)
                : undefined
            }
            venueId={
              role === "venue" ? (venue.venueId ?? undefined) : undefined
            }
            existingImageId={
              role === "entertainer"
                ? entertainer.heroImageId
                : venue.heroImageId
            }
            onUploaded={(id) => {
              if (role === "entertainer") {
                updateEntertainer({
                  heroImageId: id,
                  imageCount: Math.max(1, entertainer.imageCount),
                });
              } else {
                patchVenue({
                  heroImageId: id,
                  imageCount: Math.max(1, venue.imageCount),
                });
              }
            }}
          />
        ) : null}

        {step.id === "location" && role === "entertainer" ? (
          <>
            <LocationAutocomplete
              label={tProfile("baseLocation")}
              hint={tProfile("baseLocationHint")}
              nameLabel="berlinBase"
              nameLatitude="baseLatitude"
              nameLongitude="baseLongitude"
              defaultLabel={entertainer.berlinBase}
              defaultLatitude={entertainer.baseLatitude}
              defaultLongitude={entertainer.baseLongitude}
              onConfirmedChange={(value) => {
                updateEntertainer({
                  berlinBase: value.label,
                  baseLatitude: value.latitude,
                  baseLongitude: value.longitude,
                });
              }}
            />
            <Field label={t("fields.travelRadiusKm")}>
              <input
                className="field"
                type="number"
                min={0}
                max={500}
                value={entertainer.travelRadiusKm}
                onChange={(e) =>
                  updateEntertainer({
                    travelRadiusKm: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
          </>
        ) : null}

        {step.id === "fee" && role === "entertainer" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("fields.priceMinEur")}>
              <input
                className="field"
                type="number"
                min={0}
                value={Math.round(entertainer.priceMinCents / 100)}
                onChange={(e) =>
                  updateEntertainer({
                    priceMinCents: Math.max(
                      0,
                      Math.round(Number(e.target.value) * 100),
                    ),
                  })
                }
              />
            </Field>
            <Field label={t("fields.priceMaxEur")}>
              <input
                className="field"
                type="number"
                min={0}
                value={Math.round(entertainer.priceMaxCents / 100)}
                onChange={(e) =>
                  updateEntertainer({
                    priceMaxCents: Math.max(
                      0,
                      Math.round(Number(e.target.value) * 100),
                    ),
                  })
                }
              />
            </Field>
          </div>
        ) : null}

        {step.id === "links" && role === "entertainer" ? (
          <div className="grid gap-4">
            <p className="text-sm text-[var(--text-muted)]">{t("linksHint")}</p>
            <PrefixedUrlInput
              platform="website"
              name="websiteUrl"
              label={tProfile("websiteUrl")}
              defaultValue={entertainer.websiteUrl}
              onValueChange={(value) =>
                updateEntertainer({ websiteUrl: value })
              }
            />
            <PrefixedUrlInput
              platform="instagram"
              name="instagram"
              label={tProfile("socialInstagram")}
              defaultValue={entertainer.instagramUrl}
              onValueChange={(value) =>
                updateEntertainer({ instagramUrl: value })
              }
            />
            <PrefixedUrlInput
              platform="youtube"
              name="youtube"
              label={tProfile("socialYoutube")}
              defaultValue={entertainer.youtubeUrl}
              onValueChange={(value) =>
                updateEntertainer({ youtubeUrl: value })
              }
            />
          </div>
        ) : null}

        {step.id === "notes" && role === "entertainer" ? (
          <ParagraphTextField
            label={t("fields.technicalRequirements")}
            defaultValue={toParagraphEditorHtml(
              entertainer.technicalRequirements,
            )}
            min={0}
            max={TECHNICAL_MAX}
            onChange={(html) =>
              updateEntertainer({ technicalRequirements: html })
            }
            size="medium"
          />
        ) : null}

        {step.id === "venue_name" ? (
          <Field label={t("fields.venueName")}>
            <input
              className="field"
              value={venue.name}
              onChange={(e) => patchVenue({ name: e.target.value })}
              autoFocus
            />
          </Field>
        ) : null}

        {step.id === "venue_type" ? (
          <CategorySubcategorySelect
            key={venueTypeKey}
            kind="venue"
            categoryName="venueCategory"
            subcategoryName="venueSubcategory"
            otherName="venueSubcategoryOther"
            defaultCategory={parseVenueType(venue.venueType).categoryId}
            defaultSubcategoryRaw={
              parseVenueType(venue.venueType).subcategoryRaw
            }
            categoryLabel={tProfile("venueType")}
            subcategoryLabel={tProfile("subcategory")}
            otherLabel={tProfile("subcategoryOther")}
            onSelectionChange={({ categoryId, subcategoryId, otherLabel }) => {
              patchVenue({
                venueType: encodeVenueType(
                  categoryId,
                  encodeSubcategory(subcategoryId, otherLabel),
                ),
              });
            }}
          />
        ) : null}

        {step.id === "description" && role === "venue" ? (
          <ParagraphTextField
            key={shortDescriptionKey}
            label={t("fields.shortDescription")}
            defaultValue={toParagraphEditorHtml(venue.shortDescription)}
            min={DESCRIPTION_MIN}
            max={SHORT_DESCRIPTION_MAX}
            placeholder={tProfile("descriptionPlaceholder")}
            onChange={(html) => patchVenue({ shortDescription: html })}
            size="medium"
          />
        ) : null}

        {step.id === "address" && role === "venue" ? (
          <div className="grid gap-4">
            <VenuePlacesSearch
              locale={locale}
              onPrefill={applyVenuePlacePrefill}
            />
            {addressConfirmOpen || venue.addressLine1 ? (
              <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--rule)] p-4">
                <p className="text-sm font-medium">
                  {t("addressConfirmTitle")}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {t("addressConfirmBody")}
                </p>
                <Field label={t("fields.addressLine1")}>
                  <input
                    className="field"
                    value={venue.addressLine1}
                    onChange={(e) =>
                      patchVenue({ addressLine1: e.target.value })
                    }
                  />
                </Field>
                <Field label={t("fields.addressLine2")}>
                  <input
                    className="field"
                    value={venue.addressLine2}
                    onChange={(e) =>
                      patchVenue({ addressLine2: e.target.value })
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("fields.postalCode")}>
                    <input
                      className="field"
                      value={venue.postalCode}
                      onChange={(e) =>
                        patchVenue({ postalCode: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={t("fields.district")}>
                    <input
                      className="field"
                      value={venue.district}
                      onChange={(e) => patchVenue({ district: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step.id === "capacity" && role === "venue" ? (
          <>
            <Field label={t("fields.capacity")}>
              <input
                className="field"
                type="number"
                min={1}
                value={venue.capacity}
                onChange={(e) =>
                  patchVenue({
                    capacity: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </Field>
            <Field label={t("fields.capacityContext")}>
              <input
                className="field"
                value={venue.capacityContext}
                onChange={(e) =>
                  patchVenue({ capacityContext: e.target.value })
                }
              />
            </Field>
            <ParagraphTextField
              label={t("fields.audienceDescription")}
              defaultValue={toParagraphEditorHtml(venue.audienceDescription)}
              min={DESCRIPTION_MIN}
              max={NOTES_MAX}
              onChange={(html) => patchVenue({ audienceDescription: html })}
              size="medium"
            />
          </>
        ) : null}

        {step.id === "notes" && role === "venue" ? (
          <ParagraphTextField
            label={t("fields.productionNotes")}
            defaultValue={toParagraphEditorHtml(venue.productionNotes)}
            min={0}
            max={NOTES_MAX}
            onChange={(html) => patchVenue({ productionNotes: html })}
            size="medium"
          />
        ) : null}

        {step.id === "legal" ? (
          <div className="grid gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              {t("legalPrivacy")}
            </p>
            <LegalIdentityForm
              locale={locale}
              initial={legalIdentity}
              onSaved={(fields) => {
                setLegalComplete(isLegalIdentityComplete(fields));
              }}
            />
          </div>
        ) : null}

        {step.id === "go_live" ? (
          <div className="grid gap-4">
            {readiness.ok ? (
              <>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {t("publishReadyTitle")}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {t("publishReadyBody")}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {t("publishGapsTitle")}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {t("publishGapsBody")}
                </p>
                <ul className="grid gap-1 text-sm text-[var(--danger)]">
                  {role === "entertainer" &&
                  !readiness.ok &&
                  "reasons" in readiness
                    ? readiness.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))
                    : null}
                  {role === "venue" && !readiness.ok && "issues" in readiness
                    ? readiness.issues.map((issue) => (
                        <li key={issue.field}>{issue.message}</li>
                      ))
                    : null}
                </ul>
              </>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                pending={pending}
                pendingLabel={ui("working")}
                disabled={!readiness.ok}
                onClick={publishNow}
              >
                {t("publish")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={exploreMarketplace}
              >
                {t("exploreMarketplace")}
              </Button>
            </div>
          </div>
        ) : null}

        {step.kind === "chapter_intro" ? (
          <p className="text-sm text-[var(--text-muted)]">{body}</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </div>

      {step.kind !== "publish" ? (
        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] bg-[var(--bg)]/95 px-1 py-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="secondary"
            disabled={pending || stepIndex === 0}
            onClick={() => {
              setError(null);
              setStepIndex((i) => Math.max(0, i - 1));
            }}
          >
            {t("back")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {canSkip ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={goSkip}
              >
                {t("skip")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="primary"
              pending={pending}
              pendingLabel={ui("working")}
              disabled={nextDisabled}
              onClick={goNext}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
