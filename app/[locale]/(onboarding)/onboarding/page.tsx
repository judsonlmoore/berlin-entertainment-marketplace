import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
import type { AppLocale } from "@/src/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

/** `/onboarding` routes into role selection, profile setup, or marketplace. */
export default async function OnboardingIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as AppLocale });
  }

  const destination = await resolveOnboardingDestination({
    userId: session!.user!.id!,
    isPlatformStaff: Boolean(session!.user!.isPlatformStaff),
    sessionRoles: session!.user!.roles,
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
  redirect({ href: "/profile", locale: locale as AppLocale });
}
