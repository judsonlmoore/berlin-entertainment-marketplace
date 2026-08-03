import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listBookingsForActor } from "@/src/db/queries/bookings";
import { getEntertainerProfileForUser } from "@/src/db/queries/profiles";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function BookingsPage({ params }: Props) {
  const { locale } = await params;
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

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="text-sm">
          <Link href="/marketplace">{market("back")}</Link>
        </p>
        <h1 className="display mt-3 text-4xl">{t("title")}</h1>
        <p className="mt-3 text-[var(--muted)]">{t("body")}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/marketplace/bookings/${row.id}`}
                className="panel block p-4 no-underline"
              >
                <p className="font-medium">
                  {row.actName} · {row.venueName}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {row.originType} · {row.state} · {t("depositCurrent")}:{" "}
                  {row.depositStatus}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
