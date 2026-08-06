"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  upsertEntertainerProfile,
  createVenue,
  updateVenue as updateVenueProfile,
} from "@/src/actions/profiles";
import { ConfettiBurst } from "@/src/components/confetti-burst";
import { CategorySubcategorySelect } from "@/src/components/profile/category-subcategory-select";
import {
  ParagraphTextField,
  toParagraphEditorHtml,
} from "@/src/components/profile/paragraph-text-field";
import { VenuePlacesSearch } from "@/src/components/profile/venue-places-search";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";
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
  SHORT_DESCRIPTION_MAX,
  validateRichTextField,
} from "@/src/domain/sanitize-input";
import type { PlacesPrefill } from "@/src/integrations/google-places";

type Role = "entertainer" | "venue";

export type EntertainerDraft = {
  actName: string;
  category: string;
  genres: string;
  description: string;
};

export type VenueDraft = {
  venueId: string | null;
  name: string;
  venueType: string;
  shortDescription: string;
  googlePlaceId?: string;
  addressLine1?: string;
  addressLine2?: string;
  district?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  websiteUrl?: string;
};

type Props = {
  locale: "en" | "de";
  role: Role;
  accountEmail: string;
  entertainerDraft: EntertainerDraft;
  venueDraft: VenueDraft;
  /** After basics save + RSC refresh, server re-mounts with the completion step. */
  initialPhase?: "basics" | "done";
};

