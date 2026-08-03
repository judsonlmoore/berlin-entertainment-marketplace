import { getTranslations, setRequestLocale } from "next-intl/server";
import { DateTile, PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { getOverviewMetrics } from "@/src/db/queries/overview";
import { listOpenOpportunities } from "@/src/db/queries/opportunities";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

function formatRange(min: number | null, max: number | null, locale: string) {
  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  if (min === null && max === null) return "—";
  if (min !== null && max !== null) {
    return `${fmt.format(min / 100)} – ${fmt.format(max / 100)}`;
  }
  if (min !== null) return `${fmt.format(min / 100)}+`;
  return `≤ ${fmt.format((max as number) / 100)}`;
}

export default async function OpportunitiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("opportunities");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <PageHeader title={t("listTitle")} body={market("denied")} />
      </section>
    );
  }

  const metrics = await getOverviewMetrics(access.actor);
  const venueIds = access.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);
  const canBrowseOpenOps = can(access.actor, "discover.venues");
  const rows = (
    await listOpenOpportunities({
      viewerVenueIds: venueIds,
      entertainerProfileId: metrics.entertainerProfileId,
    })
  ).filter((row) => {
    if (access.actor.isPlatformStaff || canBrowseOpenOps) return true;
    return venueIds.includes(row.venueId);
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });
  const deadlineFmt = new Intl.DateTimeFormat(
    locale === "de" ? "de-DE" : "en-GB",
    {
      dateStyle: "medium",
      timeZone: "Europe/Berlin",
    },
  );

  return (
    <section className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow={market("accessEyebrow")}
          title={t("listTitle")}
          body={t("listBody")}
        />
        {metrics.canPostOpportunity && metrics.firstVenueId ? (
          <Link
            href={`/profile/venues/${metrics.firstVenueId}`}
            className="inline-flex min-h-11 shrink-0 items-center bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)] no-underline"
          >
            {market("postOpportunity")}
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="panel p-6 text-[var(--text-muted)]">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/marketplace/opportunities/${row.id}`}
                className="panel flex flex-col gap-4 p-4 no-underline sm:flex-row sm:items-center"
              >
                <DateTile date={row.startsAt} locale={locale} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusLabel tone="info">{t("stateOpen")}</StatusLabel>
                    {row.ownApplicationState ? (
                      <StatusLabel tone="warning">
                        {t("yourState", { state: row.ownApplicationState })}
                      </StatusLabel>
                    ) : null}
                    <span className="text-xs tracking-[0.12em] text-[var(--text-muted)] uppercase">
                      {row.formatCategory}
                    </span>
                    {row.actSizeMin != null || row.actSizeMax != null ? (
                      <span className="text-xs text-[var(--text-muted)]">
                        {t("actSizeTag", {
                          min: row.actSizeMin ?? "—",
                          max: row.actSizeMax ?? "—",
                        })}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="display mt-2 text-2xl leading-tight">
                    {row.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {row.venueName} · {row.district}
                  </p>
                  <p className="tabular mt-2 text-sm">
                    {dateFmt.format(row.startsAt)} –{" "}
                    {dateFmt.format(row.endsAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <p className="tabular">
                      {t("budget")}:{" "}
                      {formatRange(
                        row.budgetMinCents,
                        row.budgetMaxCents,
                        locale,
                      )}
                    </p>
                    {row.applicationDeadline ? (
                      <p className="tabular text-[var(--text-muted)]">
                        {t("deadlineLabel")}:{" "}
                        {deadlineFmt.format(row.applicationDeadline)}
                      </p>
                    ) : null}
                    {row.canSeeApplicationCount ? (
                      <p className="tabular text-[var(--text-muted)]">
                        {t("applicationCount", {
                          count: row.applicationCount,
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="text-sm text-[var(--primary)] sm:self-center">
                  {row.ownApplicationState ? t("view") : t("viewOrApply")} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
