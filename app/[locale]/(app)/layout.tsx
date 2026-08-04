import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { AuthenticatedChrome } from "@/src/components/authenticated-chrome";
import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { can } from "@/src/domain/permissions";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";
import { loadRailRoleContext } from "@/src/lib/rail-role-context";

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
 * Authenticated marketplace shell. Incomplete onboarding is sent to the
 * sidebar-free XOR flow before this chrome is shown.
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

  if (process.env.DATABASE_URL) {
    const actor = await getActorContext(user.id!);
    if (actor) {
      isApproved = can(actor, "marketplace.discover");
      canDiscoverEntertainers = can(actor, "discover.entertainers");
      canDiscoverVenues = can(actor, "discover.venues");
      roleContext = await loadRailRoleContext(actor);
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
    >
      {children}
    </AuthenticatedChrome>
  );
}
