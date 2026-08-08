import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listLeadsForActor } from "@/src/db/queries/leads";
import { can } from "@/src/domain/permissions";
import {
  LEAD_STATUSES,
  normalizeLeadStatusFilter,
  type BookingNeedsAction,
  type LeadStatus,
} from "@/src/domain/lead";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS: Array<LeadStatus | "all"> = [...LEAD_STATUSES, "all"];

function needsActionMessageKey(action: BookingNeedsAction): string {
  switch (action) {
    case "respond_offer":
      return "needsActionRespondOffer";
    case "respond_request":
      return "needsActionRespondRequest";
    case "sign":
      return "needsActionSign";
    case "review_application":
      return "needsActionReviewApplication";
  }
}

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
  const statusFilter = normalizeLeadStatusFilter(first(query.status));

  if (!access.ok || !can(access.actor, "booking.view")) {
    return (
      <section className="grid gap-8">
        <PageHeader title={t("title")} body={market("denied")} />
      </section>
    );
  }

  const leads = await listLeadsForActor(access.actor, {
    status: statusFilter,
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="grid gap-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} body={t("body")} />

      {access.actor.roles.includes("entertainer") &&
      !access.actor.entertainerVerified ? (
        <p className="panel p-6 text-sm text-[var(--text-muted)]">
          {market("verificationContactLocked")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => {
          const href =
            status === "open"
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

      <div className="panel grid gap-3 p-6">
        <h2 className="page-title text-xl">{t("pipelineTitle")}</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {statusFilter === "all" || statusFilter === "open"
              ? t("empty")
              : t("emptyFiltered", {
                  status: leadsT(`status.${statusFilter}`),
                })}
          </p>
        ) : (
          <ul className="grid gap-3">
            {leads.map((lead) => (
              <li
                key={lead.bookingId}
                className="border border-[var(--rule)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
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
                    {lead.needsAction ? (
                      <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-[var(--ochre-soft)]">
                        <span
                          className="size-2 shrink-0 rounded-full bg-[var(--ochre-soft)]"
                          aria-hidden="true"
                        />
                        {leadsT(needsActionMessageKey(lead.needsAction))}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusLabel
                      tone={
                        lead.leadStatus === "confirmed"
                          ? "success"
                          : lead.leadStatus === "done"
                            ? "info"
                            : lead.leadStatus === "lost"
                              ? "danger"
                              : "warning"
                      }
                    >
                      {leadsT(`status.${lead.leadStatus}`)}
                    </StatusLabel>
                    <Link
                      href={`/marketplace/bookings/${lead.bookingId}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--primary)] bg-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary-foreground)] no-underline"
                    >
                      {t("view")}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
