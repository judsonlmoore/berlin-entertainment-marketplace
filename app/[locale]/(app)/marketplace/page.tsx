import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Avatar } from "@/src/components/ui/monogram";
import { BookingLifecycleTrack } from "@/src/components/booking-lifecycle-track";
import { Eyebrow } from "@/src/components/ui/eyebrow";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import {
  getNextActiveBooking,
  getOverviewMetrics,
  listRecentApplicationsForVenues,
} from "@/src/db/queries/overview";
import { Link } from "@/src/i18n/navigation";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";
import { auth } from "@/src/auth";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta");

  return buildPrivateMetadata({
    locale: locale as AppLocale,
    title: t("marketplaceTitle"),
    description: t("marketplaceDescription"),
  });
}

export default async function MarketplacePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();
  const session = await auth();
  const name = session?.user?.name?.split(" ")[0] ?? "there";

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("title")}</h1>
        <p className="mt-4 font-medium text-[var(--text-muted)]">
          {t("denied")}
        </p>
      </section>
    );
  }

  const venueIds = access.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);
  const metrics = await getOverviewMetrics(access.actor);
  const recentApps = await listRecentApplicationsForVenues(venueIds, 5);
  const nextBooking = await getNextActiveBooking({
    venueIds,
    entertainerProfileId: metrics.entertainerProfileId,
  });

  const now = new Date();
  const dateEyebrow = new Intl.DateTimeFormat(
    locale === "de" ? "de-DE" : "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Berlin",
    },
  ).format(now);

  const relative = new Intl.RelativeTimeFormat(locale === "de" ? "de" : "en", {
    numeric: "auto",
  });
  const nowMs = now.getTime();

  function relativeFrom(date: Date) {
    const deltaMin = Math.round((date.getTime() - nowMs) / 60000);
    if (Math.abs(deltaMin) < 60) return relative.format(deltaMin, "minute");
    const deltaHr = Math.round(deltaMin / 60);
    if (Math.abs(deltaHr) < 48) return relative.format(deltaHr, "hour");
    return relative.format(Math.round(deltaHr / 24), "day");
  }

  return (
    <section className="grid gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>{dateEyebrow}</Eyebrow>
          <h1 className="page-title mt-2 text-[clamp(1.75rem,2.5vw,2.25rem)]">
            {t("greeting", { name })}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium text-[var(--text-muted)] sm:text-base">
            {t("body")}
          </p>
        </div>
        {metrics.canPostOpportunity && metrics.firstVenueId ? (
          <Link
            href={`/profile/venues/${metrics.firstVenueId}`}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] no-underline"
          >
            {t("postOpportunity")}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            [
              t("metricOpenOps"),
              metrics.openOpportunities,
              t("metricOpenOpsHint", { count: metrics.pendingApplications }),
            ],
            [
              t("metricRequests"),
              metrics.pendingRequests,
              t("metricRequestsHint"),
            ],
            [
              t("metricActiveBookings"),
              metrics.activeBookings,
              t("metricActiveBookingsHint"),
            ],
            [
              t("metricConfirmed"),
              metrics.confirmedBookings,
              t("metricConfirmedHint"),
            ],
          ] as const
        ).map(([label, value, hint]) => (
          <div key={label} className="panel p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-[var(--text-muted)] uppercase">
              {label}
            </p>
            <p className="page-title tabular mt-2 text-3xl leading-none sm:text-4xl">
              {value}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="page-title text-xl">{t("recentApplications")}</h2>
          {recentApps.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t("recentApplicationsEmpty")}
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {recentApps.map((app) => (
                <li
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={app.actName} size={40} />
                    <div>
                      <p className="font-medium">{app.actName}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {app.opportunityTitle} · {relativeFrom(app.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/marketplace/opportunities/${app.opportunityId}`}
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm font-semibold no-underline"
                  >
                    {t("reviewApplication")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="page-title text-xl">{t("nextBooking")}</h2>
          {!nextBooking ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t("nextBookingEmpty")}
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              <div>
                <p className="font-medium">
                  {nextBooking.actName} · {nextBooking.venueName}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {nextBooking.district}
                </p>
                <div className="mt-2">
                  <StatusLabel>{nextBooking.state}</StatusLabel>
                </div>
              </div>
              <BookingLifecycleTrack state={nextBooking.state} />
              <Link
                href={`/marketplace/bookings/${nextBooking.id}`}
                className="text-sm text-[var(--primary)]"
              >
                {t("viewBooking")} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
