import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/src/i18n/navigation";
import { auth } from "@/src/auth";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("applyTitle"),
    description: t("applyDescription"),
    path: "/apply",
  });
}

/** Apply folds into self-serve XOR signup after OAuth. */
export default async function ApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  if (session?.user?.id) {
    if (session.user.roles.length > 0) {
      redirect({ href: "/marketplace", locale: locale as AppLocale });
    }
    redirect({
      href: "/onboarding/role-selection",
      locale: locale as AppLocale,
    });
  }

  redirect({ href: "/sign-in", locale: locale as AppLocale });
}
