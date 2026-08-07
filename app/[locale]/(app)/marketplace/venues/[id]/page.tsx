import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicProfileView } from "@/src/components/marketplace/public-profile-view";
import { ProfileDocumentList } from "@/src/components/profile-document-list";
import { VenueOpenCallsPanel } from "@/src/components/venue-open-calls-panel";
import { VenueSubmitProfileButton } from "@/src/components/venue-submit-profile-button";
import { ProfilePreviewExitBanner } from "@/src/components/profile/profile-preview-exit-banner";
import { getDiscoverableVenueDetail } from "@/src/db/queries/discovery";
import {
  canViewVenueDiscoveryDetail,
  requireDiscoveryAccess,
} from "@/src/db/queries/discovery-access";
import { OnboardingChecklistTracker } from "@/src/components/onboarding-checklist-tracker";
import {
  findActiveProfileEnquiry,
  findRecentProfileEnquiry,
} from "@/src/db/queries/profile-enquiries";
import { listOpenCallsForVenue } from "@/src/db/queries/opportunities";
import { listDocumentsVisibleToActor } from "@/src/db/queries/rider-access";
import { getDb } from "@/src/db/client";
import { bookings, entertainerProfiles } from "@/src/db/schema/marketplace";
import { and, eq } from "drizzle-orm";
import { can } from "@/src/domain/permissions";
import { enquiryRequestCooldownDaysRemaining } from "@/src/domain/profile-enquiry-cooldown";
import {
  getCategoryNode,
  parseSubcategory,
  parseVenueType,
  taxonomyLabel,
  VENUE_CATEGORIES,
} from "@/src/domain/profile-taxonomy";
import {
  socialLinksToList,
  splitPortfolioMedia,
  type PublicProfileFact,
} from "@/src/lib/public-profile";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function venueTypeLabel(raw: string, locale: "en" | "de"): string {
  const parsed = parseVenueType(raw);
  const category = getCategoryNode(VENUE_CATEGORIES, parsed.categoryId);
  const catLabel = category
    ? taxonomyLabel(category, locale)
    : parsed.categoryId || raw;
  const sub = parseSubcategory(parsed.subcategoryRaw);
  if (sub.subcategoryId === "other" && sub.otherLabel) {
    return `${catLabel} · ${sub.otherLabel}`;
  }
  const child = category?.children.find((c) => c.id === sub.subcategoryId);
  if (child) return `${catLabel} · ${taxonomyLabel(child, locale)}`;
  return catLabel;
}

