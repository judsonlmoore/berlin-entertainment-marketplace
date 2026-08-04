import { and, eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  entertainerProfiles,
  userRoles,
  venueMemberships,
  venues,
} from "@/src/db/schema/marketplace";
import {
  OnboardingSetupWizard,
  type EntertainerDraft,
  type VenueDraft,
} from "@/src/components/onboarding-setup-wizard";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
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
  const destination = await resolveOnboardingDestination({
    userId,
    isPlatformStaff: Boolean(session!.user!.isPlatformStaff),
    sessionRoles: session!.user!.roles,
  });

  if (destination === "role") {
    redirect({
      href: "/onboarding/role-selection",
      locale: locale as AppLocale,
    });
  }
  if (destination === "none") {
    redirect({ href: "/marketplace", locale: locale as AppLocale });
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

  const defaultEmail = session!.user!.email ?? "";

  let entertainerDraft: EntertainerDraft = {
    actName: "",
    category: "",
    description: "",
    groupSize: "1",
    berlinBase: "",
    travelRadiusKm: "25",
    priceMinEur: "0",
    priceMaxEur: "0",
    durationMinutes: "60",
    technicalRequirements: "",
    contactEmail: defaultEmail,
  };

  let venueDraft: VenueDraft = {
    venueId: null,
    name: "",
    shortDescription: "",
    venueType: "",
    addressLine1: "",
    district: "",
    postalCode: "",
    audienceDescription: "",
    capacity: "50",
    capacityContext: "",
    productionNotes: "",
    contactEmail: defaultEmail,
  };

  if (setupRole === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, userId),
    });
    if (profile) {
      entertainerDraft = {
        actName: profile.actName,
        category: profile.category,
        description: profile.description,
        groupSize: String(profile.groupSize),
        berlinBase: profile.berlinBase,
        travelRadiusKm: String(profile.travelRadiusKm),
        priceMinEur: String(Math.round(profile.priceMinCents / 100)),
        priceMaxEur: String(Math.round(profile.priceMaxCents / 100)),
        durationMinutes: String(profile.durationMinutes),
        technicalRequirements: profile.technicalRequirements,
        contactEmail: defaultEmail,
      };
    }
  } else {
    const membership = await db.query.venueMemberships.findFirst({
      where: and(
        eq(venueMemberships.userId, userId),
        eq(venueMemberships.status, "active"),
        eq(venueMemberships.role, "owner"),
      ),
    });
    if (membership) {
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, membership.venueId),
      });
      if (venue) {
        const production = venue.productionResources as Record<string, string>;
        venueDraft = {
          venueId: venue.id,
          name: venue.name,
          shortDescription: venue.shortDescription,
          venueType: venue.venueType,
          addressLine1: venue.addressLine1,
          district: venue.district,
          postalCode: venue.postalCode,
          audienceDescription: venue.audienceDescription,
          capacity: String(venue.capacity),
          capacityContext: venue.capacityContext ?? "",
          productionNotes: production.notes ?? "",
          contactEmail: defaultEmail,
        };
      }
    }
  }

  return (
    <OnboardingSetupWizard
      locale={locale as "en" | "de"}
      role={setupRole}
      entertainerDraft={entertainerDraft}
      venueDraft={venueDraft}
    />
  );
}
