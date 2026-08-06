import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicProfileView } from "@/src/components/marketplace/public-profile-view";
import { getDiscoverableVenueDetail } from "@/src/db/queries/discovery";
import {
  canViewVenueDiscoveryDetail,
  requireDiscoveryAccess,
} from "@/src/db/queries/discovery-access";
import { OnboardingChecklistTracker } from "@/src/components/onboarding-checklist-tracker";
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
};

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

export default async function VenueDiscoveryDetailPage({ params }: Props) {
  const { locale, id } = await params;
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
  });
  if (!venue) {
    notFound();
  }

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

  return (
    <>
      <OnboardingChecklistTracker step="openedResult" />
      <PublicProfileView
        backHref="/marketplace/venues"
        backLabel={t("backToVenues")}
        eyebrow={t("venueEyebrow")}
        title={venue.name}
        subtitle={`${venue.district} · ${venueTypeLabel(venue.venueType, appLocale)}`}
        description={venue.shortDescription}
        media={splitPortfolioMedia(null)}
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
      />
    </>
  );
}
