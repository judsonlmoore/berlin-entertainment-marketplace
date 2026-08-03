import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  AcceptTermsButton,
  CancelBookingForm,
  DepositStatusForm,
} from "@/src/components/booking-actions";
import { BookingTermsForm } from "@/src/components/booking-terms-form";
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
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{market("denied")}</p>
      </section>
    );
  }

  const detail = await getBookingDetail(id);
  if (!detail) {
    notFound();
  }

  const { booking, terms, depositEvents } = detail;
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
        <h1 className="display mt-3 text-4xl">
          {booking.actName} · {booking.venueName}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {booking.originType} · {booking.state} · v{booking.version}
        </p>
      </div>

      <div className="panel grid gap-2 p-6 text-sm">
        <p>
          {t("state")}: {booking.state}
        </p>
        <p>
          {t("depositCurrent")}: {booking.depositStatus}
        </p>
        {booking.cancelledReason ? (
          <p>
            {t("cancelReason")}: {booking.cancelledReason}
          </p>
        ) : null}
        <p className="text-[var(--muted)]">{t("nextSteps")}</p>
      </div>

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
          <p className="text-[var(--muted)]">{t("agreementPending")}</p>
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
