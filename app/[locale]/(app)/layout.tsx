import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { AuthenticatedChrome } from "@/src/components/authenticated-chrome";
import { SupportModeBanner } from "@/src/components/support-mode-banner";
import { auth } from "@/src/auth";
import { can } from "@/src/domain/permissions";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { getOnboardingChecklistView } from "@/src/db/queries/onboarding-checklist";
import {
  discoveryNavFlags,
  loadRailRoleContext,
} from "@/src/lib/rail-role-context";
import { supportDiscoveryFlags } from "@/src/lib/support-overlay";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta");

  return buildPrivateMetadata({
    locale: locale as AppLocale,
    title: t("appDefaultTitle"),
    description: t("appDefaultDescription"),
  });
}

/**
 * Authenticated marketplace shell. Incomplete onboarding (no role, or role
 * without a created profile/venue) is sent to the sidebar-free XOR flow.
 * Draft profile edits must not bounce members back into onboarding.
 */
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as AppLocale });
  }

  const user = session!.user!;
  const isStaff = Boolean(user.isPlatformStaff);

  const destination = await resolveOnboardingDestination({
    userId: user.id!,
    isPlatformStaff: isStaff,
    sessionRoles: user.roles,
  });
  if (destination === "role") {
    redirect({
      href: "/onboarding/role-selection",
      locale: locale as AppLocale,
    });
  }
  if (destination === "setup") {
    redirect({ href: "/onboarding/setup", locale: locale as AppLocale });
  }

  let isApproved =
    user.accountStatus === "active" ||
    (user.accountStatus === null && isStaff) ||
    isStaff;
  let canDiscoverEntertainers = isStaff;
  let canDiscoverVenues = isStaff;
  let roleContext = null;
  let support = null;
  let onboardingChecklist = null;

  if (process.env.DATABASE_URL) {
    const resolved = await resolveEffectiveActor(user.id!);
    if (resolved) {
      support = resolved.support;
      const effectiveActor = resolved.actor;

      if (support) {
        roleContext = {
          mode: support.entityType,
          label: support.label,
          canSwitch: false,
          otherMode: null,
        };
      } else {
        roleContext = await loadRailRoleContext(resolved.staffActor);
        onboardingChecklist = await getOnboardingChecklistView({
          actor: effectiveActor,
        });
      }

      isApproved = can(effectiveActor, "marketplace.discover");
      const discovery = supportDiscoveryFlags(support);
      if (discovery) {
        canDiscoverEntertainers = discovery.canDiscoverEntertainers;
        canDiscoverVenues = discovery.canDiscoverVenues;
      } else {
        const flags = discoveryNavFlags(effectiveActor);
        canDiscoverEntertainers = flags.canDiscoverEntertainers;
        canDiscoverVenues = flags.canDiscoverVenues;
      }
    }
  }

  return (
    <AuthenticatedChrome
      locale={locale}
      userName={user.name ?? user.email ?? "Member"}
      userImage={user.image}
      isStaff={isStaff}
      isApproved={isApproved}
      canDiscoverEntertainers={canDiscoverEntertainers}
      canDiscoverVenues={canDiscoverVenues}
      roleContext={roleContext}
      onboardingChecklist={onboardingChecklist}
      supportBanner={
        support ? (
          <SupportModeBanner locale={locale as "en" | "de"} support={support} />
        ) : null
      }
    >
      {children}
    </AuthenticatedChrome>
  );
}
