import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/src/components/public-header";
import { PublicFooter } from "@/src/components/public-footer";
import { auth } from "@/src/auth";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("siteTitle"),
    description: t("siteDescription"),
  });
}

export default async function PublicLayout({ children }: Props) {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const needsApplication =
    signedIn &&
    !session?.user?.isPlatformStaff &&
    session?.user?.approvalState !== "approved";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <PublicHeader signedIn={signedIn} showApplyCta={needsApplication} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
