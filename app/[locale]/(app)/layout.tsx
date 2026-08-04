import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { AuthenticatedChrome } from "@/src/components/authenticated-chrome";
import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { can } from "@/src/domain/permissions";
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
 * Shared authenticated shell for marketplace, profile, onboarding, and admin.
 * Keeping these under one layout preserves the rail/header across soft navigations.
 */
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as "en" | "de" });
  }

  const user = session!.user!;
  const isStaff = Boolean(user.isPlatformStaff);
  let isApproved = user.approvalState === "approved" || isStaff;
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
