"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { proposeBookingTerms } from "@/src/actions/bookings";
import { respondToProfileEnquiryAction } from "@/src/actions/profile-enquiries";
import {
  AcceptTermsButton,
} from "@/src/components/booking-actions";
import { Button } from "@/src/components/ui/button";
import { formatEur, toDatetimeLocal } from "@/src/lib/format";
import { useRouter } from "@/src/i18n/navigation";

export type OfferTermsView = {
  id: string;
  version: number;
  proposedByUserId: string;
  acceptedAt: Date | string | null;
  supersededAt: Date | string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  feeCents: number;
  performanceFormat: string;
  cancellationTerms: string;
  productionObligations: string;
  depositTerms: string | null;
  changeNote: string | null;
  createdAt: Date | string;
};

type Defaults = {
  startsAtLocal: string;
  endsAtLocal: string;
  feeEur: number;
  performanceFormat: string;
  cancellationTerms?: string;
  productionObligations?: string;
  depositTerms?: string;
};

type Props = {
  locale: "en" | "de";
  bookingId: string;
  expectedVersion: number;
  entertainerUserId: string;
  offerAction: "compose" | "wait" | "respond" | "none";
  openOffer: OfferTermsView | null;
  history: OfferTermsView[];
  defaults: Defaults;
  canAccept: boolean;
  /** Pending profile offer: Decline closes without unlocking contacts. */
  declineEnquiryId?: string | null;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function OfferReadOnly({
  offer,
  locale,
  dateFmt,
  proposerLabel,
}: {
  offer: OfferTermsView;
  locale: string;
  dateFmt: Intl.DateTimeFormat;
  proposerLabel: string;
}) {
  const t = useTranslations("bookings");
  return (
    <div className="grid gap-2 text-sm">
      <p className="text-[var(--text-muted)]">
        {t("offerFrom", { party: proposerLabel })} ·{" "}
        {dateFmt.format(asDate(offer.createdAt))}
      </p>
      <p>
        {dateFmt.format(asDate(offer.startsAt))} –{" "}
        {dateFmt.format(asDate(offer.endsAt))}
      </p>
      <p>
        {t("fee")}: {formatEur(offer.feeCents, locale)}
      </p>
      <p>
        {t("performanceFormat")}: {offer.performanceFormat}
      </p>
      <p>
        {t("cancellationTerms")}: {offer.cancellationTerms}
      </p>
      <p>
        {t("productionObligations")}: {offer.productionObligations}
      </p>
      {offer.depositTerms ? (
        <p>
          {t("depositTerms")}: {offer.depositTerms}
        </p>
      ) : null}
      {offer.changeNote ? (
        <p>
          <span className="font-medium">{t("changeNote")}:</span>{" "}
          {offer.changeNote}
        </p>
      ) : null}
    </div>
  );
}

function OfferComposer({
  locale,
  bookingId,
  expectedVersion,
  defaults,
  isCounter,
  onCancelCounter,
}: {
  locale: "en" | "de";
  bookingId: string;
  expectedVersion: number;
  defaults: Defaults;
  isCounter: boolean;
  onCancelCounter?: () => void;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const changeNote = String(form.get("changeNote") ?? "").trim();
        if (isCounter && !changeNote) {
          setError(t("changeNoteRequired"));
          return;
        }
        const depositTerms = String(form.get("depositTerms") ?? "").trim();
        startTransition(async () => {
          const result = await proposeBookingTerms({
            bookingId,
            expectedVersion,
            locale,
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
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">
        {isCounter ? t("counterTitle") : t("composeOfferTitle")}
      </h3>
      <p className="text-sm text-[var(--text-muted)]">
        {isCounter ? t("counterBody") : t("composeOfferBody")}
      </p>
      <label className="label">
        <span className="field-label">{t("startsAt")}</span>
        <input
          name="startsAt"
          type="datetime-local"
          className="field"
          required
          defaultValue={defaults.startsAtLocal}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("endsAt")}</span>
        <input
          name="endsAt"
          type="datetime-local"
          className="field"
          required
          defaultValue={defaults.endsAtLocal}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("fee")}</span>
        <input
          name="feeEur"
          type="number"
          min={0}
          step="0.01"
          className="field"
          required
          defaultValue={defaults.feeEur}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("performanceFormat")}</span>
        <input
          name="performanceFormat"
          className="field"
          required
          defaultValue={defaults.performanceFormat}
        />
      </label>
      <label className="label">
        <span className="field-label">{t("cancellationTerms")}</span>
        <textarea
          name="cancellationTerms"
          rows={2}
          className="field"
          required
          defaultValue={
            defaults.cancellationTerms ??
            "48h notice; deposit non-refundable within 48h."
          }
        />
      </label>
      <label className="label">
        <span className="field-label">{t("productionObligations")}</span>
        <textarea
          name="productionObligations"
          rows={2}
          className="field"
          required
          defaultValue={
            defaults.productionObligations ??
            "Venue provides PA and lights; act provides content."
          }
        />
      </label>
      <label className="label">
        <span className="field-label">{t("depositTerms")}</span>
        <textarea
          name="depositTerms"
          rows={2}
          className="field"
          defaultValue={defaults.depositTerms ?? ""}
          placeholder={t("depositTermsPlaceholder")}
        />
      </label>
      <label className="label">
        <span className="field-label">
          {t("changeNote")}
          {isCounter ? ` (${t("required")})` : ` (${t("optional")})`}
        </span>
        <textarea
          name="changeNote"
          rows={3}
          className="field"
          required={isCounter}
          placeholder={t("changeNotePlaceholder")}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
        >
          {isCounter ? t("sendCounter") : t("sendOffer")}
        </Button>
        {isCounter && onCancelCounter ? (
          <Button type="button" variant="secondary" onClick={onCancelCounter}>
            {t("cancelCounter")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function BookingOffersPanel({
  locale,
  bookingId,
  expectedVersion,
  entertainerUserId,
  offerAction,
  openOffer,
  history,
  defaults,
  canAccept,
  declineEnquiryId = null,
}: Props) {
  const t = useTranslations("bookings");
  const leadsT = useTranslations("leads");
  const [countering, setCountering] = useState(false);
  const [declinePending, startDecline] = useTransition();
  const [declineError, setDeclineError] = useState<string | null>(null);
  const router = useRouter();

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }),
    [locale],
  );

  function proposerLabel(userId: string) {
    return userId === entertainerUserId ? t("partyAct") : t("partyVenue");
  }

  const counterDefaults: Defaults = openOffer
    ? {
        startsAtLocal: toDatetimeLocal(asDate(openOffer.startsAt)),
        endsAtLocal: toDatetimeLocal(asDate(openOffer.endsAt)),
        feeEur: openOffer.feeCents / 100,
        performanceFormat: openOffer.performanceFormat,
        cancellationTerms: openOffer.cancellationTerms,
        productionObligations: openOffer.productionObligations,
        depositTerms: openOffer.depositTerms ?? "",
      }
    : defaults;

  const showComposer =
    offerAction === "compose" || (offerAction === "respond" && countering);

  return (
    <div className="panel grid gap-5 p-6">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("sectionOffers")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("offersBody")}
        </p>
      </div>

      {history.length > 0 ? (
        <div className="grid gap-2">
          <h3 className="font-medium">{t("offerHistory")}</h3>
          {history.map((offer) => (
            <details
              key={offer.id}
              className="rounded-[var(--radius-md)] border border-[var(--rule)] px-4 py-3"
            >
              <summary className="cursor-pointer font-medium">
                {t("offerLabel", { n: offer.version })}
                {offer.acceptedAt
                  ? ` · ${t("offerAccepted")}`
                  : offer.supersededAt
                    ? ` · ${t("offerSuperseded")}`
                    : ""}
              </summary>
              <div className="mt-3">
                <OfferReadOnly
                  offer={offer}
                  locale={locale}
                  dateFmt={dateFmt}
                  proposerLabel={proposerLabel(offer.proposedByUserId)}
                />
              </div>
            </details>
          ))}
        </div>
      ) : null}

      {openOffer && !countering ? (
        <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--rule)] p-4">
          <h3 className="text-lg font-medium">
            {t("offerLabel", { n: openOffer.version })} · {t("offerOpen")}
          </h3>
          <OfferReadOnly
            offer={openOffer}
            locale={locale}
            dateFmt={dateFmt}
            proposerLabel={proposerLabel(openOffer.proposedByUserId)}
          />
          {offerAction === "wait" ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("offerWaiting")}
            </p>
          ) : null}
          {offerAction === "respond" ? (
            <div className="flex flex-wrap gap-2">
              {canAccept ? (
                <AcceptTermsButton
                  locale={locale}
                  bookingId={bookingId}
                  termsId={openOffer.id}
                  expectedVersion={expectedVersion}
                />
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCountering(true)}
              >
                {t("counterOffer")}
              </Button>
              {declineEnquiryId ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={declinePending}
                  pending={declinePending}
                  pendingLabel={leadsT("working")}
                  onClick={() => {
                    setDeclineError(null);
                    startDecline(async () => {
                      const result = await respondToProfileEnquiryAction({
                        enquiryId: declineEnquiryId,
                        decision: "passed",
                        locale,
                      });
                      if (!result.ok) {
                        setDeclineError(result.message);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  {t("declineOffer")}
                </Button>
              ) : null}
              {declineError ? (
                <p role="alert" className="w-full text-sm text-[var(--danger)]">
                  {declineError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showComposer ? (
        <OfferComposer
          locale={locale}
          bookingId={bookingId}
          expectedVersion={expectedVersion}
          defaults={countering ? counterDefaults : defaults}
          isCounter={countering}
          {...(countering
            ? {
                onCancelCounter: () => {
                  setCountering(false);
                },
              }
            : {})}
        />
      ) : null}

      {offerAction === "none" && !openOffer && history.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("offersUnavailable")}</p>
      ) : null}
    </div>
  );
}
