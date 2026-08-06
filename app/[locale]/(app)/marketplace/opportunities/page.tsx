import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { can } from "@/src/domain/permissions";
import { redirect } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/**
 * Legacy top-level open-call browse — redirects into Marketplace venues
 * (talent) or profile open-call manage (buyers).
 */
export default async function OpportunitiesBrowseRedirect({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireDiscoveryAccess();
  const appLocale = locale as AppLocale;

  if (!access.ok) {
    redirect({ href: "/marketplace", locale: appLocale });
    return;
  }

  if (can(access.actor, "discover.venues")) {
    redirect({ href: "/marketplace/venues", locale: appLocale });
    return;
  }

  if (can(access.actor, "venue.create")) {
    redirect({ href: "/profile", locale: appLocale });
    return;
  }

  redirect({ href: "/marketplace", locale: appLocale });
}
