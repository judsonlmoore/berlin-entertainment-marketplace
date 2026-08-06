import { eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import { userRoles } from "@/src/db/schema/marketplace";
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

  // Staff skip the member onboarding ceremony.
  if (isPlatformStaff) {
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

  // After basics save, the server action revalidates and remounts this page.
  // Profile existence means destination === "none" — keep the completion step
  // until the user clicks Continue (do not auto-redirect to /profile).
  const initialPhase = destination === "none" ? "done" : "basics";

  return (
    <OnboardingSetupWizard
      locale={locale as "en" | "de"}
      role={setupRole}
      accountEmail={accountEmail}
      entertainerDraft={entertainerDraft}
      venueDraft={venueDraft}
      initialPhase={initialPhase}
    />
  );
}
