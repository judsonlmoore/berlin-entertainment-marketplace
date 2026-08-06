import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  RespondDirectRequestButtons,
  VenueRespondToChangesButtons,
  WithdrawDirectRequestButton,
} from "@/src/components/direct-request-actions";
import { ProfileEnquiryRespondButtons } from "@/src/components/profile-enquiry-actions";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listLeadsForActor } from "@/src/db/queries/leads";
import {
  listProfileEnquiriesForEntertainer,
  listProfileEnquiriesForVenues,
} from "@/src/db/queries/profile-enquiries";
import {
  listDirectRequestsForEntertainer,
  listDirectRequestsForVenues,
} from "@/src/db/queries/direct-requests";
import { can } from "@/src/domain/permissions";
import type { LeadStatus } from "@/src/domain/lead";
import { Link } from "@/src/i18n/navigation";
import { formatEur } from "@/src/lib/format";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS: Array<LeadStatus | "all"> = [
  "all",
  "pending",
  "open",
  "won",
  "lost",
  "completed",
];

export default async function BookingsInboxPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bookings");
  const leadsT = await getTranslations("leads");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();
  const query = await searchParams;
  const statusRaw = first(query.status) ?? "all";
  const statusFilter = (
    STATUS_FILTERS.includes(statusRaw as LeadStatus | "all") ? statusRaw : "all"
  ) as LeadStatus | "all";

  if (!access.ok || !can(access.actor, "booking.view")) {
    return (
      <section className="grid gap-8">
        <PageHeader title={t("title")} body={market("denied")} />
      </section>
    );
  }

  const operableVenueIds = access.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);

  const [leads, incomingEnquiries, outgoingEnquiries, incomingDr, outgoingDr] =
    await Promise.all([
      listLeadsForActor(access.actor, {
        status: statusFilter,
      }),
      operableVenueIds.length > 0
        ? listProfileEnquiriesForVenues(operableVenueIds)
        : Promise.resolve([]),
      access.actor.roles.includes("entertainer")
        ? listProfileEnquiriesForEntertainer(access.actor.userId)
        : Promise.resolve([]),
      can(access.actor, "direct_request.respond")
        ? listDirectRequestsForEntertainer(access.actor.userId)
        : Promise.resolve([]),
      operableVenueIds.length > 0
        ? listDirectRequestsForVenues(operableVenueIds)
        : Promise.resolve([]),
    ]);

  const pendingVenueEnquiries = incomingEnquiries.filter(
    (e) => e.state === "pending",
  );

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="grid gap-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} body={t("body")} />

      <p className="panel border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-4 text-sm">
        {t("depositNotice")}
      </p>

      {access.actor.roles.includes("entertainer") &&
      !access.actor.entertainerVerified ? (
        <p className="panel p-6 text-sm text-[var(--text-muted)]">
          {market("verificationContactLocked")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => {
          const href =
            status === "all"
              ? "/marketplace/bookings"
              : `/marketplace/bookings?status=${status}`;
          const active = statusFilter === status;
          return (
            <Link
              key={status}
              href={href}
              className={`inline-flex min-h-9 items-center border px-3 text-xs no-underline ${
                active
                  ? "border-[var(--terracotta)] bg-[var(--terracotta)]/10"
                  : "border-[var(--rule)]"
              }`}
            >
              {leadsT(`status.${status}`)}
            </Link>
          );
        })}
      </div>

      {pendingVenueEnquiries.length > 0 ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="page-title text-xl">
            {leadsT("pendingEnquiriesTitle")}
          </h2>
          <ul className="grid gap-3">
            {pendingVenueEnquiries.map((enquiry) => (
              <li
                key={enquiry.id}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <p className="font-medium">
                  {enquiry.actName} → {enquiry.venueName}
                </p>
                {enquiry.note ? (
                  <p className="mt-1 text-[var(--text-muted)]">
                    {enquiry.note}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/marketplace/entertainers/${enquiry.entertainerProfileId}`}
                    className="text-sm font-medium underline"
                  >
                    {leadsT("viewActProfile")}
                  </Link>
                  {enquiry.bookingId ? (
                    <Link
                      href={`/marketplace/bookings/${enquiry.bookingId}`}
                      className="text-sm font-medium underline"
                    >
                      {t("open")}
                    </Link>
                  ) : null}
                  <ProfileEnquiryRespondButtons
                    locale={locale as "en" | "de"}
                    enquiryId={enquiry.id}
                    state={enquiry.state}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="panel grid gap-3 p-6">
        <h2 className="page-title text-xl">{t("pipelineTitle")}</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3">
            {leads.map((lead) => (
              <li
                key={lead.bookingId}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {lead.actName} · {lead.venueName}
                    </p>
                    <p className="text-[var(--text-muted)]">
                      {leadsT(`channel.${lead.originType}`)} ·{" "}
                      {leadsT(`direction.${lead.direction}`)}
                      {lead.summary ? ` · ${lead.summary}` : ""}
                    </p>
                    {lead.performanceStartsAt ? (
                      <p className="mt-1">
                        {dateFmt.format(lead.performanceStartsAt)}
                        {lead.performanceEndsAt
                          ? ` – ${dateFmt.format(lead.performanceEndsAt)}`
                          : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-[var(--text-muted)]">
                        {leadsT("noDateYet")}
                      </p>
                    )}
                  </div>
                  <StatusLabel>
                    {leadsT(`status.${lead.leadStatus}`)}
                  </StatusLabel>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/marketplace/bookings/${lead.bookingId}`}
                    className="font-medium underline"
                  >
                    {t("open")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {can(access.actor, "direct_request.respond") ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="page-title text-xl">
            {leadsT("incomingRequestsTitle")}
          </h2>
          {incomingDr.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {leadsT("emptyIncomingRequests")}
            </p>
          ) : null}
          <ul className="grid gap-3">
            {incomingDr.map((request) => (
              <li
                key={request.id}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <p className="font-medium">
                  {request.venueName} · {request.district}
                </p>
                <p className="text-[var(--text-muted)]">
                  {request.formatCategory} · {request.state}
                </p>
                <p className="mt-2">
                  {dateFmt.format(request.startsAt)} –{" "}
                  {dateFmt.format(request.endsAt)}
                </p>
                <p>
                  {leadsT("proposedFee")}:{" "}
                  {formatEur(request.proposedFeeCents, locale)}
                </p>
                <div className="mt-3">
                  <RespondDirectRequestButtons
                    locale={locale as "en" | "de"}
                    requestId={request.id}
                    state={request.state}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {operableVenueIds.length > 0 ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="page-title text-xl">
            {leadsT("outgoingRequestsTitle")}
          </h2>
          {outgoingDr.length === 0 && outgoingEnquiries.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {leadsT("emptyOutgoingRequests")}
            </p>
          ) : null}
          <ul className="grid gap-3">
            {outgoingDr.map((request) => (
              <li
                key={request.id}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <p className="font-medium">
                  {request.actName} ← {request.venueName}
                </p>
                <p className="text-[var(--text-muted)]">
                  {request.formatCategory} · {request.state}
                </p>
                <div className="mt-3">
                  <WithdrawDirectRequestButton
                    locale={locale as "en" | "de"}
                    requestId={request.id}
                    state={request.state}
                  />
                  <VenueRespondToChangesButtons
                    locale={locale as "en" | "de"}
                    requestId={request.id}
                    state={request.state}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