export default async function VenueDiscoveryDetailPage({
  params,
  searchParams,
}: Props) {
  const { locale, id } = await params;
  const query = await searchParams;
  const isPreview = first(query.preview) === "1";
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();
  const appLocale = locale as "en" | "de";

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("venuesTitle")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  if (!(await canViewVenueDiscoveryDetail(access.actor, id))) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("venuesTitle")}</h1>
        <p className="mt-4">{t("roleDeniedVenues")}</p>
      </section>
    );
  }

  const venue = await getDiscoverableVenueDetail({
    venueId: id,
    viewerUserId: access.actor.userId,
    allowOwnerDraft: true,
  });
  if (!venue) {
    notFound();
  }

  const isOwnVenue = access.actor.venueId === id;
  const showPreviewBanner = isPreview && isOwnVenue;

  const productionNotes =
    typeof venue.productionResources.notes === "string"
      ? venue.productionResources.notes
      : "";

  const address = [
    venue.addressLine1,
    venue.addressLine2,
    `${venue.postalCode} ${venue.city}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const facts: PublicProfileFact[] = [
    { label: t("address"), value: address },
    {
      label: t("capacity"),
      value: venue.capacityContext
        ? `${venue.capacity} (${venue.capacityContext})`
        : String(venue.capacity),
    },
    { label: t("audience"), value: venue.audienceDescription },
  ];
  if (productionNotes) {
    facts.push({ label: t("production"), value: productionNotes });
  }
  if (venue.loadInNotes?.trim()) {
    facts.push({ label: t("loadInNotes"), value: venue.loadInNotes });
  }
  if (venue.houseRules?.trim()) {
    facts.push({ label: t("houseRules"), value: venue.houseRules });
  }
  if (venue.accessibilityNotes?.trim()) {
    facts.push({
      label: t("accessibilityNotes"),
      value: venue.accessibilityNotes,
    });
  }
  if (venue.latitude && venue.longitude) {
    facts.push({
      label: t("coordinates"),
      value: `${venue.latitude}, ${venue.longitude}`,
    });
  }

  const isEntertainer = access.actor.roles.includes("entertainer");
  const db = getDb();
  const ownProfile = isEntertainer
    ? await db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.userId, access.actor.userId),
        columns: {
          id: true,
          publicationState: true,
          priceMinCents: true,
          priceMaxCents: true,
        },
      })
    : null;

  const canSubmit = can(access.actor, "profile_enquiry.send");
  const publishRequired = Boolean(
    isEntertainer && ownProfile && ownProfile.publicationState !== "approved",
  );

  let activeEnquiryBookingId: string | null = null;
  let enquiryCooldownDaysRemaining: number | null = null;
  if (ownProfile) {
    const [active, recent] = await Promise.all([
      findActiveProfileEnquiry({
        venueId: id,
        entertainerProfileId: ownProfile.id,
      }),
      findRecentProfileEnquiry({
        venueId: id,
        entertainerProfileId: ownProfile.id,
      }),
    ]);
    if (active) {
      const booking = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.originType, "profile_enquiry"),
          eq(bookings.originId, active.id),
        ),
        columns: { id: true },
      });
      activeEnquiryBookingId = booking?.id ?? null;
    }
    if (recent) {
      const days = enquiryRequestCooldownDaysRemaining(recent.createdAt);
      enquiryCooldownDaysRemaining = days > 0 ? days : null;
    }
  }

  const openCalls = isEntertainer
    ? await listOpenCallsForVenue({
        venueId: id,
        entertainerProfileId: ownProfile?.id ?? null,
      })
    : [];

  const visibleDocuments = await listDocumentsVisibleToActor({
    actor: access.actor,
    venueId: id,
    ownerUserId: venue.ownerUserId,
    publicationState: venue.publicationState,
  });

  const showSubmitCta =
    isEntertainer &&
    !showPreviewBanner &&
    (canSubmit ||
      publishRequired ||
      Boolean(activeEnquiryBookingId) ||
      (enquiryCooldownDaysRemaining ?? 0) > 0);

  const headerAction = showSubmitCta ? (
    <VenueSubmitProfileButton
      locale={appLocale}
      venueId={id}
      canSubmit={canSubmit}
      publishRequired={publishRequired}
      activeEnquiryBookingId={activeEnquiryBookingId}
      cooldownDaysRemaining={enquiryCooldownDaysRemaining}
    />
  ) : null;

  return (
    <>
      {showPreviewBanner ? <ProfilePreviewExitBanner /> : null}
      <OnboardingChecklistTracker step="openedResult" />
      <PublicProfileView
        backHref={showPreviewBanner ? "/profile" : "/marketplace/venues"}
        backLabel={showPreviewBanner ? t("backToProfile") : t("backToVenues")}
        eyebrow={t("venueEyebrow")}
        title={venue.name}
        subtitle={`${venue.district} · ${venueTypeLabel(venue.venueType, appLocale)}`}
        description={venue.shortDescription}
        media={splitPortfolioMedia(venue.portfolio)}
        facts={facts}
        links={socialLinksToList(
          venue.socialLinks,
          (key) => SOCIAL_LABELS[key] ?? key,
        )}
        websiteUrl={venue.websiteUrl}
        websiteLabel={t("website")}
        contactTitle={t("contactTitle")}
        contactLocked={venue.contactLocked}
        contactLockedMessage={t("contactLocked")}
        preferredLabel={t("preferred")}
        contacts={venue.contacts}
        aboutTitle={t("aboutTitle")}
        detailsTitle={t("detailsTitle")}
        galleryTitle={t("galleryTitle")}
        videoTitle={t("videoTitle")}
        linksTitle={t("linksTitle")}
        {...(headerAction ? { headerAction } : {})}
      >
        {isEntertainer && !showPreviewBanner ? (
          <VenueOpenCallsPanel
            locale={appLocale}
            canSubmit={canSubmit}
            publishRequired={publishRequired}
            openCalls={openCalls.map((c) => ({
              id: c.id,
              title: c.title,
              kind: c.kind,
              startsAt: c.startsAt,
              endsAt: c.endsAt,
              standingSchedule: c.standingSchedule,
              formatCategory: c.formatCategory,
              ownApplicationState: c.ownApplicationState,
            }))}
            defaultQuoteMinEur={ownProfile ? ownProfile.priceMinCents / 100 : 0}
            defaultQuoteMaxEur={ownProfile ? ownProfile.priceMaxCents / 100 : 0}
          />
        ) : null}
        <ProfileDocumentList
          locale={locale}
          variant="public"
          documents={visibleDocuments.map((doc) => ({
            id: doc.id,
            title: doc.title.trim() || doc.originalFilename?.trim() || "PDF",
            visibility: doc.visibility,
            sizeBytes: doc.sizeBytes,
          }))}
        />
      </PublicProfileView>
    </>
  );
}
