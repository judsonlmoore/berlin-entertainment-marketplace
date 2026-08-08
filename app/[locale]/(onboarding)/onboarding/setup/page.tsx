import { and, asc, count, eq, isNotNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { getLegalIdentityForUser } from "@/src/db/queries/legal-identity";
import {
  listPortfolioItemsForProfile,
  listPortfolioItemsForVenue,
} from "@/src/db/queries/profiles";
import {
  entertainerProfiles,
  portfolioItems,
  userRoles,
  venues,
} from "@/src/db/schema/marketplace";
import {
  OnboardingSetupWizard,
  type EntertainerDraft,
  type VenueDraft,
} from "@/src/components/onboarding-setup-wizard";
import type { PortfolioItemRow } from "@/src/components/portfolio-editor";
import { isLegalIdentityComplete } from "@/src/domain/legal-identity";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
import { firstIncompleteWizardStepIndex } from "@/src/lib/onboarding-wizard-progress";
import {
  ONBOARDING_WIZARD_COOKIE,
  ONBOARDING_WIZARD_COOKIE_VALUE,
} from "@/src/lib/onboarding-wizard-session";
import type { AppLocale } from "@/src/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingSetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as AppLocale });
  }

  const userId = session!.user!.id!;
  const isPlatformStaff = Boolean(session!.user!.isPlatformStaff);
  const destination = await resolveOnboardingDestination({
    userId,
    isPlatformStaff,
    sessionRoles: session!.user!.roles,
  });

  if (destination === "role") {
    redirect({
      href: "/onboarding/role-selection",
      locale: locale as AppLocale,
    });
  }

  if (isPlatformStaff) {
    redirect({ href: "/marketplace", locale: locale as AppLocale });
  }

  const cookieStore = await cookies();
  const wizardActive =
    cookieStore.get(ONBOARDING_WIZARD_COOKIE)?.value ===
    ONBOARDING_WIZARD_COOKIE_VALUE;

  // One-shot: after exit, draft exists and no wizard session → /profile only.
  if (destination === "none" && !wizardActive) {
    redirect({ href: "/profile", locale: locale as AppLocale });
  }

  const db = getDb();
  const roleRow = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, userId),
    columns: { role: true },
  });
  const role = roleRow?.role;
  if (role !== "entertainer" && role !== "venue") {
    redirect({
      href: "/onboarding/role-selection",
      locale: locale as AppLocale,
    });
  }
  const setupRole = role as "entertainer" | "venue";
  const accountEmail = session!.user!.email ?? "";

  const legalIdentity = await getLegalIdentityForUser(userId);
  const legalComplete = isLegalIdentityComplete(legalIdentity);

  let entertainerDraft: EntertainerDraft = {
    profileId: null,
    actName: "",
    category: "",
    genres: "",
    description: "",
    berlinBase: "",
    baseLatitude: "",
    baseLongitude: "",
    travelRadiusKm: 25,
    priceMinCents: 0,
    priceMaxCents: 0,
    websiteUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    technicalRequirements: "",
    imageCount: 0,
    heroImageId: null,
    hasExternalOrVideoLink: false,
  };

  let venueDraft: VenueDraft = {
    venueId: null,
    name: "",
    venueType: "",
    shortDescription: "",
    googlePlaceId: "",
    addressLine1: "",
    addressLine2: "",
    district: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    websiteUrl: "",
    audienceDescription: "",
    capacity: 50,
    capacityContext: "",
    productionNotes: "",
    imageCount: 0,
    heroImageId: null,
  };

  let initialPortfolio: PortfolioItemRow[] = [];

  if (setupRole === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, userId),
    });
    if (profile) {
      const social =
        (profile.socialLinks as Record<string, string> | null) ?? {};
      const [imageRow] = await db
        .select({ value: count() })
        .from(portfolioItems)
        .where(
          and(
            eq(portfolioItems.entertainerProfileId, profile.id),
            eq(portfolioItems.kind, "image"),
          ),
        );
      const [hero] = await db
        .select({ id: portfolioItems.id })
        .from(portfolioItems)
        .where(
          and(
            eq(portfolioItems.entertainerProfileId, profile.id),
            eq(portfolioItems.kind, "image"),
            isNotNull(portfolioItems.blobKey),
          ),
        )
        .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt))
        .limit(1);
      const mediaLinks = await db.query.portfolioItems.findMany({
        where: eq(portfolioItems.entertainerProfileId, profile.id),
        columns: { kind: true },
      });
      const hasExternalOrVideoLink = mediaLinks.some(
        (item) => item.kind === "youtube" || item.kind === "link",
      );
      entertainerDraft = {
        profileId: profile.id,
        actName: profile.actName,
        category: profile.category ?? "",
        genres: profile.genres ?? "",
        description: profile.description ?? "",
        berlinBase: profile.berlinBase ?? "",
        baseLatitude: profile.baseLatitude ?? "",
        baseLongitude: profile.baseLongitude ?? "",
        travelRadiusKm: profile.travelRadiusKm ?? 25,
        priceMinCents: profile.priceMinCents ?? 0,
        priceMaxCents: profile.priceMaxCents ?? 0,
        websiteUrl: profile.websiteUrl ?? "",
        instagramUrl: social.instagram ?? "",
        youtubeUrl: social.youtube ?? "",
        technicalRequirements: profile.technicalRequirements ?? "",
        imageCount: imageRow?.value ?? 0,
        heroImageId: hero?.id ?? null,
        hasExternalOrVideoLink,
      };
      initialPortfolio = await listPortfolioItemsForProfile(profile.id);
    }
  } else {
    const venue = await db.query.venues.findFirst({
      where: eq(venues.ownerUserId, userId),
    });
    if (venue) {
      const production =
        (venue.productionResources as Record<string, string> | null) ?? {};
      const [imageRow] = await db
        .select({ value: count() })
        .from(portfolioItems)
        .where(
          and(
            eq(portfolioItems.venueId, venue.id),
            eq(portfolioItems.kind, "image"),
          ),
        );
      const [hero] = await db
        .select({ id: portfolioItems.id })
        .from(portfolioItems)
        .where(
          and(
            eq(portfolioItems.venueId, venue.id),
            eq(portfolioItems.kind, "image"),
            isNotNull(portfolioItems.blobKey),
          ),
        )
        .orderBy(asc(portfolioItems.sortOrder), asc(portfolioItems.createdAt))
        .limit(1);
      venueDraft = {
        venueId: venue.id,
        name: venue.name,
        venueType: venue.venueType ?? "",
        shortDescription: venue.shortDescription ?? "",
        googlePlaceId: venue.googlePlaceId ?? "",
        addressLine1: venue.addressLine1 ?? "",
        addressLine2: venue.addressLine2 ?? "",
        district: venue.district ?? "",
        postalCode: venue.postalCode ?? "",
        latitude: venue.latitude ?? "",
        longitude: venue.longitude ?? "",
        websiteUrl: venue.websiteUrl ?? "",
        audienceDescription: venue.audienceDescription ?? "",
        capacity: venue.capacity ?? 50,
        capacityContext: venue.capacityContext ?? "",
        productionNotes: production.notes ?? "",
        imageCount: imageRow?.value ?? 0,
        heroImageId: hero?.id ?? null,
      };
      initialPortfolio = await listPortfolioItemsForVenue(venue.id);
    }
  }

  const hasDraft =
    (setupRole === "entertainer" && Boolean(entertainerDraft.profileId)) ||
    (setupRole === "venue" && Boolean(venueDraft.venueId));

  const initialStepIndex = hasDraft
    ? firstIncompleteWizardStepIndex(
        setupRole,
        {
          actName: entertainerDraft.actName,
          category: entertainerDraft.category,
          genres: entertainerDraft.genres,
          description: entertainerDraft.description,
          berlinBase: entertainerDraft.berlinBase,
          priceMaxCents: entertainerDraft.priceMaxCents,
          hasLink: Boolean(
            entertainerDraft.websiteUrl.trim() ||
            entertainerDraft.instagramUrl.trim() ||
            entertainerDraft.youtubeUrl.trim() ||
            entertainerDraft.hasExternalOrVideoLink,
          ),
          imageCount: entertainerDraft.imageCount,
          legalComplete,
        },
        {
          name: venueDraft.name,
          venueType: venueDraft.venueType,
          shortDescription: venueDraft.shortDescription,
          addressLine1: venueDraft.addressLine1,
          district: venueDraft.district,
          postalCode: venueDraft.postalCode,
          capacity: venueDraft.capacity,
          audienceDescription: venueDraft.audienceDescription,
          imageCount: venueDraft.imageCount,
          legalComplete,
        },
      )
    : 0;

  return (
    <OnboardingSetupWizard
      locale={locale as "en" | "de"}
      role={setupRole}
      accountEmail={accountEmail}
      entertainerDraft={entertainerDraft}
      venueDraft={venueDraft}
      portfolioItems={initialPortfolio}
      legalIdentity={legalIdentity}
      initialStepIndex={initialStepIndex}
    />
  );
}
