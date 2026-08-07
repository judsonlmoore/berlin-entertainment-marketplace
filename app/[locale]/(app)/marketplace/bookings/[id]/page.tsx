import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  CancelBookingForm,
  BuildAgreementPackageButton,
  DownloadAgreementPackageButton,
  DownloadInvoiceButton,
  GenerateAgreementButton,
  GenerateInvoiceButton,
  SignAgreementForm,
} from "@/src/components/booking-actions";
import { BookingDocumentUpload } from "@/src/components/booking-document-upload";
import { BookingLifecycleTrack } from "@/src/components/booking-lifecycle-track";
import { BookingOffersPanel } from "@/src/components/booking-offers-panel";
import { DeleteBookingDocumentButton } from "@/src/components/delete-booking-document-button";
import {
  RespondDirectRequestButtons,
  VenueRespondToChangesButtons,
  WithdrawDirectRequestButton,
} from "@/src/components/direct-request-actions";
import { WithdrawProfileOfferButton } from "@/src/components/withdraw-profile-offer-button";
import { toDatetimeLocal } from "@/src/lib/format";
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";
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
  isOpenTermsOffer,
  resolveTermsOfferAction,
  type BookingParty,
  type BookingState,
} from "@/src/domain/booking";
import {
  bookingDocumentsLocked,
  canGenerateAgreement,
} from "@/src/domain/agreement";
import { isLegalIdentityComplete } from "@/src/domain/legal-identity";
import { bookingContactsUnlocked } from "@/src/domain/lead";
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

  const { booking, terms, agreement, invoice } = detail;
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

  // Prefer booking-party role over staff so staff who are also a party
  // can Accept / Counter / Decline their own offers.
  const party: BookingParty = isEntertainer
    ? "entertainer"
    : isVenue
      ? "venue"
      : "staff";

  const openTerms = terms.find((row) => isOpenTermsOffer(row)) ?? null;
  const agreedTerms = terms.find((row) => row.acceptedAt) ?? null;
  const offerHistory = terms.filter(
    (row) => row.acceptedAt || row.supersededAt,
  );
  const offerActionResolved =
    party === "venue" || party === "entertainer"
      ? resolveTermsOfferAction({
          bookingState: booking.state as BookingState,
          actorUserId: access.actor.userId,
          openOffer: openTerms
            ? {
                id: openTerms.id,
                proposedByUserId: openTerms.proposedByUserId,
              }
            : null,
          allowPendingOfferResponse:
            booking.originType === "profile_enquiry" &&
            (booking.state === "applied" || booking.state === "requested"),
        })
      : { kind: "none" as const };
  const canAccept =
    offerActionResolved.kind === "respond" &&
    Boolean(openTerms) &&
    (party === "venue" || party === "entertainer");
  const showCancel = canCancelBooking(booking.state as BookingState, party);
  const canGenerate =
    canGenerateAgreement(booking.state) &&
    (party === "venue" || party === "entertainer" || party === "staff");
  const elevateAgreement =
    Boolean(agreedTerms) &&
    (booking.state === "terms_agreed" ||
      booking.state === "agreement_generated" ||
      booking.state === "partially_signed" ||
      booking.state === "confirmed" ||
      Boolean(agreement));
  const documentsLocked = bookingDocumentsLocked(booking.state);
  const showOffersPanel =
    (party === "venue" || party === "entertainer") &&
    (offerActionResolved.kind !== "none" ||
      Boolean(openTerms) ||
      offerHistory.length > 0);
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
    bookingId: booking.id,
  });
  const venueDocuments = await listDocumentsVisibleToActor({
    actor: access.actor,
    venueId: booking.venueId,
    ownerUserId: booking.venueOwnerUserId,
    publicationState: booking.venuePublicationState,
    bookingId: booking.id,
  });
  const bookingScopedDocuments = await listDocumentsForBooking(booking.id);

  const entertainerLegal = await getLegalIdentityForUser(
    booking.entertainerUserId,
  );
  const venueLegal = await getLegalIdentityForUser(booking.venueOwnerUserId);
  const bothLegalComplete =
    isLegalIdentityComplete(entertainerLegal) &&
    isLegalIdentityComplete(venueLegal);
  const ownLegalComplete = isLegalIdentityComplete(
    isEntertainer ? entertainerLegal : isVenue ? venueLegal : null,
  );

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
  let directRequest: {
    id: string;
    state: string;
  } | null = null;

  if (booking.originType === "direct_request") {
    const request = await db.query.directRequests.findFirst({
      where: eq(directRequests.id, booking.originId),
    });
    if (request) {
      directRequest = { id: request.id, state: request.state };
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
  const declineEnquiryId =
    canRespondToEnquiry && enquiry && openTerms ? enquiry.id : null;

  const canWithdrawProfileOffer =
    Boolean(enquiry) &&
    enquiry!.state === "pending" &&
    enquiry!.submittedByUserId === access.actor.userId &&
    (booking.state === "applied" || booking.state === "requested");

  const contactsUnlocked = lead
    ? bookingContactsUnlocked(booking.state as BookingState)
    : false;

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
        <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
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
              "application" | "direct_request" | "profile_enquiry",
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

      {canRespondToEnquiry && enquiry && !openTerms ? (
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

      {directRequest &&
      isEntertainer &&
      (directRequest.state === "requested" ||
        directRequest.state === "changes_proposed") ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="text-lg font-medium">{t("pendingRequestTitle")}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {t("pendingRequestBody")}
          </p>
          <RespondDirectRequestButtons
            locale={locale as "en" | "de"}
            requestId={directRequest.id}
            state={directRequest.state}
          />
        </div>
      ) : null}

      {directRequest &&
      isVenue &&
      directRequest.state === "changes_proposed" ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="text-lg font-medium">{t("pendingRequestTitle")}</h2>
          <VenueRespondToChangesButtons
            locale={locale as "en" | "de"}
            requestId={directRequest.id}
            state={directRequest.state}
          />
        </div>
      ) : null}

      {contactsUnlocked && lead?.leadStatus === "open" ? (
        <p className="text-sm text-[var(--text-muted)]">{leadsT("openHint")}</p>
      ) : null}

      {/* Agreement elevated after terms lock (next primary action) */}
      {elevateAgreement ? (
        <div className="panel grid gap-4 p-6">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            {t("sectionAgreement")}
          </h2>
          {canGenerate && !agreement ? (
            <div className="grid gap-3 text-sm">
              <p className="text-[var(--text-muted)]">{t("nextGenerate")}</p>
              <GenerateAgreementButton
                locale={locale as "en" | "de"}
                bookingId={booking.id}
                expectedVersion={booking.version}
                disabled={!bothLegalComplete}
                disabledReason={
                  bothLegalComplete ? null : t("legalRequiredToGenerate")
                }
              />
            </div>
          ) : null}
          {agreement ? (
            <div className="grid gap-4 text-sm">
              <div className="grid gap-2 border-[var(--info-soft)] bg-[var(--info-soft)]/50 p-4">
                <h3 className="font-medium">{t("agreementNoticeTitle")}</h3>
                <p>{t("agreementNoticeBody")}</p>
                <p>
                  <span className="font-semibold">
                    {t("agreementNoticeDeLabel")}
                  </span>
                  {" · "}
                  <span className="text-[var(--text-muted)]">
                    {t("agreementNoticeEnLabel")}
                  </span>
                </p>
              </div>
              <h3 className="text-lg font-medium">{t("agreementTitle")}</h3>
              <p>
                {t("agreementStatus")}: {agreement.status} ·{" "}
                {agreement.provider}
              </p>
              {agreement.packageFingerprint ? (
                <p className="font-mono text-xs text-[var(--text-muted)]">
                  {t("packageFingerprint")}:{" "}
                  {agreement.packageFingerprint.slice(0, 16)}…
                  {agreement.packagePageCount
                    ? ` · ${t("packagePages", { count: agreement.packagePageCount })}`
                    : ""}
                </p>
              ) : null}
              {agreement.packagePdfBlobKey ? (
                <div className="flex flex-wrap items-start gap-3">
                  <DownloadAgreementPackageButton agreementId={agreement.id} />
                  {!agreement.signatures.some((s) => s.status === "signed") ? (
                    <BuildAgreementPackageButton
                      locale={locale as "en" | "de"}
                      bookingId={booking.id}
                      agreementId={agreement.id}
                      force
                    />
                  ) : null}
                </div>
              ) : (
                <BuildAgreementPackageButton
                  locale={locale as "en" | "de"}
                  bookingId={booking.id}
                  agreementId={agreement.id}
                />
              )}
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
              {canSign ? (
                <SignAgreementForm
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
                <p className="text-[var(--primary)]">
                  {t("confirmedCalendars")}
                </p>
              )}
            </div>
          ) : null}

          {booking.state === "confirmed" ? (
            <div
              className={`grid gap-3 text-sm ${
                agreement ? "border-t border-[var(--rule)] pt-4" : ""
              }`}
            >
              <h3 className="font-medium">{t("invoiceTitle")}</h3>
              <p className="text-[var(--text-muted)]">{t("invoiceBody")}</p>
              {invoice?.status === "generated" && invoice.blobKey ? (
                <div className="grid gap-3">
                  <p className="text-[var(--text-muted)]">
                    {t("invoiceGenerated")}
                  </p>
                  <div className="flex flex-wrap items-start gap-3">
                    <DownloadInvoiceButton bookingId={booking.id} />
                    <GenerateInvoiceButton
                      locale={locale as "en" | "de"}
                      bookingId={booking.id}
                      force
                    />
                  </div>
                </div>
              ) : (
                <GenerateInvoiceButton
                  locale={locale as "en" | "de"}
                  bookingId={booking.id}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {!elevateAgreement && showOffersPanel ? (
        <BookingOffersPanel
          locale={locale as "en" | "de"}
          bookingId={booking.id}
          expectedVersion={booking.version}
          entertainerUserId={booking.entertainerUserId}
          offerAction={offerActionResolved.kind}
          openOffer={openTerms}
          history={offerHistory}
          defaults={defaults}
          canAccept={Boolean(canAccept)}
          ownLegalComplete={ownLegalComplete}
          declineEnquiryId={declineEnquiryId}
          bookingClosedWithoutAccept={
            booking.state === "declined" ||
            booking.state === "rejected" ||
            booking.state === "expired" ||
            booking.state === "withdrawn" ||
            booking.state === "cancelled"
          }
        />
      ) : null}

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
          <p className="text-sm text-[var(--text-muted)]">
            {documentsLocked
              ? t("documentsLockedBody")
              : t("documentsBookingHint")}
          </p>
          {bookingAddenda.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {bookingAddenda.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-3">
                  <span>
                    <span className="text-[var(--text-muted)]">
                      {t("addendumLabel", { n: doc.addendumNumber })} ·{" "}
                    </span>
                    <a
                      href={`/api/riders/${doc.id}`}
                      className="font-medium text-[var(--primary)]"
                    >
                      {docTitle(doc)}
                    </a>
                  </span>
                  {!documentsLocked &&
                  doc.ownerUserId === access.actor.userId ? (
                    <DeleteBookingDocumentButton
                      locale={locale as "en" | "de"}
                      bookingId={booking.id}
                      documentId={doc.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {!documentsLocked && isEntertainer ? (
            <BookingDocumentUpload
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              entertainerProfileId={booking.entertainerProfileId}
            />
          ) : null}
          {!documentsLocked && isVenue ? (
            <BookingDocumentUpload
              locale={locale as "en" | "de"}
              bookingId={booking.id}
              venueId={booking.venueId}
            />
          ) : null}
        </div>
      </div>

      {elevateAgreement && showOffersPanel ? (
        <BookingOffersPanel
          locale={locale as "en" | "de"}
          bookingId={booking.id}
          expectedVersion={booking.version}
          entertainerUserId={booking.entertainerUserId}
          offerAction={offerActionResolved.kind}
          openOffer={openTerms}
          history={offerHistory}
          defaults={defaults}
          canAccept={Boolean(canAccept)}
          ownLegalComplete={ownLegalComplete}
          declineEnquiryId={declineEnquiryId}
          bookingClosedWithoutAccept={
            booking.state === "declined" ||
            booking.state === "rejected" ||
            booking.state === "expired" ||
            booking.state === "withdrawn" ||
            booking.state === "cancelled"
          }
        />
      ) : null}

      {showCancel ? (
        <CancelBookingForm
          locale={locale as "en" | "de"}
          bookingId={booking.id}
          expectedVersion={booking.version}
        />
      ) : canWithdrawProfileOffer && enquiry ? (
        <div className="panel grid gap-4 p-6">
          <div className="border-l-4 border-[var(--danger)] pl-4">
            <h2 className="page-title text-xl text-[var(--danger)]">
              {t("dangerZoneTitle")}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("withdrawOfferBody")}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--warning-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              {t("withdrawOfferTitle")}
            </h3>
            <p className="mt-2 text-sm text-[var(--ink)]">
              {t("withdrawOfferHint")}
            </p>
            <div className="mt-4">
              <WithdrawProfileOfferButton
                locale={locale as "en" | "de"}
                enquiryId={enquiry.id}
              />
            </div>
          </div>
        </div>
      ) : directRequest &&
        isVenue &&
        (directRequest.state === "requested" ||
          directRequest.state === "changes_proposed") ? (
        <div className="panel grid gap-4 p-6">
          <div className="border-l-4 border-[var(--danger)] pl-4">
            <h2 className="page-title text-xl text-[var(--danger)]">
              {t("dangerZoneTitle")}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("withdrawRequestBody")}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--warning-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              {t("withdrawRequestTitle")}
            </h3>
            <p className="mt-2 text-sm text-[var(--ink)]">
              {t("withdrawRequestHint")}
            </p>
            <div className="mt-4">
              <WithdrawDirectRequestButton
                locale={locale as "en" | "de"}
                requestId={directRequest.id}
                state={directRequest.state}
              />
            </div>
          </div>
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
