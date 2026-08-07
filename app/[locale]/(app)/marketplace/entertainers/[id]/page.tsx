import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SendOfferButton } from "@/src/components/send-offer-button";
import { PublicProfileView } from "@/src/components/marketplace/public-profile-view";
import { ProfilePreviewExitBanner } from "@/src/components/profile/profile-preview-exit-banner";
import { getDiscoverableEntertainerDetail } from "@/src/db/queries/discovery";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { OnboardingChecklistTracker } from "@/src/components/onboarding-checklist-tracker";
import { listDocumentsVisibleToActor } from "@/src/db/queries/rider-access";
import { listVenuesForUser } from "@/src/db/queries/profiles";
import { listVenueActConnectionStatuses } from "@/src/db/queries/profile-enquiries";
import { formatLanguageList } from "@/src/domain/languages";
import {
  ENTERTAINER_CATEGORIES,
  getCategoryNode,
  parseSubcategory,
  taxonomyLabel,
} from "@/src/domain/profile-taxonomy";
import { can } from "@/src/domain/permissions";
import { formatEur } from "@/src/lib/format";
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

function categoryLabel(categoryId: string, locale: "en" | "de"): string {
  const node = getCategoryNode(ENTERTAINER_CATEGORIES, categoryId);
  return node ? taxonomyLabel(node, locale) : categoryId;
}

function subcategoryLabel(
  genres: string | null,
  categoryId: string,
  locale: "en" | "de",
): string | null {
  if (!genres?.trim()) return null;
  const parsed = parseSubcategory(genres);
  if (parsed.subcategoryId === "other" && parsed.otherLabel) {
    return parsed.otherLabel;
  }
  const node = getCategoryNode(ENTERTAINER_CATEGORIES, categoryId);
  const child = node?.children.find((c) => c.id === parsed.subcategoryId);
  return child ? taxonomyLabel(child, locale) : genres;
}

export default async function EntertainerDetailPage({
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
        <h1 className="page-title text-3xl">{t("entertainersTitle")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  const profile = await getDiscoverableEntertainerDetail({
    entertainerProfileId: id,
    viewerUserId: access.actor.userId,
    includePortfolio: true,
    allowOwnerDraft: true,
  });
  if (!profile) {
    notFound();
  }

  const isOwnProfile = profile.userId === access.actor.userId;
  const canBrowseActs = can(access.actor, "discover.entertainers");
  if (!isOwnProfile && !canBrowseActs) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="page-title text-3xl">{t("entertainersTitle")}</h1>
        <p className="mt-4">{t("roleDeniedEntertainers")}</p>
      </section>
    );
  }

  const showPreviewBanner = isPreview && isOwnProfile;

  const operableVenues = (await listVenuesForUser(access.actor.userId)).filter(
    (venue) =>
      venue.id === access.actor.venueId &&
      venue.publicationState === "approved" &&
      can(access.actor, "direct_request.send", { venueId: venue.id }),
  );
  // Any venue booker viewing another act should always see a CTA: either
  // Request connection, or a publish-gate message. Never hide both (e.g. when
  // venueVerified is stale/true but no owned venue is currently operable).
  const isVenueBooker =
    !isOwnProfile &&
    canBrowseActs &&
    (access.actor.roles.includes("venue") || Boolean(access.actor.venueId));
  const showRequestLocked = isVenueBooker && operableVenues.length === 0;

  const connectionStatuses =
    operableVenues.length > 0
      ? await listVenueActConnectionStatuses({
          entertainerProfileId: profile.id,
          venueIds: operableVenues.map((venue) => venue.id),
        })
      : [];
  const statusByVenueId = new Map(
    connectionStatuses.map((status) => [status.venueId, status]),
  );

  const media = splitPortfolioMedia(profile.portfolio);
  const sub = subcategoryLabel(profile.genres, profile.category, appLocale);
  const cat = categoryLabel(profile.category, appLocale);
  const subtitle = [cat, sub, profile.berlinBase].filter(Boolean).join(" · ");

  const facts: PublicProfileFact[] = [
    { label: t("groupSize"), value: String(profile.groupSize) },
    {
      label: t("duration"),
      value: `${profile.durationMinutes} ${t("minutes")}`,
    },
    {
      label: t("priceRange"),
      value: `${formatEur(profile.priceMinCents, locale)} – ${formatEur(profile.priceMaxCents, locale)}`,
    },
    {
      label: t("travelRadius"),
      value: profile.berlinBase?.trim()
        ? t("travelRadiusFrom", {
            km: profile.travelRadiusKm,
            location: profile.berlinBase.trim(),
          })
        : `${profile.travelRadiusKm} km`,
    },
  ];
  if (profile.languages?.trim()) {
    facts.push({
      label: t("languages"),
      value: formatLanguageList(profile.languages, appLocale),
    });
  }
  if (profile.performanceFormats?.trim()) {
    facts.push({
      label: t("performanceFormats"),
      value: profile.performanceFormats,
    });
  }

  const sections: PublicProfileFact[] = [];
  if (profile.technicalRequirements?.trim()) {
    sections.push({
      label: t("technicalRequirements"),
      value: profile.technicalRequirements,
    });
  }
  if (profile.equipmentSupplied?.trim()) {
    sections.push({
      label: t("equipmentSupplied"),
      value: profile.equipmentSupplied,
    });
  }
  if (profile.accessibilityNotes?.trim()) {
    sections.push({
      label: t("accessibilityNotes"),
      value: profile.accessibilityNotes,
    });
  }

  // Discovery only loads approved profiles; keep list/download gates aligned.
  const visibleDocuments = await listDocumentsVisibleToActor({
    actor: access.actor,
    entertainerProfileId: profile.id,
    ownerUserId: profile.userId,
    publicationState: "approved",
  });

  const headerAction = isVenueBooker ? (
    <SendOfferButton
      direction="venue_to_talent"
      locale={appLocale}
      entertainerProfileId={profile.id}
      venues={operableVenues.map((venue) => {
        const status = statusByVenueId.get(venue.id);
        return {
          id: venue.id,
          name: venue.name,
          activeBookingId: status?.activeBookingId ?? null,
          cooldownDaysRemaining: status?.cooldownDaysRemaining ?? null,
        };
      })}
      locked={showRequestLocked}
    />
  ) : null;

  return (
    <>
      {showPreviewBanner ? <ProfilePreviewExitBanner /> : null}
      <OnboardingChecklistTracker step="openedResult" />
      <PublicProfileView
        backHref={showPreviewBanner ? "/profile" : "/marketplace/entertainers"}
        backLabel={
          showPreviewBanner ? t("backToProfile") : t("backToEntertainers")
        }
        eyebrow={t("entertainerEyebrow")}
        title={profile.actName}
        subtitle={subtitle}
        description={profile.description}
        media={media}
        facts={facts}
        sections={sections}
        links={socialLinksToList(
          profile.socialLinks,
          (key) => SOCIAL_LABELS[key] ?? key,
        )}
        websiteUrl={profile.websiteUrl}
        websiteLabel={t("website")}
        contactTitle={t("contactTitle")}
        contactLocked={profile.contactLocked}
        contactLockedMessage={t("contactLocked")}
        preferredLabel={t("preferred")}
        contacts={profile.contacts}
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
      />
    </>
  );
}
