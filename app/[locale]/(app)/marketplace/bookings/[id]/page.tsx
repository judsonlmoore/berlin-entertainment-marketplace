import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  AcceptTermsButton,
  CancelBookingForm,
  DepositStatusForm,
  GenerateAgreementButton,
  GenerateInvoiceButton,
  SignAgreementButton,
} from "@/src/components/booking-actions";
import { BookingDocumentUpload } from "@/src/components/booking-document-upload";
import { BookingLifecycleTrack } from "@/src/components/booking-lifecycle-track";
import { LeadProposalForm } from "@/src/components/lead-proposal-form";
import { formatEur, toDatetimeLocal } from "@/src/lib/format";
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";
import { BookingTermsForm } from "@/src/components/booking-terms-form";
import { ProfileEnquiryRespondButtons } from "@/src/components/profile-enquiry-actions";
import { Avatar } from "@/src/components/ui/monogram";
import { StatusLabel } from "@/src/components/ui/status-label";
import { PostGigSurveyForm } from "@/src/components/post-gig-survey-form";
import { getDb } from "@/src/db/client";
import { getBookingDetail } from "@/src/db/queries/bookings";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { getLeadByBookingId } from "@/src/db/queries/leads";
import { getLegalIdentityForUser } from "@/src/db/queries/legal-identity";
import { getPostGigSurveyInvitationForActor } from "@/src/db/queries/post-gig-surveys";
import {
  listDocumentsForBooking,
  listDocumentsVisibleToActor,
} from "@/src/db/queries/rider-access";
import {
  applications,
  directRequests,
  opportunities,
  portfolioItems,
  profileEnquiries,
} from "@/src/db/schema/marketplace";
import {
  canCancelBooking,
  isTermsEligibleState,
  type BookingParty,
  type BookingState,
} from "@/src/domain/booking";
import { canGenerateAgreement } from "@/src/domain/agreement";
import {
  isLegalIdentityComplete,
  publicLegalIdentityView,
} from "@/src/domain/legal-identity";
import { leadContactsUnlocked } from "@/src/domain/lead";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function docTitle(doc: {
  title: string;
  originalFilename: string | null;
}): string {
  return doc.title.trim() || doc.originalFilename?.trim() || "PDF";
}

const LEGAL_REVEAL_STATES = new Set([
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
]);

