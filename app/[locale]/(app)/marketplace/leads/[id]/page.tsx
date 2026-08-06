import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LeadProposalForm } from "@/src/components/lead-proposal-form";
import { ProfileEnquiryRespondButtons } from "@/src/components/profile-enquiry-actions";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { getLeadByBookingId } from "@/src/db/queries/leads";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";
import { formatEur } from "@/src/lib/format";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function toDatetimeLocalValue(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // Display in Europe/Berlin-ish local via UTC offset approximation for form defaults
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function LeadDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leads");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="grid gap-8">
        <PageHeader title={t("title")} body={market("denied")} />
      </section>
    );
  }

  const lead = await getLeadByBookingId({
    bookingId: id,
    actor: access.actor,
  });
  if (!lead || !lead.venue || !lead.act) {
    notFound();
  }

  const enquiry =
    lead.booking.originType === "profile_enquiry" &&
    lead.originDetail.enquiry &&
    typeof lead.originDetail.enquiry === "object"
      ? (lead.originDetail.enquiry as {
          id: string;
          state: string;
          note: string | null;
          proposedStartsAt: Date | null;
          proposedEndsAt: Date | null;
          proposedFeeCents: number | null;
          proposedFormat: string | null;
        })
      : null;

  const canEditProposal =
    enquiry &&
    (enquiry.state === "interested" || enquiry.state === "pending") &&
    (lead.leadStatus === "open" || lead.leadStatus === "pending");

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <div>
        <p className="text-sm">
          <Link href="/marketplace/requests" className="underline">
            {t("backToLeads")}
          </Link>
        </p>
        <PageHeader
          eyebrow={t(`channel.${lead.booking.originType}`)}
          title={`${lead.act.actName} · ${lead.venue.name}`}
          body={t("detailBody")}
        />
        <div className="mt-3">
          <StatusLabel>{t(`status.${lead.leadStatus}`)}</StatusLabel>
        </div>
      </div>

      <div className="panel grid gap-3 p-6 text-sm">
        <p>
          <span className="font-medium">{t("parties")}:</span>{" "}
          {lead.act.actName} ↔ {lead.venue.name}
          {lead.venue.district ? ` (${lead.venue.district})` : ""}
        </p>
        <p>
          <span className="font-medium">{t("bookingState")}:</span>{" "}
          {lead.booking.state}
        </p>
        {lead.performanceStartsAt ? (
          <p>
            <span className="font-medium">{t("window")}:</span>{" "}
            {dateFmt.format(lead.performanceStartsAt)}
            {lead.performanceEndsAt
              ? ` – ${dateFmt.format(lead.performanceEndsAt)}`
              : ""}
          </p>
        ) : (
          <p className="text-[var(--text-muted)]">{t("noDateYet")}</p>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/marketplace/entertainers/${lead.act.id}`}
            className="underline"
          >
            {t("viewActProfile")}
          </Link>
          <Link
            href={`/marketplace/venues/${lead.venue.id}`}
            className="underline"
          >
            {t("viewVenueProfile")}
          </Link>
          <Link
            href={`/marketplace/bookings/${lead.booking.id}`}
            className="underline"
          >
            {t("viewBooking")}
          </Link>
        </div>
      </div>

      {enquiry?.state === "pending" &&
      can(access.actor, "profile_enquiry.respond", {
        venueId: lead.venue.id,
      }) ? (
        <div className="panel grid gap-3 p-6">
          <h2 className="text-lg font-medium">{t("respondTitle")}</h2>
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
              proposedStartsAt: toDatetimeLocalValue(enquiry.proposedStartsAt),
              proposedEndsAt: toDatetimeLocalValue(enquiry.proposedEndsAt),
            }}
          />
          {enquiry.proposedFeeCents != null ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t("proposedFee")}: {formatEur(enquiry.proposedFeeCents, locale)}
            </p>
          ) : null}
        </div>
      ) : null}

      {lead.leadStatus === "open" ? (
        <p className="text-sm text-[var(--text-muted)]">{t("openHint")}</p>
      ) : null}
    </section>
  );
}
