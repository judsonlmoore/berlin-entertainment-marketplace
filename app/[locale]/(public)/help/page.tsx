import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpIndexView } from "@/src/components/help-index-view";
import { type AppLocale } from "@/src/i18n/routing";
import { listPublicHelpArticles } from "@/src/lib/help-content";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("publicTitle"),
    description: t("publicBody"),
    path: "/help",
  });
}

export default async function PublicHelpIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");
  const articles = listPublicHelpArticles(locale as AppLocale);

  return (
    <HelpIndexView
      title={t("publicTitle")}
      body={t("publicBody")}
      articles={articles}
      articleBasePath="/help"
      contactHref="/contact"
      contactLabel={t("contactCta")}
    />
  );
}