export default async function BookingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bookings");
  const leadsT = await getTranslations("leads");
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

  const { booking, terms, depositEvents, agreement, invoice } = detail;
  const lead = await getLeadByBookingId({
    bookingId: id,
    actor: access.actor,
  });
  const isEntertainer = booking.entertainerUserId === access.actor.userId;
  const isVenue = access.actor.venueId === booking.venueId;
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

  const gigIsPast =
    Boolean(agreedTerms) &&
    booking.state === "confirmed" &&
    Boolean(agreedTerms?.endsAt) &&
    agreedTerms!.endsAt <= new Date();

  const myPostGigSurvey = gigIsPast
    ? await getPostGigSurveyInvitationForActor({
        bookingId: booking.id,
        signerUserId: access.actor.userId,
      })
    : null;

  const actDocuments = await listDocumentsVisibleToActor({
    actor: access.actor,
    entertainerProfileId: booking.entertainerProfileId,
    ownerUserId: booking.entertainerUserId,
    publicationState: booking.entertainerPublicationState,
  });
  const venueDocuments = await listDocumentsVisibleToActor({
    actor: access.actor,
    venueId: booking.venueId,
    ownerUserId: booking.venueOwnerUserId,
    publicationState: booking.venuePublicationState,
  });
  const bookingScopedDocuments = await listDocumentsForBooking(booking.id);

  const entertainerLegal = await getLegalIdentityForUser(
    booking.entertainerUserId,
  );
  const venueLegal = await getLegalIdentityForUser(booking.venueOwnerUserId);
  const bothLegalComplete =
    isLegalIdentityComplete(entertainerLegal) &&
    isLegalIdentityComplete(venueLegal);
  const revealCounterpartyLegal = LEGAL_REVEAL_STATES.has(booking.state);
  const ownLegal = isEntertainer
    ? entertainerLegal
    : isVenue
      ? venueLegal
      : null;
  const counterpartyLegal = isEntertainer
    ? venueLegal
    : isVenue
      ? entertainerLegal
      : null;

  const db = getDb();
  const [actHero] = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.entertainerProfileId, booking.entertainerProfileId),
        eq(portfolioItems.kind, "image"),
        isNotNull(portfolioItems.blobKey),
      ),
    )
    .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt))
    .limit(1);
  const [venueHero] = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.venueId, booking.venueId),
        eq(portfolioItems.kind, "image"),
        isNotNull(portfolioItems.blobKey),
      ),
    )
    .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt))
    .limit(1);

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
  } else if (booking.originType === "profile_enquiry") {
    const enquiry = await db.query.profileEnquiries.findFirst({
      where: eq(profileEnquiries.id, booking.originId),
    });
    if (enquiry) {
      defaults = {
        startsAtLocal: enquiry.proposedStartsAt
          ? toDatetimeLocal(enquiry.proposedStartsAt)
          : defaults.startsAtLocal,
        endsAtLocal: enquiry.proposedEndsAt
          ? toDatetimeLocal(enquiry.proposedEndsAt)
          : defaults.endsAtLocal,
        feeEur:
          enquiry.proposedFeeCents != null
            ? enquiry.proposedFeeCents / 100
            : defaults.feeEur,
        performanceFormat:
          enquiry.proposedFormat?.trim() || defaults.performanceFormat,
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
          startsAtLocal: opportunity.startsAt
            ? toDatetimeLocal(opportunity.startsAt)
            : defaults.startsAtLocal,
          endsAtLocal: opportunity.endsAt
            ? toDatetimeLocal(opportunity.endsAt)
            : defaults.endsAtLocal,
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

  const enquiry =
    lead &&
    lead.booking.originType === "profile_enquiry" &&
    lead.originDetail.enquiry &&
    typeof lead.originDetail.enquiry === "object"
      ? (lead.originDetail.enquiry as {
          id: string;
          state: string;
          note: string | null;
          submittedByUserId: string;
          proposedStartsAt: Date | null;
          proposedEndsAt: Date | null;
          proposedFeeCents: number | null;
          proposedFormat: string | null;
        })
      : null;

  const canEditProposal =
    Boolean(enquiry) &&
    (enquiry!.state === "interested" || enquiry!.state === "pending") &&
    lead != null &&
    (lead.leadStatus === "open" || lead.leadStatus === "pending");

  const enquiryInitiatedByAct =
    Boolean(enquiry) &&
    enquiry!.submittedByUserId === booking.entertainerUserId;
  const canRespondToEnquiry =
    enquiry?.state === "pending" &&
    (enquiryInitiatedByAct
      ? can(access.actor, "profile_enquiry.respond", {
          venueId: booking.venueId,
        })
      : isEntertainer && access.actor.entertainerVerified);

  const contactsUnlocked = lead ? leadContactsUnlocked(lead.leadStatus) : false;

  let addendumN = 1;
  const actAddenda = actDocuments.map((doc) => ({
    ...doc,
    addendumNumber: addendumN++,
  }));
  const venueAddenda = venueDocuments.map((doc) => ({
    ...doc,
    addendumNumber: addendumN++,
  }));
  const bookingAddenda = bookingScopedDocuments.map((doc) => ({
    ...doc,
    addendumNumber: addendumN++,
  }));

  return (
    <section className="mx-auto grid max-w-2xl gap-6">
      {/* Overview */}
      <div>
        <p className="text-sm">
          <Link href="/marketplace/bookings">{t("back")}</Link>
        </p>
        <p className="mt-4 text-xs font-semibold tracking-[0.14em] uppercase text-[var(--text-muted)]">
          {t("negotiationEyebrow")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Avatar
            name={booking.actName}
            src={actHero ? portfolioImageSrc(actHero.id, "thumb") : undefined}
            size={56}
          />
          <Avatar
            name={booking.venueName}
            src={
              venueHero ? portfolioImageSrc(venueHero.id, "thumb") : undefined
            }
            size={56}
          />
        </div>
        <h1 className="page-title mt-3 text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {booking.actName} · {booking.venueName}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          {(
            ["application", "direct_request", "profile_enquiry"] as const
          ).includes(
            booking.originType as
              | "application"
              | "direct_request"
              | "profile_enquiry",
          )
            ? leadsT(
                `channel.${booking.originType as "application" | "direct_request" | "profile_enquiry"}`,
              )
            : booking.originType}{" "}
          · {booking.id.slice(0, 8)} · v{booking.version}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {lead ? (
            <StatusLabel>{leadsT(`status.${lead.leadStatus}`)}</StatusLabel>
          ) : null}
          <StatusLabel>{booking.state}</StatusLabel>
          <StatusLabel>
            {t("depositCurrent")}: {booking.depositStatus}
          </StatusLabel>
          {contactsUnlocked ? (
            <StatusLabel tone="success">
              {leadsT("contactsUnlocked")}
            </StatusLabel>
          ) : null}
        </div>
      </div>

      <div className="panel grid gap-4 p-6">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("sectionOverview")}
        </h2>
        {lead ? (
          <div className="grid gap-3 text-sm">
            <p>
              <span className="font-medium">{leadsT("parties")}:</span>{" "}
              {booking.actName} ↔ {booking.venueName}
              {lead.venue?.district ? ` (${lead.venue.district})` : ""}
            </p>
            {lead.performanceStartsAt ? (
              <p>
                <span className="font-medium">{leadsT("window")}:</span>{" "}
                {dateFmt.format(lead.performanceStartsAt)}
                {lead.performanceEndsAt
                  ? ` – ${dateFmt.format(lead.performanceEndsAt)}`
                  : ""}
              </p>
            ) : (
              <p className="text-[var(--text-muted)]">{leadsT("noDateYet")}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={`/marketplace/entertainers/${booking.entertainerProfileId}`}
                className="underline"
              >
                {leadsT("viewActProfile")}
              </Link>
              <Link
                href={`/marketplace/venues/${booking.venueId}`}
                className="underline"
              >
                {leadsT("viewVenueProfile")}
              </Link>
            </div>
          </div>
        ) : null}
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

      {canRespondToEnquiry && enquiry ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="text-lg font-medium">{leadsT("respondTitle")}</h2>
          {enquiry.note ? (
            <p className="text-sm text-[var(--text-muted)]">{enquiry.note}</p>
          ) : null}
          <ProfileEnquiryRespondButtons
            locale={locale as "en" | "de"}
            enquiryId={enquiry.id}
            state={enquiry.state}
          />
        </div>
      ) : null}

      {canEditProposal && enquiry ? (
        <div className="panel p-6">
          <LeadProposalForm
            locale={locale as "en" | "de"}
            enquiryId={enquiry.id}
            initial={{
              note: enquiry.note ?? "",
              proposedFormat: enquiry.proposedFormat ?? "",
              proposedFeeEur:
                enquiry.proposedFeeCents != null
                  ? String(enquiry.proposedFeeCents / 100)
                  : "",
              proposedStartsAt: enquiry.proposedStartsAt
                ? toDatetimeLocal(enquiry.proposedStartsAt)
                : "",
              proposedEndsAt: enquiry.proposedEndsAt
                ? toDatetimeLocal(enquiry.proposedEndsAt)
                : "",
            }}
          />
          {enquiry.proposedFeeCents != null ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {leadsT("proposedFee")}:{" "}
              {formatEur(enquiry.proposedFeeCents, locale)}
            </p>
          ) : null}
        </div>
      ) : null}

      {lead?.leadStatus === "open" ? (
        <p className="text-sm text-[var(--text-muted)]">{leadsT("openHint")}</p>
      ) : null}

      {/* Commercial terms */}
      <div className="panel grid gap-4 p-6">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("sectionTerms")}
        </h2>
        {agreedTerms ? (
          <div className="grid gap-2 text-sm">
            <h3 className="text-lg font-medium">{t("agreedTitle")}</h3>
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
          </div>
        ) : null}
        {openTerms ? (
          <div className="grid gap-3 text-sm">
            <h3 className="text-lg font-medium">{t("proposedTitle")}</h3>
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
          <BookingTermsForm
            locale={locale as "en" | "de"}
            bookingId={booking.id}
            expectedVersion={booking.version}
            defaults={defaults}
          />
        ) : null}
      </div>

      {/* Documents package */}
      <div className="panel grid gap-5 p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            {t("sectionDocuments")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {t("documentsPackageBody")}
          </p>
        </div>

        <div className="grid gap-2">
          <h3 className="font-medium">{t("documentsAct")}</h3>
          {actAddenda.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {actAddenda.map((doc) => (
                <li key={doc.id}>
                  <span className="text-[var(--text-muted)]">
                    {t("addendumLabel", { n: doc.addendumNumber })} ·{" "}
                  </span>
                  <a
                    href={`/api/riders/${doc.id}`}
                    className="font-medium text-[var(--primary)]"
                  >
                    {docTitle(doc)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-2">
          <h3 className="font-medium">{t("documentsVenue")}</h3>
          {venueAddenda.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {venueAddenda.map((doc) => (
                <li key={doc.id}>
                  <span className="text-[var(--text-muted)]">
                    {t("addendumLabel", { n: doc.addendumNumber })} ·{" "}
                  </span>
                  <a
                    href={`/api/riders/${doc.id}`}
                    className="font-medium text-[var(--primary)]"
                  >
                    {docTitle(doc)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-2">
          <h3 className="font-medium">{t("documentsBooking")}</h3>
          {bookingAddenda.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {bookingAddenda.map((doc) => (
                <li key={doc.id}>
                  <span className="text-[var(--text-muted)]">
                    {t("addendumLabel", { n: doc.addendumNumber })} ·{" "}
                  </span>
                  <a
                    href={`/api/riders/${doc.id}`}
                    className="font-medium text-[var(--primary)]"
                  >
                    {docTitle(doc)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {isEntertainer ? (
            <BookingDocumentUpload
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              entertainerProfileId={booking.entertainerProfileId}
            />
          ) : null}
          {isVenue ? (
            <BookingDocumentUpload
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              venueId={booking.venueId}
            />
          ) : null}
        </div>
      </div>

      {/* Legal checklist + Agreement */}
      <div className="panel grid gap-4 p-6">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("sectionAgreement")}
        </h2>
        <div className="grid gap-2 border-[var(--info-soft)] bg-[var(--info-soft)]/50 p-4 text-sm">
          <h3 className="font-medium">{t("agreementNoticeTitle")}</h3>
          <p>{t("agreementNoticeBody")}</p>
          <p>
            <span className="font-semibold">{t("agreementNoticeDeLabel")}</span>
            {" · "}
            <span className="text-[var(--text-muted)]">
              {t("agreementNoticeEnLabel")}
            </span>
          </p>
        </div>

        <div className="grid gap-3 text-sm">
          <h3 className="font-medium">{t("legalChecklistTitle")}</h3>
          <p
            className={
              bothLegalComplete
                ? "text-[var(--primary)]"
                : "text-[var(--text-muted)]"
            }
          >
            {bothLegalComplete
              ? t("legalChecklistComplete")
              : t("legalChecklistIncomplete")}
          </p>
          {!bothLegalComplete ? (
            <p>
              <Link href="/account" className="underline">
                /account
              </Link>
            </p>
          ) : null}
          {ownLegal && isLegalIdentityComplete(ownLegal) ? (
            <div>
              <p className="font-medium">{t("legalOwnTitle")}</p>
              <p>
                {ownLegal.legalName} · {ownLegal.city}, {ownLegal.countryCode}
              </p>
            </div>
          ) : null}
          {revealCounterpartyLegal &&
          counterpartyLegal &&
          isLegalIdentityComplete(counterpartyLegal) ? (
            <div>
              <p className="font-medium">{t("legalCounterpartyTitle")}</p>
              {(() => {
                const view = publicLegalIdentityView(counterpartyLegal);
                return (
                  <p>
                    {view.legalName}
                    {view.tradingName ? ` (${view.tradingName})` : ""} ·{" "}
                    {view.addressLine1}, {view.postalCode} {view.city},{" "}
                    {view.countryCode}
                    {view.taxId ? ` · ${view.taxId}` : ""} · {view.invoiceEmail}
                    {view.hasPaymentInstructions
                      ? " · payment instructions on file"
                      : ""}
                  </p>
                );
              })()}
            </div>
          ) : !revealCounterpartyLegal ? (
            <p className="text-[var(--text-muted)]">
              {t("legalHiddenUntilTerms")}
            </p>
          ) : null}
        </div>

        {agreedTerms && canGenerate ? (
          <GenerateAgreementButton
            locale={locale as "en" | "de"}
            bookingId={booking.id}
            expectedVersion={booking.version}
            disabled={!bothLegalComplete}
            disabledReason={
              bothLegalComplete ? null : t("legalChecklistIncomplete")
            }
          />
        ) : null}

        {agreement ? (
          <div className="grid gap-4 border-t border-[var(--rule)] pt-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-medium">{t("agreementTitle")}</h3>
              <StatusLabel tone="warning">{t("sandboxBadge")}</StatusLabel>
            </div>
            <p className="text-[var(--text-muted)]">{t("sandboxBody")}</p>
            <p>
              {t("agreementStatus")}: {agreement.status} · {agreement.provider}
            </p>
            {agreement.addendaSnapshot &&
            agreement.addendaSnapshot.length > 0 ? (
              <ul className="grid gap-1">
                {agreement.addendaSnapshot.map((item) => (
                  <li key={`${item.id}-${item.addendumNumber}`}>
                    {t("addendumLabel", { n: item.addendumNumber })}:{" "}
                    {item.title}
                  </li>
                ))}
              </ul>
            ) : null}
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
              <p className="text-[var(--text-muted)]">
                {t("waitingSignatures")}
              </p>
            ) : (
              <p className="text-[var(--primary)]">{t("confirmedCalendars")}</p>
            )}
          </div>
        ) : null}

        {booking.state === "confirmed" ? (
          <div className="grid gap-3 border-t border-[var(--rule)] pt-4 text-sm">
            <h3 className="font-medium">{t("invoiceTitle")}</h3>
            <p className="text-[var(--text-muted)]">{t("invoiceBody")}</p>
            {invoice?.status === "generated" && invoice.blobKey ? (
              <p>
                {t("invoiceGenerated")} ·{" "}
                <a
                  href={`/api/invoices/${booking.id}`}
                  className="underline"
                >
                  {t("downloadInvoice")}
                </a>
              </p>
            ) : (
              <GenerateInvoiceButton
                locale={locale as "en" | "de"}
                bookingId={booking.id}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* Deposit */}
      <div className="panel grid gap-4 p-6">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("sectionDeposit")}
        </h2>
        <p className="border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-4 text-sm">
          {t("depositNotice")}
        </p>
        {showDeposit ? (
          <>
            <DepositStatusForm
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              currentStatus={booking.depositStatus}
            />
            {depositEvents.length > 0 ? (
              <ul className="grid gap-1 text-sm text-[var(--muted)]">
                {depositEvents.map((event) => (
                  <li key={event.id}>
                    {event.status}
                    {event.note ? ` — ${event.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-sm">
            {t("depositCurrent")}: {booking.depositStatus}
          </p>
        )}
      </div>

      {showCancel ? (
        <div className="panel p-6">
          <CancelBookingForm
            locale={locale as "en" | "de"}
            bookingId={booking.id}
            expectedVersion={booking.version}
          />
        </div>
      ) : null}

      {gigIsPast ? (
        <div className="panel p-6">
          {myPostGigSurvey ? (
            <PostGigSurveyForm
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              status={myPostGigSurvey.status as "invited" | "submitted"}
            />
          ) : (
            <div className="grid gap-2">
              <h3 className="text-lg font-medium">
                {t("postGigSurveyPendingTitle")}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {t("postGigSurveyPendingBody")}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
