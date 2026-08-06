import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DirectRequestForm } from "@/src/components/direct-request-form";
import { PublicProfileView } from "@/src/components/marketplace/public-profile-view";
import { ProfileDocumentList } from "@/src/components/profile-document-list";
import { getDiscoverableEntertainerDetail } from "@/src/db/queries/discovery";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listDocumentsVisibleToActor } from "@/src/db/queries/rider-access";
import { listVenuesForUser } from "@/src/db/queries/profiles";
import {
  ENTERTAINER_CATEGORIES,
  getCategoryNode,
  parseSubcategory,
  taxonomyLabel,
} from "@/src/domain/profile-taxonomy";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";
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
};

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

export default async function EntertainerDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
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

  const operableVenues = (await listVenuesForUser(access.actor.userId)).filter(
    (venue) => can(access.actor, "direct_request.send", { venueId: venue.id }),
  );
  const showRequestLocked =
    !isOwnProfile &&
    canBrowseActs &&
    access.actor.roles.includes("venue") &&
    !access.actor.venueVerified;

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
      value: `${profile.travelRadiusKm} km`,
    },
  ];
  if (profile.performanceFormats?.trim()) {
    facts.push({
      label: t("performanceFormats"),
      value: profile.performanceFormats,
    });
  }
  if (profile.languages?.trim()) {
    facts.push({ label: t("languages"), value: profile.languages });
  }
  if (profile.technicalRequirements?.trim()) {
    facts.push({
      label: t("technicalRequirements"),
      value: profile.technicalRequirements,
    });
  }
  if (profile.equipmentSupplied?.trim()) {
    facts.push({
      label: t("equipmentSupplied"),
      value: profile.equipmentSupplied,
    });
  }
  if (profile.accessibilityNotes?.trim()) {
    facts.push({
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

  return (
    <PublicProfileView
      backHref="/marketplace/entertainers"
      backLabel={t("backToEntertainers")}
      eyebrow={t("entertainerEyebrow")}
      title={profile.actName}
      subtitle={subtitle}
      description={profile.description}
      media={media}
      facts={facts}
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
    >
      <ProfileDocumentList
        locale={locale}
        documents={visibleDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title.trim() || doc.originalFilename?.trim() || "PDF",
          visibility: doc.visibility,
          sizeBytes: doc.sizeBytes,
        }))}
      />

      {!isOwnProfile && operableVenues.length > 0 ? (
        <div id="direct-request" className="scroll-mt-24">
          <DirectRequestForm
            locale={appLocale}
            entertainerProfileId={profile.id}
            venues={operableVenues.map((venue) => ({
              id: venue.id,
              name: venue.name,
            }))}
          />
        </div>
      ) : null}

      {showRequestLocked ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
          {t("requestActLocked")}{" "}
          <Link href="/profile" className="font-medium underline">
            {t("viewProfile")}
          </Link>
        </p>
      ) : null}
    </PublicProfileView>
  );
}
