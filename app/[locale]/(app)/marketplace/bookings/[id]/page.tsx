import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  AcceptTermsButton,
  CancelBookingForm,
  DepositStatusForm,
  GenerateAgreementButton,
  SignAgreementButton,
} from "@/src/components/booking-actions";
import { BookingLifecycleTrack } from "@/src/components/booking-lifecycle-track";
import { BookingTermsForm } from "@/src/components/booking-terms-form";
import { Avatar } from "@/src/components/ui/monogram";
import { StatusLabel } from "@/src/components/ui/status-label";
import { getDb } from "@/src/db/client";
import { getBookingDetail } from "@/src/db/queries/bookings";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import {
  applications,
  directRequests,
  opportunities,
} from "@/src/db/schema/marketplace";
import {
  canCancelBooking,
  isTermsEligibleState,
  type BookingParty,
  type BookingState,
} from "@/src/domain/booking";
import { canGenerateAgreement } from "@/src/domain/agreement";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function formatEur(cents: number, locale: string) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function BookingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bookings");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok || !can(access.actor, "booking.view")) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("title")}</h1>
        <p className="mt-4">{market("denied")}</p>
      </section>
    );
  }

  const detail = await getBookingDetail(id);
  if (!detail) {
    notFound();
  }

  const { booking, terms, depositEvents, agreement } = detail;
  const isEntertainer = booking.entertainerUserId === access.actor.userId;
  const isVenue = access.actor.venueMemberships.some(
    (m) =>
      m.venueId === booking.venueId &&
      m.status === "active" &&
      (m.role === "owner" || m.role === "member"),
  );
  const isStaff = access.actor.isPlatformStaff;

  if (!isEntertainer && !isVenue && !isStaff) {
    notFound();
  }

  const party: BookingParty = isStaff
    ? "staff"
    : isEntertainer
      ? "entertainer"
      : "venue";

  const openTerms = terms.find((row) => !row.acceptedAt) ?? null;
  const agreedTerms = terms.find((row) => row.acceptedAt) ?? null;
  const canPropose =
    isTermsEligibleState(booking.state as BookingState) &&
    (party === "venue" || party === "entertainer");
  const canAccept =
    openTerms &&
    openTerms.proposedByUserId !== access.actor.userId &&
    (party === "venue" || party === "entertainer") &&
    isTermsEligibleState(booking.state as BookingState);
  const showCancel = canCancelBooking(booking.state as BookingState, party);
  const showDeposit =
    can(access.actor, "booking.record_deposit", {
      venueId: booking.venueId,
    }) || isStaff;
  const canGenerate =
    canGenerateAgreement(booking.state) &&
    (party === "venue" || party === "entertainer" || party === "staff");
  const myPendingSignature = agreement?.signatures.find(
    (row) =>
      row.signerUserId === access.actor.userId && row.status === "pending",
  );
  const canSign =
    Boolean(myPendingSignature) &&
    (booking.state === "agreement_generated" ||
      booking.state === "partially_signed") &&
    agreement?.provider === "sandbox";

  const db = getDb();
  const fallbackStart = new Date(booking.createdAt);
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() + 14);
  fallbackStart.setUTCHours(18, 0, 0, 0);
  const fallbackEnd = new Date(fallbackStart);
  fallbackEnd.setUTCHours(20, 0, 0, 0);
  let defaults = {
    startsAtLocal: toDatetimeLocal(fallbackStart),
    endsAtLocal: toDatetimeLocal(fallbackEnd),
    feeEur: 500,
    performanceFormat: "chamber",
  };

  if (booking.originType === "direct_request") {
    const request = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, booking.originId),
    });
    if (request) {
      defaults = {
        startsAtLocal: toDatetimeLocal(request.startsAt),
        endsAtLocal: toDatetimeLocal(request.endsAt),
        feeEur: request.proposedFeeCents / 100,
        performanceFormat: request.formatCategory,
      };
    }
  } else {
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, booking.originId),
    });
    if (application) {
      const opportunity = await db.query.opportunities.findFirst({
        where: eq(opportunities.id, application.opportunityId),
      });
      if (opportunity) {
        defaults = {
          startsAtLocal: toDatetimeLocal(opportunity.startsAt),
          endsAtLocal: toDatetimeLocal(opportunity.endsAt),
          feeEur: Math.round(
            (application.quoteMinCents + application.quoteMaxCents) / 200,
          ),
          performanceFormat: opportunity.formatCategory,
        };
      }
    }
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="mx-auto grid max-w-2xl gap-6">
      <div>
        <p className="text-sm">
          <Link href="/marketplace/bookings">{t("back")}</Link>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Avatar name={booking.actName} size={48} />
          <Avatar name={booking.venueName} size={48} />
        </div>
        <h1 className="page-title mt-3 text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {booking.actName} · {booking.venueName}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          {booking.originType} · {booking.id.slice(0, 8)} · v{booking.version}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusLabel>{booking.state}</StatusLabel>
          <StatusLabel>
            {t("depositCurrent")}: {booking.depositStatus}
          </StatusLabel>
        </div>
      </div>

      <div className="panel grid gap-4 p-6">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("state")}
        </h2>
        <BookingLifecycleTrack state={booking.state} />
        {booking.cancelledReason ? (
          <p className="text-sm">
            {t("cancelReason")}: {booking.cancelledReason}
          </p>
        ) : null}
        <p className="text-sm text-[var(--text-muted)]">
          {booking.state === "terms_agreed"
            ? t("nextGenerate")
            : booking.state === "agreement_generated" ||
                booking.state === "partially_signed"
              ? t("nextSign")
              : booking.state === "confirmed"
                ? t("nextConfirmed")
                : t("nextSteps")}
        </p>
      </div>

      <div className="panel grid gap-2 border-[var(--info-soft)] bg-[var(--info-soft)]/50 p-6 text-sm">
        <h2 className="font-medium">{t("agreementNoticeTitle")}</h2>
        <p>{t("agreementNoticeBody")}</p>
        <p>
          <span className="font-semibold">{t("agreementNoticeDeLabel")}</span>
          {" · "}
          <span className="text-[var(--text-muted)]">
            {t("agreementNoticeEnLabel")}
          </span>
        </p>
      </div>

      <p className="panel border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-4 text-sm">
        {t("depositNotice")}
      </p>

      {agreedTerms ? (
        <div className="panel grid gap-2 p-6 text-sm">
          <h2 className="text-lg font-medium">{t("agreedTitle")}</h2>
          <p>
            {dateFmt.format(agreedTerms.startsAt)} –{" "}
            {dateFmt.format(agreedTerms.endsAt)}
          </p>
          <p>
            {t("fee")}: {formatEur(agreedTerms.feeCents, locale)}
          </p>
          <p>
            {t("performanceFormat")}: {agreedTerms.performanceFormat}
          </p>
          <p>
            {t("cancellationTerms")}: {agreedTerms.cancellationTerms}
          </p>
          <p>
            {t("productionObligations")}: {agreedTerms.productionObligations}
          </p>
          {agreedTerms.depositTerms ? (
            <p>
              {t("depositTerms")}: {agreedTerms.depositTerms}
            </p>
          ) : null}
          {canGenerate ? (
            <div className="mt-3">
              <GenerateAgreementButton
                locale={locale as "en" | "de"}
                bookingId={booking.id}
                expectedVersion={booking.version}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {agreement ? (
        <div className="panel grid gap-4 p-6 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium">{t("agreementTitle")}</h2>
            <StatusLabel tone="warning">{t("sandboxBadge")}</StatusLabel>
          </div>
          <p className="text-[var(--text-muted)]">{t("sandboxBody")}</p>
          <p>
            {t("agreementStatus")}: {agreement.status} · {agreement.provider}
          </p>
          <ul className="grid gap-1">
            {agreement.signatures.map((signature) => (
              <li key={signature.id}>
                {signature.partyRole}: {signature.status}
                {signature.signedAt
                  ? ` · ${dateFmt.format(signature.signedAt)}`
                  : ""}
              </li>
            ))}
          </ul>
          {agreement.rendered ? (
            <div className="grid gap-4 border-t border-[var(--rule)] pt-4">
              <div>
                <p className="font-semibold">{t("agreementNoticeDeLabel")}</p>
                <pre className="mt-2 font-sans text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-muted)]">
                  {agreement.rendered.germanBody}
                </pre>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-muted)]">
                  {t("agreementNoticeEnLabel")}
                </p>
                <pre className="mt-2 font-sans text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-muted)]">
                  {agreement.rendered.englishBody}
                </pre>
              </div>
            </div>
          ) : null}
          {canSign ? (
            <SignAgreementButton
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              agreementId={agreement.id}
              expectedVersion={booking.version}
            />
          ) : agreement.status !== "completed" ? (
            <p className="text-[var(--text-muted)]">{t("waitingSignatures")}</p>
          ) : (
            <p className="text-[var(--primary)]">{t("confirmedCalendars")}</p>
          )}
        </div>
      ) : null}

      {openTerms ? (
        <div className="panel grid gap-3 p-6 text-sm">
          <h2 className="text-lg font-medium">{t("proposedTitle")}</h2>
          <p>
            {t("termsVersion")}: {openTerms.version}
          </p>
          <p>
            {dateFmt.format(openTerms.startsAt)} –{" "}
            {dateFmt.format(openTerms.endsAt)}
          </p>
          <p>
            {t("fee")}: {formatEur(openTerms.feeCents, locale)}
          </p>
          <p>
            {t("performanceFormat")}: {openTerms.performanceFormat}
          </p>
          {canAccept ? (
            <AcceptTermsButton
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              termsId={openTerms.id}
              expectedVersion={booking.version}
            />
          ) : (
            <p className="text-[var(--muted)]">{t("waitingAccept")}</p>
          )}
        </div>
      ) : null}

      {canPropose ? (
        <div className="panel p-6">
          <BookingTermsForm
            locale={locale as "en" | "de"}
            bookingId={booking.id}
            expectedVersion={booking.version}
            defaults={defaults}
          />
        </div>
      ) : null}

      {showDeposit ? (
        <div className="panel p-6">
          <DepositStatusForm
            locale={locale as "en" | "de"}
            bookingId={booking.id}
            currentStatus={booking.depositStatus}
          />
          {depositEvents.length > 0 ? (
            <ul className="mt-4 grid gap-1 text-sm text-[var(--muted)]">
              {depositEvents.map((event) => (
                <li key={event.id}>
                  {event.status}
                  {event.note ? ` — ${event.note}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showCancel ? (
        <div className="panel p-6">
          <CancelBookingForm
            locale={locale as "en" | "de"}
            bookingId={booking.id}
            expectedVersion={booking.version}
          />
        </div>
      ) : null}
    </section>
  );
}
