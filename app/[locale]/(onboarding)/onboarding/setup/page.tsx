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

  // Profile already created — never re-show onboarding setup.
  if (destination === "none") {
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

  const entertainerDraft: EntertainerDraft = {
    actName: "",
    category: "",
    genres: "",
    description: "",
  };

  const venueDraft: VenueDraft = {
    venueId: null,
    name: "",
    venueType: "",
    shortDescription: "",
  };

  if (setupRole === "entertainer") {
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.userId, userId),
      columns: { id: true },
    });
    if (profile) {
      redirect({ href: "/profile", locale: locale as AppLocale });
    }
  } else {
    const membership = await db.query.venueMemberships.findFirst({
      where: and(
        eq(venueMemberships.userId, userId),
        eq(venueMemberships.status, "active"),
        eq(venueMemberships.role, "owner"),
      ),
      columns: { venueId: true },
    });
    if (membership) {
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, membership.venueId),
        columns: { id: true },
      });
      if (venue) {
        redirect({ href: "/profile", locale: locale as AppLocale });
      }
    }
  }

  return (
    <OnboardingSetupWizard
      locale={locale as "en" | "de"}
      role={setupRole}
      accountEmail={accountEmail}
      entertainerDraft={entertainerDraft}
      venueDraft={venueDraft}
    />
  );
}