function StepDots({
  total,
  current,
  label,
}: {
  total: number;
  current: number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2" aria-label={label}>
      <ol className="flex gap-2">
        {Array.from({ length: total }, (_, index) => (
          <li
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index <= current ? "bg-[var(--primary)]" : "bg-[var(--rule)]"
            }`}
          />
        ))}
      </ol>
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

/** Overall onboarding: 1 role (prior page) → 2 basics → 3 confirm. */
const TOTAL_FLOW_STEPS = 3;
const BASICS_STEP_INDEX = 1; // 0-based: step 2 of 3
const DONE_STEP_INDEX = 2;

export function OnboardingSetupWizard({
  locale,
  role,
  accountEmail,
  entertainerDraft,
  venueDraft,
  initialPhase = "basics",
}: Props) {
  const t = useTranslations("onboardingFlow");
  const tProfile = useTranslations("profile");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [phase, setPhase] = useState<"basics" | "done">(initialPhase);
  const [entertainer, setEntertainer] =
    useState<EntertainerDraft>(entertainerDraft);
  const [venue, setVenue] = useState<VenueDraft>(venueDraft);
  const [venueTypeKey, setVenueTypeKey] = useState(0);
  const [shortDescriptionKey, setShortDescriptionKey] = useState(0);

  const isDoneStep = phase === "done";
  const stepIndex = isDoneStep ? DONE_STEP_INDEX : BASICS_STEP_INDEX;

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
      addressLine2: prefill.addressLine2,
      district: prefill.district,
      postalCode: prefill.postalCode,
      latitude: prefill.latitude,
      longitude: prefill.longitude,
      websiteUrl: prefill.websiteUrl,
    });
  };

  const currentStepValid = (): boolean => {
    if (role === "entertainer") {
      const descriptionCheck = validateRichTextField(entertainer.description, {
        min: DESCRIPTION_MIN,
        max: DESCRIPTION_MAX,
      });
      const sub = parseSubcategory(entertainer.genres);
      return (
        entertainer.actName.trim().length > 0 &&
        entertainer.category.trim().length > 0 &&
        sub.subcategoryId.trim().length > 0 &&
        descriptionCheck.ok
      );
    }

    const descriptionCheck = validateRichTextField(venue.shortDescription, {
      min: DESCRIPTION_MIN,
      max: SHORT_DESCRIPTION_MAX,
    });
    const parsed = parseVenueType(venue.venueType);
    return (
      venue.name.trim().length > 0 &&
      parsed.categoryId.trim().length > 0 &&
      parsed.subcategoryRaw.trim().length > 0 &&
      descriptionCheck.ok
    );
  };

  const finishProfile = () => {
    setError(null);
    if (!currentStepValid()) {
      setError(t("fieldsIncomplete"));
      return;
    }

    startTransition(async () => {
      if (role === "entertainer") {
        const saved = await upsertEntertainerProfile({
          actName: entertainer.actName,
          category: entertainer.category,
          genres: entertainer.genres,
          description: entertainer.description,
          groupSize: 1,
          berlinBase: "",
          travelRadiusKm: 25,
          priceMinCents: 0,
          priceMaxCents: 0,
          durationMinutes: 60,
          technicalRequirements: "",
          contactEmail: accountEmail,
          locale,
        });
        if (!saved.ok) {
          setError(
            saved.code === "validation" ||
              saved.code === "unauthorized" ||
              saved.code === "forbidden"
              ? errors(saved.code)
              : saved.message,
          );
          return;
        }
      } else {
        const payload = {
          name: venue.name,
          shortDescription: venue.shortDescription,
          venueType: venue.venueType,
          addressLine1: venue.addressLine1 ?? "",
          ...(venue.addressLine2 ? { addressLine2: venue.addressLine2 } : {}),
          district: venue.district ?? "",
          postalCode: venue.postalCode ?? "",
          ...(venue.latitude ? { latitude: venue.latitude } : {}),
          ...(venue.longitude ? { longitude: venue.longitude } : {}),
          ...(venue.googlePlaceId
            ? { googlePlaceId: venue.googlePlaceId }
            : {}),
          ...(venue.websiteUrl ? { websiteUrl: venue.websiteUrl } : {}),
          audienceDescription: "",
          capacity: 50,
          capacityContext: "",
          productionNotes: "",
          contactEmail: accountEmail,
          locale,
        };
        const saved = venue.venueId
          ? await updateVenueProfile(venue.venueId, payload)
          : await createVenue(payload);
        if (!saved.ok) {
          setError(
            saved.code === "validation" ||
              saved.code === "unauthorized" ||
              saved.code === "forbidden"
              ? errors(saved.code)
              : saved.message,
          );
          return;
        }
        const venueId = saved.id ?? venue.venueId;
        if (venueId && !venue.venueId) {
          setVenue((prev) => ({ ...prev, venueId }));
        }
      }

      setPhase("done");
    });
  };

  const continueToProfile = () => {
    setCelebrate(true);
    window.setTimeout(() => {
      router.push("/profile");
    }, 1100);
  };

  return (
    <div className="mx-auto grid max-w-lg gap-6">
      <ConfettiBurst active={celebrate} />

      <StepDots
        total={TOTAL_FLOW_STEPS}
        current={stepIndex}
        label={t("stepOf", {
          current: stepIndex + 1,
          total: TOTAL_FLOW_STEPS,
        })}
      />

      <div>
        <p className="eyebrow text-[var(--accent)]">
          {role === "entertainer" ? t("entertainerPath") : t("venuePath")}
        </p>
        <h1 className="page-title mt-2 text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {isDoneStep ? t("doneTitle") : t("steps.basics.title")}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          {isDoneStep ? t("doneBody") : t("steps.basics.body")}
        </p>
      </div>

      <div className="panel grid gap-4 p-6">
        {!isDoneStep && role === "entertainer" ? (
          <>
            <Field label={t("fields.actName")}>
              <input
                className="field"
                value={entertainer.actName}
                onChange={(e) => updateEntertainer({ actName: e.target.value })}
                required
              />
            </Field>
            <CategorySubcategorySelect
              kind="entertainer"
              categoryName="category"
              subcategoryName="genres"
              otherName="subcategoryOther"
              defaultCategory={entertainerDraft.category}
              defaultSubcategoryRaw={entertainerDraft.genres}
              categoryLabel={tProfile("category")}
              subcategoryLabel={tProfile("subcategory")}
              otherLabel={tProfile("subcategoryOther")}
              onSelectionChange={({
                categoryId,
                subcategoryId,
                otherLabel,
              }) => {
                updateEntertainer({
                  category: categoryId,
                  genres: encodeSubcategory(subcategoryId, otherLabel),
                });
              }}
            />
            <ParagraphTextField
              label={t("fields.description")}
              defaultValue={toParagraphEditorHtml(entertainerDraft.description)}
              min={DESCRIPTION_MIN}
              max={DESCRIPTION_MAX}
              placeholder={tProfile("descriptionPlaceholder")}
              onChange={(html) => updateEntertainer({ description: html })}
              size="tall"
            />
          </>
        ) : null}

        {!isDoneStep && role === "venue" ? (
          <>
            <VenuePlacesSearch
              locale={locale}
              onPrefill={applyVenuePlacePrefill}
            />
            <Field label={t("fields.venueName")}>
              <input
                className="field"
                value={venue.name}
                onChange={(e) => patchVenue({ name: e.target.value })}
                required
              />
            </Field>
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
              onSelectionChange={({
                categoryId,
                subcategoryId,
                otherLabel,
              }) => {
                patchVenue({
                  venueType: encodeVenueType(
                    categoryId,
                    encodeSubcategory(subcategoryId, otherLabel),
                  ),
                });
              }}
            />
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
          </>
        ) : null}

        {isDoneStep ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--success-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {t("doneHighlight")}
            </p>
            <p className="mt-2 text-sm text-[var(--ink)]">{t("donePending")}</p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {isDoneStep ? (
            <Button
              type="button"
              variant="primary"
              onClick={continueToProfile}
              disabled={celebrate}
            >
              {t("continueToProfile")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              pending={pending}
              pendingLabel={ui("working")}
              onClick={finishProfile}
            >
              {t("next")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
