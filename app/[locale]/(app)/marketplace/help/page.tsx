import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpIndexView } from "@/src/components/help-index-view";
import { type AppLocale } from "@/src/i18n/routing";
import { listMemberHelpArticles } from "@/src/lib/help-content";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");

  return buildPrivateMetadata({
    locale: locale as AppLocale,
    title: t("membersTitle"),
    description: t("membersBody"),
  });
}

export default async function MemberHelpIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");
  const articles = listMemberHelpArticles(locale as AppLocale);

  return (
    <HelpIndexView
      title={t("membersTitle")}
      body={t("membersBody")}
      articles={articles}
      articleBasePath="/marketplace/help"
      contactHref="/contact?source=app_help"
      contactLabel={t("contactCta")}
    />
  );
}
