import { getTranslations, setRequestLocale } from "next-intl/server";
import { Avatar } from "@/src/components/ui/monogram";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listBookingsForActor } from "@/src/db/queries/bookings";
import { getEntertainerProfileForUser } from "@/src/db/queries/profiles";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

function bookingTone(
  state: string,
): "neutral" | "success" | "warning" | "info" | "danger" {
  if (state === "confirmed" || state === "terms_agreed") return "success";
  if (state === "cancelled" || state === "rejected" || state === "declined") {
    return "danger";
  }
  if (state === "partially_signed" || state === "agreement_generated") {
    return "warning";
  }
  return "info";
}

export default async function BookingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bookings");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok || !can(access.actor, "booking.view")) {
    return (
      <section className="mx-auto max-w-xl">
        <PageHeader title={t("title")} body={market("denied")} />
      </section>
    );
  }

  const venueIds = access.actor.venueMemberships
    .filter((m) => m.status === "active")
    .map((m) => m.venueId);
  const entertainerProfile = await getEntertainerProfileForUser(
    access.actor.userId,
  );
  const rows = await listBookingsForActor({
    userId: access.actor.userId,
    venueIds,
    entertainerProfileId: entertainerProfile?.id ?? null,
  });

  const active = rows.filter(
    (row) =>
      !["cancelled", "declined", "rejected", "withdrawn", "expired"].includes(
        row.state,
      ) && row.state !== "confirmed",
  );
  const confirmed = rows.filter((row) => row.state === "confirmed");
  const past = rows.filter((row) =>
    ["cancelled", "declined", "rejected", "withdrawn", "expired"].includes(
      row.state,
    ),
  );

  const tabs = [
    { id: "active", label: t("tabActive"), count: active.length, rows: active },
    {
      id: "confirmed",
      label: t("tabConfirmed"),
      count: confirmed.length,
      rows: confirmed,
    },
    { id: "past", label: t("tabPast"), count: past.length, rows: past },
  ];

  return (
    <section className="grid gap-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} body={t("body")} />

      <p className="panel border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-4 text-sm">
        {t("depositNotice")}
      </p>

      {tabs.map((tab) => (
        <div key={tab.id} className="grid gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            {tab.label}{" "}
            <span className="tabular text-[var(--terracotta)]">
              ({tab.count})
            </span>
          </h2>
          {tab.rows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>
          ) : (
            <ul className="grid gap-3">
              {tab.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/marketplace/bookings/${row.id}`}
                    className="panel flex flex-col gap-3 p-4 no-underline sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={row.actName} size={44} />
                      <Avatar name={row.venueName} size={44} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {row.actName} · {row.venueName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {row.originType} · {row.id.slice(0, 8)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusLabel tone={bookingTone(row.state)}>
                          {row.state}
                        </StatusLabel>
                        <StatusLabel>
                          {t("depositCurrent")}: {row.depositStatus}
                        </StatusLabel>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--primary)]">
                      {t("open")} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
