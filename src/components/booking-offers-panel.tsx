"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import { proposeBookingTerms } from "@/src/actions/bookings";
import { respondToProfileEnquiryAction } from "@/src/actions/profile-enquiries";
import { AcceptTermsButton } from "@/src/components/booking-actions";
import {
  OfferTermsFields,
  type OfferTermsFieldDefaults,
} from "@/src/components/offer-terms-fields";
import { AppModal } from "@/src/components/ui/app-modal";
import { Button } from "@/src/components/ui/button";
import { formatEur, toDatetimeLocal } from "@/src/lib/format";

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

type Defaults = OfferTermsFieldDefaults;

type OfferStatus = "pending" | "accepted" | "declined" | "superseded";

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
  ownLegalComplete: boolean;
  declineEnquiryId?: string | null;
  /** When the booking closed without accepting terms (decline / reject / expire). */
  bookingClosedWithoutAccept?: boolean;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

const STATUS_DOT: Record<OfferStatus, string> = {
  pending: "bg-[var(--ochre-soft)]",
  accepted: "bg-[var(--primary)]",
  declined: "bg-[var(--danger)]",
  superseded: "bg-[var(--text-muted)]",
};

const STATUS_TEXT: Record<OfferStatus, string> = {
  pending: "text-[var(--ochre-soft)]",
  accepted: "text-[var(--primary)]",
  declined: "text-[var(--danger)]",
  superseded: "text-[var(--text-muted)]",
};

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const t = useTranslations("bookings");
  const label =
    status === "pending"
      ? t("offerOpen")
      : status === "accepted"
        ? t("offerAccepted")
        : status === "declined"
          ? t("offerDeclined")
          : t("offerSuperseded");

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] ${STATUS_TEXT[status]}`}
    >
      <span
        className={`size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function OfferFacts({
  offer,
  locale,
  dateFmt,
}: {
  offer: OfferTermsView;
  locale: string;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("bookings");
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-[var(--text-muted)] uppercase">
            {t("fee")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)] tabular-nums">
            {formatEur(offer.feeCents, locale)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-[var(--text-muted)] uppercase">
            {t("window")}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">
            {dateFmt.format(asDate(offer.startsAt))}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            – {dateFmt.format(asDate(offer.endsAt))}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 border-t border-[var(--rule)] pt-4 text-sm">
        <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
          <dt className="text-[var(--text-muted)]">{t("performanceFormat")}</dt>
          <dd className="font-medium text-[var(--ink)]">
            {offer.performanceFormat}
          </dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
          <dt className="text-[var(--text-muted)]">{t("cancellationTerms")}</dt>
          <dd className="text-[var(--ink)]">{offer.cancellationTerms}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
          <dt className="text-[var(--text-muted)]">
            {t("productionObligations")}
          </dt>
          <dd className="text-[var(--ink)]">{offer.productionObligations}</dd>
        </div>
        {offer.depositTerms ? (
          <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
            <dt className="text-[var(--text-muted)]">{t("depositTerms")}</dt>
            <dd className="text-[var(--ink)]">{offer.depositTerms}</dd>
          </div>
        ) : null}
      </dl>

      {offer.changeNote ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.1em] text-[var(--text-muted)] uppercase">
            {t("changeNote")}
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">{offer.changeNote}</p>
        </div>
      ) : null}
    </div>
  );
}

function OfferCardHeader({
  offer,
  status,
  proposerLabel,
  dateFmt,
  asSummary = false,
}: {
  offer: OfferTermsView;
  status: OfferStatus;
  proposerLabel: string;
  dateFmt: Intl.DateTimeFormat;
  asSummary?: boolean;
}) {
  const t = useTranslations("bookings");
  const title = (
    <>
      <div className="min-w-0">
        <p className="text-[1.05rem] font-semibold text-[var(--ink)]">
          {t("offerLabel", { n: offer.version })}
        </p>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {t("offerFrom", { party: proposerLabel })} ·{" "}
          {dateFmt.format(asDate(offer.createdAt))}
        </p>
      </div>
      <OfferStatusBadge status={status} />
    </>
  );

  if (asSummary) {
    return (
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] pb-4">
      {title}
    </div>
  );
}

