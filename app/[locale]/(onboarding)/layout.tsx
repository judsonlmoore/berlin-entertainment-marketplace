import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { Link } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { signOutAction } from "@/src/actions/auth";
import { resolveOnboardingDestination } from "@/src/lib/onboarding-gate";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";

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
 * Sidebar-free shell for XOR onboarding (role + profile setup).
 */
export default async function OnboardingLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/sign-in", locale: locale as AppLocale });
  }

  const user = session!.user!;
  const destination = await resolveOnboardingDestination({
    userId: user.id!,
    isPlatformStaff: Boolean(user.isPlatformStaff),
    sessionRoles: user.roles,
  });

  if (destination === "none") {
    redirect({ href: "/marketplace", locale: locale as AppLocale });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)]">
        <div className="shell flex min-h-14 items-center justify-between py-3">
          <Link href="/" className="display text-2xl font-medium no-underline">
            Salon
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-[var(--text-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </header>
      <main className="shell py-10 sm:py-14">{children}</main>
    </div>
  );
}
