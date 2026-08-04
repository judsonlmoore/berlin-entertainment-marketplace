"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  upsertEntertainerProfile,
  submitEntertainerProfile,
  createVenue,
  updateVenue as updateVenueProfile,
  submitVenueProfile,
} from "@/src/actions/profiles";
import { ConfettiBurst } from "@/src/components/confetti-burst";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Role = "entertainer" | "venue";

export type EntertainerDraft = {
  actName: string;
  category: string;
  description: string;
  groupSize: string;
  berlinBase: string;
  travelRadiusKm: string;
  priceMinEur: string;
  priceMaxEur: string;
  durationMinutes: string;
  technicalRequirements: string;
  contactEmail: string;
};

export type VenueDraft = {
  venueId: string | null;
  name: string;
  shortDescription: string;
  venueType: string;
  addressLine1: string;
  district: string;
  postalCode: string;
  audienceDescription: string;
  capacity: string;
  capacityContext: string;
  productionNotes: string;
  contactEmail: string;
};

type Props = {
  locale: "en" | "de";
  role: Role;
  entertainerDraft: EntertainerDraft;
  venueDraft: VenueDraft;
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

export function OnboardingSetupWizard({
  locale,
  role,
  entertainerDraft,
  venueDraft,
}: Props) {
  const t = useTranslations("onboardingFlow");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [entertainer, setEntertainer] =
    useState<EntertainerDraft>(entertainerDraft);
  const [venue, setVenue] = useState<VenueDraft>(venueDraft);

  const steps = useMemo(() => {
    if (role === "entertainer") {
      return ["basics", "details", "contact", "done"] as const;
    }
    return ["basics", "location", "details", "contact", "done"] as const;
  }, [role]);

  const profileSteps = steps.length - 1;
  const currentKey = steps[step]!;
  const isDoneStep = currentKey === "done";

  const updateEntertainer = (patch: Partial<EntertainerDraft>) => {
    setEntertainer((prev) => ({ ...prev, ...patch }));
  };
  const patchVenue = (patch: Partial<VenueDraft>) => {
    setVenue((prev) => ({ ...prev, ...patch }));
  };

  const filled = (...values: string[]) =>
    values.every((value) => value.trim().length > 0);

  const currentStepValid = (): boolean => {
    if (role === "entertainer") {
      if (currentKey === "basics") {
        return filled(
          entertainer.actName,
          entertainer.category,
          entertainer.description,
        );
      }
      if (currentKey === "details") {
        return (
          filled(
            entertainer.groupSize,
            entertainer.berlinBase,
            entertainer.travelRadiusKm,
            entertainer.durationMinutes,
            entertainer.priceMinEur,
            entertainer.priceMaxEur,
            entertainer.technicalRequirements,
          ) &&
          Number(entertainer.groupSize) >= 1 &&
          Number(entertainer.durationMinutes) >= 1 &&
          Number(entertainer.priceMaxEur) >= Number(entertainer.priceMinEur)
        );
      }
      if (currentKey === "contact") {
        return filled(entertainer.contactEmail);
      }
    } else {
      if (currentKey === "basics") {
        return filled(venue.name, venue.venueType, venue.shortDescription);
      }
      if (currentKey === "location") {
        return (
          filled(venue.addressLine1, venue.district, venue.postalCode) &&
          venue.postalCode.trim().length >= 4
        );
      }
      if (currentKey === "details") {
        return (
          filled(venue.audienceDescription, venue.capacity) &&
          Number(venue.capacity) >= 1
        );
      }
      if (currentKey === "contact") {
        return filled(venue.contactEmail);
      }
    }
    return true;
  };

  const finishProfile = () => {
    setError(null);
    startTransition(async () => {
      if (role === "entertainer") {
        const priceMinCents = Math.round(Number(entertainer.priceMinEur) * 100);
        const priceMaxCents = Math.round(Number(entertainer.priceMaxEur) * 100);
        const saved = await upsertEntertainerProfile({
          actName: entertainer.actName,
          category: entertainer.category,
          description: entertainer.description,
          groupSize: Number(entertainer.groupSize),
          berlinBase: entertainer.berlinBase,
          travelRadiusKm: Number(entertainer.travelRadiusKm),
          priceMinCents,
          priceMaxCents,
          durationMinutes: Number(entertainer.durationMinutes),
          technicalRequirements: entertainer.technicalRequirements,
          contactEmail: entertainer.contactEmail,
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
        const submitted = await submitEntertainerProfile(locale);
        if (!submitted.ok) {
          setError(
            submitted.code === "validation" ||
              submitted.code === "unauthorized" ||
              submitted.code === "forbidden" ||
              submitted.code === "invalid_transition"
              ? errors(submitted.code)
              : submitted.message,
          );
          return;
        }
      } else {
        const payload = {
          name: venue.name,
          shortDescription: venue.shortDescription,
          addressLine1: venue.addressLine1,
          district: venue.district,
          postalCode: venue.postalCode,
          venueType: venue.venueType,
          audienceDescription: venue.audienceDescription,
          capacity: Number(venue.capacity),
          capacityContext: venue.capacityContext,
          productionNotes: venue.productionNotes,
          contactEmail: venue.contactEmail,
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
        if (!venueId) {
          setError(errors("validation"));
          return;
        }
        if (!venue.venueId) {
          setVenue((prev) => ({ ...prev, venueId }));
        }
        const submitted = await submitVenueProfile(venueId, locale);
        if (!submitted.ok) {
          setError(
            submitted.code === "validation" ||
              submitted.code === "unauthorized" ||
              submitted.code === "forbidden" ||
              submitted.code === "invalid_transition"
              ? errors(submitted.code)
              : submitted.message,
          );
          return;
        }
      }

      setStep(profileSteps);
    });
  };

  const goNext = () => {
    setError(null);
    if (!currentStepValid()) {
      setError(t("fieldsIncomplete"));
      return;
    }
    if (step === profileSteps - 1) {
      finishProfile();
      return;
    }
    setStep((value) => Math.min(value + 1, profileSteps));
  };

  const goBack = () => {
    setError(null);
    setStep((value) => Math.max(value - 1, 0));
  };

  const continueToOverview = () => {
    setCelebrate(true);
    window.setTimeout(() => {
      router.push("/marketplace");
      router.refresh();
    }, 1100);
  };

  return (
    <div className="mx-auto grid max-w-lg gap-6">
      <ConfettiBurst active={celebrate} />

      {!isDoneStep ? (
        <StepDots
          total={profileSteps}
          current={step}
          label={t("stepOf", { current: step + 1, total: profileSteps })}
        />
      ) : null}

      <div>
        <p className="eyebrow text-[var(--accent)]">
          {role === "entertainer" ? t("entertainerPath") : t("venuePath")}
        </p>
        <h1 className="page-title mt-2 text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {isDoneStep ? t("doneTitle") : t(`steps.${currentKey}.title`)}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          {isDoneStep ? t("doneBody") : t(`steps.${currentKey}.body`)}
        </p>
      </div>

      <div className="panel grid gap-4 p-6">
        {role === "entertainer" && currentKey === "basics" ? (
          <>
            <Field label={t("fields.actName")}>
              <input
                className="field"
                value={entertainer.actName}
                onChange={(e) => updateEntertainer({ actName: e.target.value })}
                required
              />
            </Field>
            <Field label={t("fields.category")}>
              <input
                className="field"
                value={entertainer.category}
                onChange={(e) =>
                  updateEntertainer({ category: e.target.value })
                }
                required
              />
            </Field>
            <Field label={t("fields.description")}>
              <textarea
                className="field"
                rows={4}
                value={entertainer.description}
                onChange={(e) =>
                  updateEntertainer({ description: e.target.value })
                }
                required
              />
            </Field>
          </>
        ) : null}

        {role === "entertainer" && currentKey === "details" ? (
          <>
            <Field label={t("fields.groupSize")}>
              <input
                className="field"
                type="number"
                min={1}
                value={entertainer.groupSize}
                onChange={(e) =>
                  updateEntertainer({ groupSize: e.target.value })
                }
                required
              />
            </Field>
            <Field label={t("fields.berlinBase")}>
              <input
                className="field"
                value={entertainer.berlinBase}
                onChange={(e) =>
                  updateEntertainer({ berlinBase: e.target.value })
                }
                required
              />
            </Field>
            <Field label={t("fields.travelRadiusKm")}>
              <input
                className="field"
                type="number"
                min={0}
                value={entertainer.travelRadiusKm}
                onChange={(e) =>
                  updateEntertainer({ travelRadiusKm: e.target.value })
                }
                required
              />
            </Field>
            <Field label={t("fields.durationMinutes")}>
              <input
                className="field"
                type="number"
                min={1}
                value={entertainer.durationMinutes}
                onChange={(e) =>
                  updateEntertainer({ durationMinutes: e.target.value })
                }
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.priceMinEur")}>
                <input
                  className="field"
                  type="number"
                  min={0}
                  step="1"
                  value={entertainer.priceMinEur}
                  onChange={(e) =>
                    updateEntertainer({ priceMinEur: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label={t("fields.priceMaxEur")}>
                <input
                  className="field"
                  type="number"
                  min={0}
                  step="1"
                  value={entertainer.priceMaxEur}
                  onChange={(e) =>
                    updateEntertainer({ priceMaxEur: e.target.value })
                  }
                  required
                />
              </Field>
            </div>
            <Field label={t("fields.technicalRequirements")}>
              <textarea
                className="field"
                rows={3}
                value={entertainer.technicalRequirements}
                onChange={(e) =>
                  updateEntertainer({
                    technicalRequirements: e.target.value,
                  })
                }
                required
              />
            </Field>
          </>
        ) : null}

        {role === "entertainer" && currentKey === "contact" ? (
          <Field label={t("fields.contactEmail")}>
            <input
              className="field"
              type="email"
              value={entertainer.contactEmail}
              onChange={(e) =>
                updateEntertainer({ contactEmail: e.target.value })
              }
              required
            />
          </Field>
        ) : null}

        {role === "venue" && currentKey === "basics" ? (
          <>
            <Field label={t("fields.venueName")}>
              <input
                className="field"
                value={venue.name}
                onChange={(e) => patchVenue({ name: e.target.value })}
                required
              />
            </Field>
            <Field label={t("fields.venueType")}>
              <input
                className="field"
                value={venue.venueType}
                onChange={(e) => patchVenue({ venueType: e.target.value })}
                required
              />
            </Field>
            <Field label={t("fields.shortDescription")}>
              <textarea
                className="field"
                rows={3}
                value={venue.shortDescription}
                onChange={(e) =>
                  patchVenue({ shortDescription: e.target.value })
                }
                required
              />
            </Field>
          </>
        ) : null}

        {role === "venue" && currentKey === "location" ? (
          <>
            <Field label={t("fields.addressLine1")}>
              <input
                className="field"
                value={venue.addressLine1}
                onChange={(e) => patchVenue({ addressLine1: e.target.value })}
                required
              />
            </Field>
            <Field label={t("fields.district")}>
              <input
                className="field"
                value={venue.district}
                onChange={(e) => patchVenue({ district: e.target.value })}
                required
              />
            </Field>
            <Field label={t("fields.postalCode")}>
              <input
                className="field"
                value={venue.postalCode}
                onChange={(e) => patchVenue({ postalCode: e.target.value })}
                required
              />
            </Field>
          </>
        ) : null}

        {role === "venue" && currentKey === "details" ? (
          <>
            <Field label={t("fields.audienceDescription")}>
              <textarea
                className="field"
                rows={3}
                value={venue.audienceDescription}
                onChange={(e) =>
                  patchVenue({ audienceDescription: e.target.value })
                }
                required
              />
            </Field>
            <Field label={t("fields.capacity")}>
              <input
                className="field"
                type="number"
                min={1}
                value={venue.capacity}
                onChange={(e) => patchVenue({ capacity: e.target.value })}
                required
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
            <Field label={t("fields.productionNotes")}>
              <textarea
                className="field"
                rows={3}
                value={venue.productionNotes}
                onChange={(e) =>
                  patchVenue({ productionNotes: e.target.value })
                }
              />
            </Field>
          </>
        ) : null}

        {role === "venue" && currentKey === "contact" ? (
          <Field label={t("fields.contactEmail")}>
            <input
              className="field"
              type="email"
              value={venue.contactEmail}
              onChange={(e) => patchVenue({ contactEmail: e.target.value })}
              required
            />
          </Field>
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

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          {!isDoneStep && step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
              disabled={pending}
            >
              {t("back")}
            </Button>
          ) : (
            <span />
          )}

          {isDoneStep ? (
            <Button
              type="button"
              variant="primary"
              onClick={continueToOverview}
              disabled={celebrate}
            >
              {t("continueToOverview")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              pending={pending}
              pendingLabel={ui("working")}
              onClick={goNext}
            >
              {step === profileSteps - 1 ? t("submitForReview") : t("next")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
