import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  ApplyForm,
  ClarificationNotesList,
  OpportunityStateButtons,
  ReplyClarificationForm,
  ReviewApplicationButtons,
  WithdrawButton,
} from "@/src/components/application-actions";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { formatEur } from "@/src/lib/format";
import {
  getApplicationForEntertainer,
  getOpportunityDetail,
  listApplicationsForOpportunity,
  listClarificationNotesForApplication,
} from "@/src/db/queries/opportunities";
import { getDb } from "@/src/db/client";
import { entertainerProfiles } from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import { isOpportunityAcceptingApplications } from "@/src/domain/opportunity";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function OpportunityDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("opportunities");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("listTitle")}</h1>
        <p className="mt-4">{market("denied")}</p>
      </section>
    );
  }

  const opportunity = await getOpportunityDetail(id);
  if (!opportunity) {
    notFound();
  }

  // Non-operators only see open opportunities in the public marketplace list,
  // but detail can still be opened by operators for drafts.
  const canManage = can(access.actor, "opportunity.manage", {
    venueId: opportunity.venueId,
  });
  if (
    opportunity.state !== "open" &&
    !canManage &&
    !access.actor.isPlatformStaff
  ) {
    notFound();
  }

  const canBrowseOpenOps = can(access.actor, "discover.venues");
  if (!access.actor.isPlatformStaff && !canManage && !canBrowseOpenOps) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("listTitle")}</h1>
        <p className="mt-4">{market("roleDeniedVenues")}</p>
      </section>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: opportunity.timezone,
  });

  const db = getDb();
  const ownProfile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, access.actor.userId),
  });
  const ownApplication =
    ownProfile &&
    (await getApplicationForEntertainer({
      opportunityId: opportunity.id,
      entertainerProfileId: ownProfile.id,
    }));

  const applications = canManage
    ? await listApplicationsForOpportunity(opportunity.id)
    : [];

  const clarificationByApplication = canManage
    ? new Map(
        await Promise.all(
          applications.map(async (application) => {
            const notes = await listClarificationNotesForApplication(
              application.id,
            );
            return [application.id, notes] as const;
          }),
        ),
      )
    : new Map<
        string,
        Awaited<ReturnType<typeof listClarificationNotesForApplication>>
      >();

  const ownClarificationNotes =
    ownApplication &&
    (await listClarificationNotesForApplication(ownApplication.id));

  const accepting = isOpportunityAcceptingApplications(
    opportunity.state,
    opportunity.applicationDeadline,
  );
  const canApply =
    can(access.actor, "opportunity.apply") &&
    accepting &&
    (!ownApplication || ownApplication.state === "draft");

  const applyBlockedByVerification =
    !canApply &&
    !ownApplication &&
    accepting &&
    access.actor.roles.includes("entertainer") &&
    !access.actor.entertainerVerified;

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <p className="text-sm">
        <Link href="/marketplace/opportunities">{t("backToList")}</Link>
      </p>
      <div>
        <h1 className="page-title text-3xl">{opportunity.title}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {opportunity.venueName} · {opportunity.district} · {opportunity.state}
        </p>
      </div>

      <div className="panel grid gap-2 p-6 text-sm">
        <p>
          {t("when")}: {dateFmt.format(opportunity.startsAt)} –{" "}
          {dateFmt.format(opportunity.endsAt)}
        </p>
        <p>
          {t("formatCategory")}: {opportunity.formatCategory}
        </p>
        {opportunity.expectedAudience ? (
          <p>
            {t("expectedAudience")}: {opportunity.expectedAudience}
          </p>
        ) : null}
        <p>
          {t("budget")}:{" "}
          {opportunity.budgetMinCents !== null
            ? formatEur(opportunity.budgetMinCents, locale)
            : "—"}
          {opportunity.budgetMaxCents !== null
            ? ` – ${formatEur(opportunity.budgetMaxCents, locale)}`
            : ""}
        </p>
        {opportunity.productionContext ? (
          <p>
            {t("productionContext")}: {opportunity.productionContext}
          </p>
        ) : null}
        {opportunity.notes ? (
          <p>
            {t("notes")}: {opportunity.notes}
          </p>
        ) : null}
        {opportunity.applicationDeadline ? (
          <p>
            {t("deadline")}: {dateFmt.format(opportunity.applicationDeadline)}
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="panel grid gap-4 p-6">
          <OpportunityStateButtons
            locale={locale as "en" | "de"}
            opportunityId={opportunity.id}
            state={opportunity.state}
          />
          <div>
            <h2 className="page-title text-xl">{t("applicationsTitle")}</h2>
            <ul className="mt-3 grid gap-3">
              {applications.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">
                  {t("noApplications")}
                </li>
              ) : null}
              {applications.map((application) => (
                <li
                  key={application.id}
                  className="border border-[var(--line)] p-4 text-sm"
                >
                  <p className="font-medium">{application.actName}</p>
                  <p className="text-[var(--muted)]">
                    {application.category} · {application.state}
                  </p>
                  <p className="mt-2">{application.message}</p>
                  <p className="mt-1">
                    {t("quote")}: {formatEur(application.quoteMinCents, locale)}{" "}
                    – {formatEur(application.quoteMaxCents, locale)}
                  </p>
                  <div className="mt-3">
                    <ReviewApplicationButtons
                      locale={locale as "en" | "de"}
                      applicationId={application.id}
                      state={application.state}
                      clarificationNotes={
                        clarificationByApplication.get(application.id) ?? []
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {ownApplication ? (
        <div className="panel grid gap-3 p-6">
          <p className="text-sm">
            {t("yourApplication")}: {ownApplication.state}
          </p>
          {(ownApplication.state === "draft" ||
            ownApplication.state === "submitted" ||
            ownApplication.state === "clarification_requested" ||
            ownApplication.state === "shortlisted") && (
            <WithdrawButton
              locale={locale as "en" | "de"}
              applicationId={ownApplication.id}
            />
          )}
          {ownClarificationNotes && ownClarificationNotes.length > 0 ? (
            <ClarificationNotesList
              notes={ownClarificationNotes}
              locale={locale as "en" | "de"}
            />
          ) : null}
          {ownApplication.state === "clarification_requested" ? (
            <ReplyClarificationForm
              locale={locale as "en" | "de"}
              applicationId={ownApplication.id}
            />
          ) : null}
          {ownApplication.state === "shortlisted" ? (
            <p className="text-sm text-[var(--muted)]">
              {t("shortlistedHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      {canApply ? (
        <div className="panel p-6">
          <ApplyForm
            locale={locale as "en" | "de"}
            opportunityId={opportunity.id}
            {...(ownApplication?.state === "draft"
              ? {
                  initial: {
                    message: ownApplication.message,
                    quoteMinEur: ownApplication.quoteMinCents / 100,
                    quoteMaxEur: ownApplication.quoteMaxCents / 100,
                    isDraft: true,
                  },
                }
              : {})}
          />
        </div>
      ) : null}

      {applyBlockedByVerification ? (
        <p className="panel p-6 text-sm">
          {t("needApprovedProfile")}{" "}
          <Link href="/profile">{t("goToProfile")}</Link>
        </p>
      ) : null}
    </section>
  );
}
