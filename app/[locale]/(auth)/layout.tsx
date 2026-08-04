import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/src/components/public-header";
import { PublicFooter } from "@/src/components/public-footer";
import { auth } from "@/src/auth";
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
    title: t("signInTitle"),
    description: t("signInDescription"),
  });
}

export default async function AuthLayout({ children }: Props) {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const needsApplication =
    signedIn &&
    !session?.user?.isPlatformStaff &&
    (!session?.user?.roles || session.user.roles.length === 0);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <PublicHeader signedIn={signedIn} showApplyCta={needsApplication} />
      <main className="shell flex-1 py-8 sm:py-12">{children}</main>
      <PublicFooter />
    </div>
  );
}
