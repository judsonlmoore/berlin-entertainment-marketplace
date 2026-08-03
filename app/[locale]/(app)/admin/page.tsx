import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { ExpireHoldsButton } from "@/src/components/admin-expire-holds";
import { ApprovalForm } from "@/src/components/approval-form";
import { StaffProfileReviewForm } from "@/src/components/staff-profile-review-form";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { getAdminOperationsSnapshot } from "@/src/db/queries/admin-ops";
import { listProfilesForStaffReview } from "@/src/db/queries/profiles";
import { users } from "@/src/db/schema";
import { marketplaceAccounts } from "@/src/db/schema/marketplace";
import type { ApprovalState } from "@/src/domain/approval";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const status = await getTranslations("status");
  const publication = await getTranslations("publication");
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section>
        <PageHeader title={t("title")} body={t("denied")} />
      </section>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <section>
        <PageHeader title={t("title")} body="DATABASE_URL is not configured." />
      </section>
    );
  }

  const actor = await getActorContext(session.user.id);
  if (
    !actor ||
    (!can(actor, "admin.review_accounts") &&
      !can(actor, "admin.review_profiles") &&
      !can(actor, "admin.operations"))
  ) {
    return (
      <section>
        <PageHeader title={t("title")} body={t("denied")} />
      </section>
    );
  }

  const db = getDb();
  const accounts = can(actor, "admin.review_accounts")
    ? await db
        .select({
          id: marketplaceAccounts.id,
          approvalState: marketplaceAccounts.approvalState,
          berlinConnection: marketplaceAccounts.berlinConnection,
          reviewReason: marketplaceAccounts.reviewReason,
          userName: users.name,
          userEmail: users.email,
        })
        .from(marketplaceAccounts)
        .innerJoin(users, eq(users.id, marketplaceAccounts.userId))
        .orderBy(desc(marketplaceAccounts.createdAt))
    : [];

  const profiles = can(actor, "admin.review_profiles")
    ? await listProfilesForStaffReview()
    : { entertainers: [], venues: [] };

  const ops = can(actor, "admin.operations")
    ? await getAdminOperationsSnapshot()
    : null;

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="mx-auto grid max-w-4xl gap-12">
      <PageHeader title={t("title")} body={t("body")} />

      {ops ? (
        <div className="grid gap-6">
          <div>
            <h2 className="display text-2xl">{t("opsTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("opsBody")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [t("metricBookings"), ops.metrics.bookings],
                [t("metricUnlocks"), ops.metrics.unlocks],
                [t("metricAudits"), ops.metrics.auditsLast7Days],
                [t("metricExpiredHolds"), ops.metrics.expiredHolds],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="panel p-4">
                <p className="text-xs tracking-[0.12em] text-[var(--text-muted)] uppercase">
                  {label}
                </p>
                <p className="tabular mt-2 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <ExpireHoldsButton locale={locale as "en" | "de"} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel grid gap-3 p-5">
              <h3 className="font-semibold">{t("bookingsTitle")}</h3>
              {ops.recentBookings.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("opsEmpty")}
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {ops.recentBookings.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Link href={`/marketplace/bookings/${row.id}`}>
                        {row.actName} · {row.venueName}
                      </Link>
                      <StatusLabel>{row.state}</StatusLabel>
                      <span className="text-[var(--text-muted)]">
                        {t("deposit")}: {row.depositStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel grid gap-3 p-5">
              <h3 className="font-semibold">{t("unlocksTitle")}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {t("unlocksPrivacy")}
              </p>
              {ops.recentUnlocks.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("opsEmpty")}
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {ops.recentUnlocks.map((row) => (
                    <li key={row.id}>
                      {row.reason} · {dateFmt.format(row.createdAt)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel grid gap-3 p-5">
              <h3 className="font-semibold">{t("membershipsTitle")}</h3>
              {ops.memberships.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("opsEmpty")}
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {ops.memberships.map((row) => (
                    <li key={row.id}>
                      {row.venueName} · {row.userEmail} · {row.role} ·{" "}
                      {row.status}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel grid gap-3 p-5">
              <h3 className="font-semibold">{t("ridersTitle")}</h3>
              {ops.riders.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("opsEmpty")}
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {ops.riders.map((row) => (
                    <li key={row.id}>
                      {row.mimeType} · {row.scanStatus} · {row.sizeBytes} B
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel grid gap-3 p-5 lg:col-span-2">
              <h3 className="font-semibold">{t("auditTitle")}</h3>
              {ops.recentAudits.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("opsEmpty")}
                </p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {ops.recentAudits.map((row) => (
                    <li key={row.id} className="tabular">
                      {dateFmt.format(row.createdAt)} · {row.action} ·{" "}
                      {row.subjectType}/{row.subjectId.slice(0, 8)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel grid gap-3 p-5 lg:col-span-2">
              <h3 className="font-semibold">{t("agreementsTitle")}</h3>
              {ops.sandboxAgreements.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("opsEmpty")}
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {ops.sandboxAgreements.map((row) => (
                    <li key={row.id}>
                      <Link href={`/marketplace/bookings/${row.bookingId}`}>
                        {row.status} · {row.provider}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {can(actor, "admin.review_accounts") ? (
        <div>
          <h2 className="display text-2xl">{t("accountsTitle")}</h2>
          <div className="mt-4 grid gap-4">
            {accounts.length === 0 ? (
              <p className="panel p-6">{t("empty")}</p>
            ) : null}
            {accounts.map((account) => (
              <article key={account.id} className="panel p-6">
                <h3 className="text-xl font-semibold">
                  {account.userName ?? "Unnamed"}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  {account.userEmail}
                </p>
                <p className="mt-2 text-sm">
                  {status(account.approvalState as ApprovalState)}
                </p>
                {account.berlinConnection ? (
                  <p className="mt-2 text-sm">{account.berlinConnection}</p>
                ) : null}
                <ApprovalForm
                  locale={locale as "en" | "de"}
                  marketplaceAccountId={account.id}
                  currentState={account.approvalState as ApprovalState}
                />
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {can(actor, "admin.review_profiles") ? (
        <div>
          <h2 className="display text-2xl">{t("profilesTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("profilesBody")}
          </p>
          <div className="mt-4 grid gap-4">
            {profiles.entertainers.length === 0 &&
            profiles.venues.length === 0 ? (
              <p className="panel p-6">{t("profilesEmpty")}</p>
            ) : null}
            {profiles.entertainers.map((profile) => (
              <article key={profile.id} className="panel p-6">
                <h3 className="text-xl font-semibold">{profile.title}</h3>
                <p className="text-sm text-[var(--muted)]">
                  {t("entertainerLabel")} · {profile.ownerName} ·{" "}
                  {profile.ownerEmail}
                </p>
                <p className="mt-2 text-sm">
                  {publication(profile.publicationState as "draft")}
                </p>
                <StaffProfileReviewForm
                  locale={locale as "en" | "de"}
                  subjectType="entertainer"
                  subjectId={profile.id}
                  currentState={profile.publicationState}
                />
              </article>
            ))}
            {profiles.venues.map((venue) => (
              <article key={venue.id} className="panel p-6">
                <h3 className="text-xl font-semibold">{venue.title}</h3>
                <p className="text-sm text-[var(--muted)]">
                  {t("venueLabel")} · {venue.district}
                </p>
                <p className="mt-2 text-sm">
                  {publication(venue.publicationState as "draft")}
                </p>
                <StaffProfileReviewForm
                  locale={locale as "en" | "de"}
                  subjectType="venue"
                  subjectId={venue.id}
                  currentState={venue.publicationState}
                />
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
