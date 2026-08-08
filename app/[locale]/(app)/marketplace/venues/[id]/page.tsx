import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicProfileView } from "@/src/components/marketplace/public-profile-view";
import { VenueOpenCallsPanel } from "@/src/components/venue-open-calls-panel";
import { SendOfferButton } from "@/src/components/send-offer-button";
import { ProfilePreviewExitBanner } from "@/src/components/profile/profile-preview-exit-banner";
import { getDiscoverableVenueDetail } from "@/src/db/queries/discovery";
import {
  canViewVenueDiscoveryDetail,
  requireDiscoveryAccess,
} from "@/src/db/queries/discovery-access";
import { OnboardingChecklistTracker } from "@/src/components/onboarding-checklist-tracker";
import { listOpenOfferBookingsForPair } from "@/src/db/queries/profile-enquiries";
import { listOpenCallsForVenue } from "@/src/db/queries/opportunities";
import { listDocumentsVisibleToActor } from "@/src/db/queries/rider-access";
import { getLegalIdentityForUser } from "@/src/db/queries/legal-identity";
import { getDb } from "@/src/db/client";
import { entertainerProfiles } from "@/src/db/schema/marketplace";
import { eq } from "drizzle-orm";
import { can } from "@/src/domain/permissions";
import { isLegalIdentityComplete } from "@/src/domain/legal-identity";
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

/** Auth + publication state must never serve a stale notFound from pre-publish. */
export const dynamic = "force-dynamic";

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
  const tProfile = await getTranslations("profile");
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
  ];
  if (venue.latitude && venue.longitude) {
    facts.push({
      label: t("coordinates"),
      value: `${venue.latitude}, ${venue.longitude}`,
    });
  }

  const sections: PublicProfileFact[] = [];
  if (venue.audienceDescription?.trim()) {
    sections.push({
      label: t("audience"),
      value: venue.audienceDescription,
    });
  }
  if (productionNotes) {
    sections.push({ label: t("production"), value: productionNotes });
  }
  if (venue.loadInNotes?.trim()) {
    sections.push({ label: t("loadInNotes"), value: venue.loadInNotes });
  }
  if (venue.houseRules?.trim()) {
    sections.push({ label: t("houseRules"), value: venue.houseRules });
  }
  if (venue.accessibilityNotes?.trim()) {
    sections.push({
      label: t("accessibilityNotes"),
      value: venue.accessibilityNotes,
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
  const legalIdentityComplete = isLegalIdentityComplete(
    await getLegalIdentityForUser(access.actor.userId),
  );

  const openOfferBookingIds = ownProfile
    ? (
        await listOpenOfferBookingsForPair({
          venueId: id,
          entertainerProfileId: ownProfile.id,
        })
      ).map((row) => row.bookingId)
    : [];

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
    publicationState: showPreviewBanner ? "approved" : venue.publicationState,
    ...(showPreviewBanner ? { asMarketplacePreview: true } : {}),
  });

  const showSubmitCta =
    isEntertainer &&
    !showPreviewBanner &&
    (canSubmit || publishRequired || openOfferBookingIds.length > 0);

  const headerAction = showSubmitCta ? (
    <SendOfferButton
      direction="talent_to_venue"
      locale={appLocale}
      venueId={id}
      canSubmit={canSubmit}
      publishRequired={publishRequired}
      legalIdentityComplete={legalIdentityComplete}
      openOfferBookingIds={openOfferBookingIds}
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
        sections={sections}
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
        documentsTitle={tProfile("documentsTitle")}
        documents={visibleDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title.trim() || doc.originalFilename?.trim() || "PDF",
          ...(typeof doc.sizeBytes === "number"
            ? { sizeBytes: doc.sizeBytes }
            : {}),
        }))}
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
      </PublicProfileView>
    </>
  );
}
