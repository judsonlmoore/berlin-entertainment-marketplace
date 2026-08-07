"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import {
  sendVenueConnectionRequestAction,
  submitProfileEnquiryAction,
} from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";
import { toDatetimeLocal } from "@/src/lib/format";

type VenueOption = {
  id: string;
  name: string;
  activeBookingId?: string | null;
  cooldownDaysRemaining?: number | null;
};

type SharedProps = {
  locale: "en" | "de";
  locked?: boolean;
  lockedMessage?: string;
};

type TalentToVenueProps = SharedProps & {
  direction: "talent_to_venue";
  venueId: string;
  canSubmit: boolean;
  publishRequired: boolean;
  activeBookingId?: string | null;
  cooldownDaysRemaining?: number | null;
};

type VenueToTalentProps = SharedProps & {
  direction: "venue_to_talent";
  entertainerProfileId: string;
  venues: VenueOption[];
};

type Props = TalentToVenueProps | VenueToTalentProps;

function defaultWindow() {
  const starts = new Date();
  starts.setUTCDate(starts.getUTCDate() + 14);
  starts.setUTCHours(18, 0, 0, 0);
  const ends = new Date(starts);
  ends.setUTCHours(20, 0, 0, 0);
  return {
    startsAtLocal: toDatetimeLocal(starts),
    endsAtLocal: toDatetimeLocal(ends),
  };
}

/**
 * Profile CTA: open a commercial offer composer instead of a contact request.
 */
