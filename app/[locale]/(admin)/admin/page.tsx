import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { ApprovalForm } from "@/src/components/approval-form";
import { StaffProfileReviewForm } from "@/src/components/staff-profile-review-form";
import { getDb } from "@/src/db/client";
import { getActorContext } from "@/src/db/queries/actor";
import { listProfilesForStaffReview } from "@/src/db/queries/profiles";
import { users } from "@/src/db/schema";
import { marketplaceAccounts } from "@/src/db/schema/marketplace";
import type { ApprovalState } from "@/src/domain/approval";
import { can } from "@/src/domain/permissions";

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
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <section>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">DATABASE_URL is not configured.</p>
      </section>
    );
  }

  const actor = await getActorContext(session.user.id);
  if (
    !actor ||
    (!can(actor, "admin.review_accounts") &&
      !can(actor, "admin.review_profiles"))
  ) {
    return (
      <section>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("denied")}</p>
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

  return (
    <section className="mx-auto grid max-w-3xl gap-12">
      <div>
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4 text-[var(--muted)]">{t("body")}</p>
      </div>

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
