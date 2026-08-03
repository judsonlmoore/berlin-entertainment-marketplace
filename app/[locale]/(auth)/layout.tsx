import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/src/components/public-header";
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

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <PublicHeader signedIn={Boolean(session?.user)} showApplyCta />
      <main className="shell py-8 sm:py-12">{children}</main>
    </div>
  );
}
