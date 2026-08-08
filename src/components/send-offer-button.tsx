"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import {
  sendVenueConnectionRequestAction,
  submitProfileEnquiryAction,
} from "@/src/actions/profile-enquiries";
import { OfferTermsFields } from "@/src/components/offer-terms-fields";
import { AppModal } from "@/src/components/ui/app-modal";
import { Button } from "@/src/components/ui/button";
import { toDatetimeLocal } from "@/src/lib/format";

type VenueOption = {
  id: string;
  name: string;
  openOfferBookingIds?: string[];
  /** Venue-owner legal identity complete (required to send). */
  legalIdentityComplete?: boolean;
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
  legalIdentityComplete: boolean;
  openOfferBookingIds?: string[];
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
    feeEur: 500,
    performanceFormat: "chamber",
  };
}

function OpenOffersLinks({
  bookingIds,
  seeOfferLabel,
  seeOffersLabel,
  openOfferNLabel,
}: {
  bookingIds: string[];
  seeOfferLabel: string;
  seeOffersLabel: (count: number) => string;
  openOfferNLabel: (n: number) => string;
}) {
  if (bookingIds.length === 0) return null;

  if (bookingIds.length === 1) {
    return (
      <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
        <Link
          href={`/marketplace/bookings/${bookingIds[0]}`}
          className="font-medium underline"
        >
          {seeOfferLabel}
        </Link>
      </p>
    );
  }

  return (
    <div className="max-w-xs text-right text-sm text-[var(--text-muted)]">
      <p className="font-medium text-[var(--ink)]">
        {seeOffersLabel(bookingIds.length)}
      </p>
      <ul className="mt-1 grid gap-1">
        {bookingIds.map((id, index) => (
          <li key={id}>
            <Link href={`/marketplace/bookings/${id}`} className="underline">
              {openOfferNLabel(index + 1)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegalRequiredNotice() {
  const t = useTranslations("leads");
  return (
    <p className="max-w-xs text-right text-sm text-[var(--text-muted)]">
      {t("legalRequiredToSend")}{" "}
      <Link href="/profile" className="font-medium underline">
        {t("goToProfile")}
      </Link>
    </p>
  );
}

/**
 * Profile CTA: send a commercial offer in a modal, or open existing offers.
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
  const formId = "send-offer-form";

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
  const openOfferBookingIds =
    props.direction === "venue_to_talent"
      ? (selected?.openOfferBookingIds ?? [])
      : (props.openOfferBookingIds ?? []);
  const legalComplete =
    props.direction === "venue_to_talent"
      ? Boolean(selected?.legalIdentityComplete)
      : props.legalIdentityComplete;

  const canSubmitRole =
    props.direction === "talent_to_venue"
      ? props.canSubmit
      : Boolean(selectedVenueId);

  if (props.direction === "talent_to_venue" && !props.canSubmit) {
    return openOfferBookingIds.length > 0 ? (
      <OpenOffersLinks
        bookingIds={openOfferBookingIds}
        seeOfferLabel={t("seeOffer")}
        seeOffersLabel={(count) => t("seeOffers", { count })}
        openOfferNLabel={(n) => t("openOfferN", { n })}
      />
    ) : null;
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

      {legalComplete ? (
        <Button
          type="button"
          variant="primary"
          disabled={!canSubmitRole}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          {t("sendOfferCta")}
        </Button>
      ) : (
        <LegalRequiredNotice />
      )}

      <OpenOffersLinks
        bookingIds={openOfferBookingIds}
        seeOfferLabel={t("seeOffer")}
        seeOffersLabel={(count) => t("seeOffers", { count })}
        openOfferNLabel={(n) => t("openOfferN", { n })}
      />

      <AppModal
        open={open}
        onClose={() => {
          if (pending) return;
          setOpen(false);
        }}
        title={t("sendOfferTitle")}
        subtitle={t("sendOfferBody")}
        closeLabel={ui("close")}
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              {t("dismissComposer")}
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              pending={pending}
              pendingLabel={ui("working")}
              className="w-full sm:w-auto"
            >
              {bookingsT("sendOffer")}
            </Button>
          </div>
        }
      >
        <form
          id={formId}
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedVenueId || !legalComplete) return;
            setError(null);
            const form = new FormData(event.currentTarget);
            const depositTerms = String(form.get("depositTerms") ?? "").trim();
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
              setOpen(false);
              if (result.bookingId) {
                router.push(`/marketplace/bookings/${result.bookingId}`);
                router.refresh();
                return;
              }
              router.refresh();
            });
          }}
        >
          <p className="text-xs text-[var(--text-muted)]">
            {t("sendOfferIncludesDocs")}
          </p>
          <OfferTermsFields defaults={defaults} includeNote />
          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </form>
      </AppModal>
    </div>
  );
}
