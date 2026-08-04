import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { AccountDeletionSection } from "@/src/components/account-deletion-section";
import { EntertainerProfileForm } from "@/src/components/entertainer-profile-form";
import { LocaleSwitcher } from "@/src/components/locale-switcher";
import { PortfolioEditor } from "@/src/components/portfolio-editor";
import { ProfileRoleTabs } from "@/src/components/profile-role-tabs";
import { RiderUploadForm } from "@/src/components/rider-upload-form";
import { VenueProfileForm } from "@/src/components/venue-profile-form";
import { Avatar } from "@/src/components/ui/monogram";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { getActorContext } from "@/src/db/queries/actor";
import { listRiderFilesForProfile } from "@/src/db/queries/admin-ops";
import {
  getEntertainerProfileForUser,
  listPortfolioItemsForProfile,
  listVenuesForUser,
} from "@/src/db/queries/profiles";
import { can } from "@/src/domain/permissions";
import { isFileStoreConfigured } from "@/src/integrations/files";
import { Link } from "@/src/i18n/navigation";

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

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return (
      <section className="mx-auto max-w-2xl">
        <PageHeader title={t("title")} body={t("signedOut")} />
      </section>
    );
  }

  const showEntertainer = can(actor, "entertainer.manage_own_profile");
  const showVenue = can(actor, "venue.create");
  const entertainerProfile = showEntertainer
    ? await getEntertainerProfileForUser(session.user.id)
    : null;
  const venueRows = showVenue ? await listVenuesForUser(session.user.id) : [];
  const riderFiles =
    entertainerProfile && process.env.DATABASE_URL
      ? await listRiderFilesForProfile(entertainerProfile.id)
      : [];
  const portfolioItems =
    entertainerProfile && process.env.DATABASE_URL
      ? await listPortfolioItemsForProfile(entertainerProfile.id)
      : [];
  const storeConfigured = isFileStoreConfigured();
  const displayName = session.user.name ?? session.user.email ?? "Member";

  const checklist = [
    {
      ok: Boolean(session.user.accountStatus === "active"),
      label: t("checkAccountActive"),
    },
    {
      ok: showEntertainer
        ? entertainerProfile?.publicationState === "approved"
        : true,
      label: t("checkEntertainerApproved"),
    },
    {
      ok: showVenue
        ? venueRows.some((v) => v.publicationState === "approved")
        : true,
      label: t("checkVenueApproved"),
    },
  ];

  const entertainerPanel = showEntertainer ? (
    <div className="panel p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="page-title text-xl">{t("entertainerTitle")}</h2>
        {entertainerProfile ? (
          <StatusLabel>
            {publication(entertainerProfile.publicationState as "draft")}
          </StatusLabel>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {t("contactPrivacy")}
      </p>
      <EntertainerProfileForm
        locale={locale as "en" | "de"}
        defaultContactEmail={session.user.email ?? ""}
        {...(entertainerProfile
          ? {
              publicationState: entertainerProfile.publicationState,
              defaultValues: {
                actName: entertainerProfile.actName,
                category: entertainerProfile.category,
                description: entertainerProfile.description,
                groupSize: entertainerProfile.groupSize,
                berlinBase: entertainerProfile.berlinBase,
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
      {entertainerProfile ? (
        <div className="mt-6 border-t border-[var(--rule)] pt-4">
          <PortfolioEditor
            locale={locale as "en" | "de"}
            entertainerProfileId={entertainerProfile.id}
            items={portfolioItems}
          />
        </div>
      ) : null}
      <div className="mt-6 border-t border-[var(--rule)] pt-4">
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
                className="flex items-center justify-between border border-[var(--rule)] px-3 py-3 no-underline"
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
    <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="grid gap-8">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={displayName} src={session.user.image} size={56} />
          <div>
            <PageHeader
              eyebrow={t("eyebrow")}
              title={displayName}
              body={t("body")}
            />
            <div className="mt-2">
              <StatusLabel>{session.user.accountStatus ?? "—"}</StatusLabel>
            </div>
          </div>
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

        <AccountDeletionSection userEmail={session.user.email ?? ""} />
      </div>

      <aside className="panel h-fit space-y-6 p-5">
        <div>
          <p className="eyebrow">{t("approvalPanel")}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {t("approvalPanelBody")}
          </p>
        </div>
        <ul className="grid gap-2 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className="flex gap-2">
              <span aria-hidden="true">{item.ok ? "✓" : "○"}</span>
              <span className={item.ok ? "" : "text-[var(--text-muted)]"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/marketplace/calendar"
          className="inline-flex min-h-11 items-center text-sm text-[var(--primary)]"
        >
          {t("calendarLink")} →
        </Link>

        <div className="border-t border-[var(--rule)] pt-5">
          <p className="eyebrow">{t("languagePanel")}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {t("languagePanelBody")}
          </p>
          <div className="mt-4">
            <LocaleSwitcher />
          </div>
        </div>
      </aside>
    </section>
  );
}
