import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { EntertainerProfileForm } from "@/src/components/entertainer-profile-form";
import { PortfolioEditor } from "@/src/components/portfolio-editor";
import { ProfileRoleTabs } from "@/src/components/profile-role-tabs";
import { RiderUploadForm } from "@/src/components/rider-upload-form";
import { VenueProfileForm } from "@/src/components/venue-profile-form";
import { PageHeader } from "@/src/components/ui/page-header";
import { listRiderFilesForProfile } from "@/src/db/queries/admin-ops";
import {
  getEntertainerProfileForUser,
  listPortfolioItemsForProfile,
  listVenuesForUser,
} from "@/src/db/queries/profiles";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { can } from "@/src/domain/permissions";
import { isFileStoreConfigured } from "@/src/integrations/files";
import { Link } from "@/src/i18n/navigation";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";

type Props = { params: Promise<{ locale: string }> };

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const publication = await getTranslations("publication");
  const session = await auth();

  if (!session?.user?.id || !process.env.DATABASE_URL) {
    return (
      <section className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} body={t("signedOut")} />
      </section>
    );
  }

  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    return (
      <section className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} body={t("signedOut")} />
      </section>
    );
  }

  const effectiveActor = resolved.actor;
  const support = resolved.support;
  let profileUserId = effectiveActor.userId;
  let accountEmail = session.user.email ?? "";

  if (support) {
    profileUserId = support.subjectUserId;
    const db = getDb();
    const subjectUser = await db.query.users.findFirst({
      where: eq(users.id, support.subjectUserId),
      columns: { email: true },
    });
    accountEmail = subjectUser?.email ?? accountEmail;
  }

  const showEntertainer = can(effectiveActor, "entertainer.manage_own_profile");
  const showVenue = can(effectiveActor, "venue.create");
  const entertainerProfile = showEntertainer
    ? await getEntertainerProfileForUser(profileUserId)
    : null;
  const venueRows = showVenue ? await listVenuesForUser(profileUserId) : [];
  const riderFiles =
    entertainerProfile && process.env.DATABASE_URL
      ? await listRiderFilesForProfile(entertainerProfile.id)
      : [];
  const portfolioItems =
    entertainerProfile && process.env.DATABASE_URL
      ? await listPortfolioItemsForProfile(entertainerProfile.id)
      : [];
  const storeConfigured = isFileStoreConfigured();

  const profileTitle = showEntertainer
    ? (entertainerProfile?.actName ?? t("entertainerTitle"))
    : showVenue
      ? (venueRows[0]?.name ?? t("venuesTitle"))
      : t("title");

  const entertainerPanel = showEntertainer ? (
    <div className="grid gap-8">
      <EntertainerProfileForm
        locale={locale as "en" | "de"}
        accountEmail={accountEmail}
        {...(entertainerProfile
          ? {
              publicationState: entertainerProfile.publicationState,
              mediaSlot: (
                <PortfolioEditor
                  locale={locale as "en" | "de"}
                  entertainerProfileId={entertainerProfile.id}
                  items={portfolioItems}
                />
              ),
              defaultValues: {
                actName: entertainerProfile.actName,
                category: entertainerProfile.category,
                description: entertainerProfile.description,
                groupSize: entertainerProfile.groupSize,
                berlinBase: entertainerProfile.berlinBase,
                baseLatitude: entertainerProfile.baseLatitude,
                baseLongitude: entertainerProfile.baseLongitude,
                travelRadiusKm: entertainerProfile.travelRadiusKm,
                priceMinCents: entertainerProfile.priceMinCents,
                priceMaxCents: entertainerProfile.priceMaxCents,
                durationMinutes: entertainerProfile.durationMinutes,
                technicalRequirements: entertainerProfile.technicalRequirements,
                genres: entertainerProfile.genres,
                performanceFormats: entertainerProfile.performanceFormats,
                languages: entertainerProfile.languages,
                accessibilityNotes: entertainerProfile.accessibilityNotes,
                equipmentSupplied: entertainerProfile.equipmentSupplied,
                websiteUrl: entertainerProfile.websiteUrl,
                socialLinks: entertainerProfile.socialLinks,
              },
            }
          : {})}
      />

      <div className="panel p-6">
        <h3 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("riderPlaceholderTitle")}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("riderPlaceholderBody")}
        </p>
        {riderFiles.length > 0 ? (
          <ul className="mt-3 grid gap-1 text-sm">
            {riderFiles.map((file) => (
              <li key={file.id}>
                <a
                  href={`/api/riders/${file.id}`}
                  className="text-[var(--primary)]"
                >
                  {file.originalFilename ?? t("riderDownload")}
                </a>
                {" · "}
                {file.scanStatus} · {file.sizeBytes} B ·{" "}
                {file.createdAt.toISOString().slice(0, 10)}
              </li>
            ))}
          </ul>
        ) : null}
        {entertainerProfile ? (
          <div className="mt-4">
            <RiderUploadForm
              locale={locale as "en" | "de"}
              entertainerProfileId={entertainerProfile.id}
              storeConfigured={storeConfigured}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {t("riderNeedProfile")}
          </p>
        )}
      </div>
    </div>
  ) : null;

  const venuePanel = showVenue ? (
    <div className="panel grid gap-6 p-6">
      <div>
        <h2 className="page-title text-xl">{t("venuesTitle")}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("venuesBody")}
        </p>
      </div>

      {venueRows.length > 0 ? (
        <ul className="grid gap-2">
          {venueRows.map((venue) => (
            <li key={venue.id}>
              <Link
                href={`/profile/venues/${venue.id}`}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--rule)] px-3 py-3 no-underline"
              >
                <span>{venue.name}</span>
                <span className="text-sm text-[var(--text-muted)]">
                  {publication(venue.publicationState as "draft")} ·{" "}
                  {venue.role}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t("noVenues")}</p>
      )}

      <div>
        <h3 className="text-lg font-medium">{t("createVenue")}</h3>
        <div className="mt-3">
          <VenueProfileForm
            locale={locale as "en" | "de"}
            defaultContactEmail={session.user.email ?? ""}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <div>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={profileTitle}
          body={t("body")}
        />
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--ink)]">
            {t("whyFinishThisLabel")}
          </span>{" "}
          {t("whyFinishThis")}
        </p>
      </div>

      {showEntertainer || showVenue ? (
        <ProfileRoleTabs
          showEntertainer={showEntertainer}
          showVenue={showVenue}
          entertainer={entertainerPanel}
          venue={venuePanel}
        />
      ) : (
        <p className="panel p-6">{t("noRoles")}</p>
      )}
    </section>
  );
}