export function SendOfferButton(props: Props) {
  const t = useTranslations("leads");
  const bookingsT = useTranslations("bookings");
  const market = useTranslations("marketplace");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const defaults = useMemo(() => defaultWindow(), []);

  const isVenueToTalent = props.direction === "venue_to_talent";
  const [venueId, setVenueId] = useState(
    isVenueToTalent ? (props.venues[0]?.id ?? "") : props.venueId,
  );

  if (props.direction === "venue_to_talent") {
    if (props.locked || props.venues.length === 0) {
      return (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {props.lockedMessage ?? market("requestActLocked")}{" "}
          <Link href="/profile" className="font-medium underline">
            {market("viewProfile")}
          </Link>
        </p>
      );
    }
  } else if (props.publishRequired) {
    return (
      <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
        {t("publishRequired")}{" "}
        <Link href="/profile" className="font-medium underline">
          {t("goToProfile")}
        </Link>
      </p>
    );
  }

  const selectedVenueId =
    props.direction === "venue_to_talent"
      ? props.venues.some((v) => v.id === venueId)
        ? venueId
        : (props.venues[0]?.id ?? "")
      : props.venueId;
  const selected =
    props.direction === "venue_to_talent"
      ? props.venues.find((v) => v.id === selectedVenueId)
      : null;
  const cooldownDays =
    props.direction === "venue_to_talent"
      ? (selected?.cooldownDaysRemaining ?? null)
      : (props.cooldownDaysRemaining ?? null);
  const activeBookingId =
    props.direction === "venue_to_talent"
      ? (selected?.activeBookingId ?? null)
      : (props.activeBookingId ?? null);
  const onCooldown = cooldownDays != null && cooldownDays > 0;
  const inactive = onCooldown || Boolean(activeBookingId);
  const canOpenComposer =
    props.direction === "talent_to_venue"
      ? props.canSubmit && !inactive
      : !inactive && Boolean(selectedVenueId);

  if (
    props.direction === "talent_to_venue" &&
    !props.canSubmit &&
    !activeBookingId &&
    !onCooldown
  ) {
    return null;
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {props.direction === "venue_to_talent" && props.venues.length > 1 ? (
        <label className="grid gap-1 text-sm">
          <span className="sr-only">{t("sendOfferVenue")}</span>
          <select
            className="field min-h-11 min-w-[12rem]"
            value={selectedVenueId}
            onChange={(e) => setVenueId(e.target.value)}
            disabled={open}
          >
            {props.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!open ? (
        <Button
          type="button"
          variant="primary"
          disabled={!canOpenComposer}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          {t("sendOfferCta")}
        </Button>
      ) : (
        <form
          className="grid w-full max-w-md gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            if (inactive || !selectedVenueId) return;
            setError(null);
            const form = new FormData(event.currentTarget);
            const depositTerms = String(form.get("depositTerms") ?? "").trim();
            const changeNote = String(form.get("changeNote") ?? "").trim();
            const note = String(form.get("note") ?? "").trim();
            const payload = {
              venueId: selectedVenueId,
              locale: props.locale,
              startsAt: new Date(String(form.get("startsAt"))).toISOString(),
              endsAt: new Date(String(form.get("endsAt"))).toISOString(),
              feeEur: Number(form.get("feeEur") ?? 0),
              performanceFormat: String(form.get("performanceFormat") ?? ""),
              cancellationTerms: String(form.get("cancellationTerms") ?? ""),
              productionObligations: String(
                form.get("productionObligations") ?? "",
              ),
              ...(depositTerms ? { depositTerms } : {}),
              ...(changeNote ? { changeNote } : {}),
              ...(note ? { note } : {}),
            };
            startTransition(async () => {
              const result =
                props.direction === "talent_to_venue"
                  ? await submitProfileEnquiryAction(payload)
                  : await sendVenueConnectionRequestAction({
                      ...payload,
                      entertainerProfileId: props.entertainerProfileId,
                    });
              if (!result.ok) {
                setError(
                  result.code === "validation" || result.code === "forbidden"
                    ? errors(result.code)
                    : result.message,
                );
                return;
              }
              if (result.bookingId) {
                router.push(`/marketplace/bookings/${result.bookingId}`);
                router.refresh();
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div>
            <h3 className="text-lg font-medium">{t("sendOfferTitle")}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t("sendOfferBody")}
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {t("sendOfferIncludesDocs")}
            </p>
          </div>
          <label className="label">
            <span className="field-label">{bookingsT("startsAt")}</span>
            <input
              name="startsAt"
              type="datetime-local"
              className="field"
              required
              defaultValue={defaults.startsAtLocal}
            />
          </label>
          <label className="label">
            <span className="field-label">{bookingsT("endsAt")}</span>
            <input
              name="endsAt"
              type="datetime-local"
              className="field"
              required
              defaultValue={defaults.endsAtLocal}
            />
          </label>
          <label className="label">
            <span className="field-label">{bookingsT("fee")}</span>
            <input
              name="feeEur"
              type="number"
              min={0}
              step="0.01"
              className="field"
              required
              defaultValue={500}
            />
          </label>
          <label className="label">
            <span className="field-label">{bookingsT("performanceFormat")}</span>
            <input
              name="performanceFormat"
              className="field"
              required
              defaultValue="chamber"
            />
          </label>
          <label className="label">
            <span className="field-label">{bookingsT("cancellationTerms")}</span>
            <textarea
              name="cancellationTerms"
              rows={3}
              className="field"
              required
              defaultValue={bookingsT("cancellationDefault")}
            />
          </label>
          <label className="label">
            <span className="field-label">
              {bookingsT("productionObligations")}
            </span>
            <textarea
              name="productionObligations"
              rows={3}
              className="field"
              required
              defaultValue={bookingsT("productionDefault")}
            />
          </label>
          <label className="label">
            <span className="field-label">
              {bookingsT("depositTerms")} ({bookingsT("optional")})
            </span>
            <textarea
              name="depositTerms"
              rows={2}
              className="field"
              placeholder={bookingsT("depositTermsPlaceholder")}
            />
          </label>
          <label className="label">
            <span className="field-label">
              {t("noteLabel")} ({bookingsT("optional")})
            </span>
            <textarea
              name="note"
              rows={2}
              className="field"
              maxLength={2000}
              placeholder={t("notePlaceholder")}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              pending={pending}
              pendingLabel={ui("working")}
            >
              {bookingsT("sendOffer")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("dismissComposer")}
            </Button>
          </div>
        </form>
      )}

      {onCooldown ? (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {t("enquiryCooldown", { days: cooldownDays })}
          {activeBookingId ? (
            <>
              {" "}
              <Link
                href={`/marketplace/bookings/${activeBookingId}`}
                className="font-medium underline"
              >
                {t("viewLead")}
              </Link>
            </>
          ) : null}
        </p>
      ) : activeBookingId ? (
        <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
          {t("enquiryAlreadyActive")}{" "}
          <Link
            href={`/marketplace/bookings/${activeBookingId}`}
            className="font-medium underline"
          >
            {t("viewLead")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
