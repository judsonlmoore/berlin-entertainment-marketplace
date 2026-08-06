import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { DocumentEditor } from "@/src/components/document-editor";
import { EntertainerProfileForm } from "@/src/components/entertainer-profile-form";
import { PortfolioEditor } from "@/src/components/portfolio-editor";
import { ProfileRoleTabs } from "@/src/components/profile-role-tabs";
import { VenueProfileForm } from "@/src/components/venue-profile-form";
import { PageHeader } from "@/src/components/ui/page-header";
import {
  getEntertainerProfileForUser,
  getVenueForOwnerView,
  listPortfolioItemsForProfile,
  listPortfolioItemsForVenue,
  listVenueSpaces,
  listVenuesForUser,
} from "@/src/db/queries/profiles";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { can } from "@/src/domain/permissions";
import { isDocumentStoreConfigured } from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import {
  listRiderFilesForProfile,
  listRiderFilesForVenue,
} from "@/src/db/queries/admin-ops";

type Props = { params: Promise<{ locale: string }> };

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
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
  const primaryVenueSummary = venueRows[0] ?? null;
  const venue = primaryVenueSummary
    ? await getVenueForOwnerView(primaryVenueSummary.id)
    : null;
  const venueSpaces = venue ? await listVenueSpaces(venue.id) : [];
  const primarySpace = venueSpaces[0] ?? null;
  const riderFiles =
    entertainerProfile && process.env.DATABASE_URL
      ? await listRiderFilesForProfile(entertainerProfile.id)
      : [];
  const portfolioItems =
    entertainerProfile && process.env.DATABASE_URL
      ? await listPortfolioItemsForProfile(entertainerProfile.id)
      : [];
  const venueRiderFiles =
    venue && process.env.DATABASE_URL
      ? await listRiderFilesForVenue(venue.id)
      : [];
  const venuePortfolioItems =
    venue && process.env.DATABASE_URL
      ? await listPortfolioItemsForVenue(venue.id)
      : [];
  const storeConfigured = isDocumentStoreConfigured();

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
        {entertainerProfile ? (
          <DocumentEditor
            locale={locale as "en" | "de"}
            entertainerProfileId={entertainerProfile.id}
            storeConfigured={storeConfigured}
            documents={riderFiles.map((file) => ({
              id: file.id,
              title: file.title,
              originalFilename: file.originalFilename,
              visibility: file.visibility,
              sortOrder: file.sortOrder,
              sizeBytes: file.sizeBytes,
            }))}
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            {t("riderNeedProfile")}
          </p>
        )}
      </div>
    </div>
  ) : null;

  const productionResources =
    venue &&
    typeof venue.productionResources === "object" &&
    venue.productionResources
      ? (venue.productionResources as Record<string, unknown>)
      : {};
  const productionNotes = String(productionResources.notes ?? "");
  const productionField = (key: string) =>
    String(productionResources[key] ?? "");
  const socialLinks =
    venue && typeof venue.socialLinks === "object" && venue.socialLinks
      ? (venue.socialLinks as Record<string, string>)
      : {};

  const venuePanel = showVenue ? (
    <VenueProfileForm
      locale={locale as "en" | "de"}
      accountEmail={accountEmail}
      {...(venue
        ? {
            venueId: venue.id,
            publicationState: venue.publicationState,
            mediaSlot: (
              <PortfolioEditor
                locale={locale as "en" | "de"}
                venueId={venue.id}
                items={venuePortfolioItems}
              />
            ),
            documentsSlot: (
              <DocumentEditor
                locale={locale as "en" | "de"}
                venueId={venue.id}
                storeConfigured={storeConfigured}
                documents={venueRiderFiles.map((file) => ({
                  id: file.id,
                  title: file.title,
                  originalFilename: file.originalFilename,
                  visibility: file.visibility,
                  sortOrder: file.sortOrder,
                  sizeBytes: file.sizeBytes,
                }))}
              />
            ),
            defaultValues: {
              name: venue.name,
              shortDescription: venue.shortDescription,
              addressLine1: venue.addressLine1,
              addressLine2: venue.addressLine2,
              district: venue.district,
              postalCode: venue.postalCode,
              city: venue.city,
              latitude: venue.latitude,
              longitude: venue.longitude,
              googlePlaceId: venue.googlePlaceId,
              venueType: venue.venueType,
              audienceDescription: venue.audienceDescription,
              capacity: venue.capacity,
              capacityContext: venue.capacityContext,
              roomName: primarySpace?.name ?? "Main room",
              roomStageDimensions: primarySpace?.stageDimensions ?? "",
              productionNotes,
              productionPa: productionField("pa"),
              productionMixer: productionField("mixer"),
              productionMics: productionField("mics"),
              productionLighting: productionField("lighting"),
              productionBackline: productionField("backline"),
              productionPower: productionField("power"),
              productionStage: productionField("stage"),
              houseRules: venue.houseRules,
              loadInNotes: venue.loadInNotes,
              accessibilityNotes: venue.accessibilityNotes,
              socialLinks,
              websiteUrl: venue.websiteUrl,
            },
          }
        : {})}
    />
  ) : null;

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
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