function LegalRequiredForRespond() {
  const t = useTranslations("bookings");
  return (
    <p className="text-sm text-[var(--text-muted)]">
      {t("legalRequiredToRespond")}{" "}
      <Link href="/account" className="font-medium underline">
        {t("goToAccount")}
      </Link>
    </p>
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
  ownLegalComplete,
  declineEnquiryId = null,
  bookingClosedWithoutAccept = false,
}: Props) {
  const t = useTranslations("bookings");
  const leadsT = useTranslations("leads");
  const ui = useTranslations("ui");
  const [composerOpen, setComposerOpen] = useState(false);
  const [isCounter, setIsCounter] = useState(false);
  const [pending, startTransition] = useTransition();
  const [declinePending, startDecline] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const router = useRouter();
  const formId = useId();

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }),
    [locale],
  );

  const chronologicalHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          b.version - a.version ||
          asDate(b.createdAt).getTime() - asDate(a.createdAt).getTime(),
      ),
    [history],
  );

  const declinedOfferId = useMemo(() => {
    if (!bookingClosedWithoutAccept || history.length === 0) {
      return null;
    }
    // Highest version among closed offers was the one left unanswered.
    const newest = [...history].sort(
      (a, b) =>
        b.version - a.version ||
        asDate(b.createdAt).getTime() - asDate(a.createdAt).getTime(),
    )[0];
    return newest?.id ?? null;
  }, [bookingClosedWithoutAccept, history]);

  function proposerLabel(userId: string) {
    return userId === entertainerUserId ? t("partyAct") : t("partyVenue");
  }

  function statusFor(offer: OfferTermsView, isOpen: boolean): OfferStatus {
    if (offer.acceptedAt) return "accepted";
    if (isOpen) return "pending";
    if (offer.supersededAt && offer.id === declinedOfferId) return "declined";
    if (offer.supersededAt) return "superseded";
    return "pending";
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

  function openCompose() {
    if (!ownLegalComplete) return;
    setError(null);
    setIsCounter(false);
    setComposerOpen(true);
  }

  function openCounter() {
    if (!ownLegalComplete) return;
    setError(null);
    setIsCounter(true);
    setComposerOpen(true);
  }

  function closeComposer() {
    if (pending) return;
    setComposerOpen(false);
    setIsCounter(false);
  }

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

      {openOffer ? (
        <article className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] p-5">
          <OfferCardHeader
            offer={openOffer}
            status={statusFor(openOffer, true)}
            proposerLabel={proposerLabel(openOffer.proposedByUserId)}
            dateFmt={dateFmt}
          />
          <OfferFacts offer={openOffer} locale={locale} dateFmt={dateFmt} />
          {offerAction === "wait" ? (
            <p className="text-sm text-[var(--text-muted)]">
              {t("offerWaiting")}
            </p>
          ) : null}
          {offerAction === "respond" ? (
            <div className="grid gap-3 border-t border-[var(--rule)] pt-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-[var(--ochre-soft)]">
                <span
                  className="size-2 shrink-0 rounded-full bg-[var(--ochre-soft)]"
                  aria-hidden="true"
                />
                {t("offerNeedsYou")}
              </p>
              {ownLegalComplete ? (
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
                    onClick={openCounter}
                  >
                    {t("counterOffer")}
                  </Button>
                </div>
              ) : (
                <LegalRequiredForRespond />
              )}
              {declineEnquiryId ? (
                <div className="flex flex-wrap gap-2">
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
                </div>
              ) : null}
              {declineError ? (
                <p role="alert" className="text-sm text-[var(--danger)]">
                  {declineError}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>
      ) : null}

      {chronologicalHistory.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-[var(--ink)]">
            {t("offerHistory")}
          </h3>
          <ul className="grid gap-2">
            {chronologicalHistory.map((offer) => {
              const status = statusFor(offer, false);
              return (
                <li key={offer.id}>
                  <details className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
                    <OfferCardHeader
                      offer={offer}
                      status={status}
                      proposerLabel={proposerLabel(offer.proposedByUserId)}
                      dateFmt={dateFmt}
                      asSummary
                    />
                    <div className="mt-4 border-t border-[var(--rule)] pt-4">
                      <OfferFacts
                        offer={offer}
                        locale={locale}
                        dateFmt={dateFmt}
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {offerAction === "compose" ? (
        ownLegalComplete ? (
          <Button type="button" variant="primary" onClick={openCompose}>
            {t("sendOffer")}
          </Button>
        ) : (
          <LegalRequiredForRespond />
        )
      ) : null}

      {offerAction === "none" && !openOffer && history.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {t("offersUnavailable")}
        </p>
      ) : null}

      <AppModal
        open={composerOpen}
        onClose={closeComposer}
        title={isCounter ? t("counterTitle") : t("composeOfferTitle")}
        subtitle={isCounter ? t("counterBody") : t("composeOfferBody")}
        closeLabel={ui("close")}
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={closeComposer}
              className="w-full sm:w-auto"
            >
              {isCounter ? t("cancelCounter") : leadsT("dismissComposer")}
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              pending={pending}
              pendingLabel={ui("working")}
              className="w-full sm:w-auto"
            >
              {isCounter ? t("sendCounter") : t("sendOffer")}
            </Button>
          </div>
        }
      >
        <form
          id={formId}
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ownLegalComplete) return;
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
              setComposerOpen(false);
              setIsCounter(false);
              router.refresh();
            });
          }}
        >
          <OfferTermsFields
            defaults={isCounter ? counterDefaults : defaults}
            requireChangeNote={isCounter}
          />
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
