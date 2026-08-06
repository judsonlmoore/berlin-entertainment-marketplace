import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HelpArticleView } from "@/src/components/help-article-view";
import { type AppLocale } from "@/src/i18n/routing";
import { getHelpArticle, listHelpSlugs } from "@/src/lib/help-content";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return listHelpSlugs().flatMap((slug) =>
    (["en", "de"] as const).map((locale) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = getHelpArticle(slug, locale as AppLocale);
  const t = await getTranslations("help");

  return buildPrivateMetadata({
    locale: locale as AppLocale,
    title: article?.title ?? t("membersTitle"),
    description: article?.description ?? t("membersBody"),
  });
}

export default async function MemberHelpArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");
  const article = getHelpArticle(slug, locale as AppLocale);
  if (!article) {
    notFound();
  }

  return (
    <HelpArticleView
      article={article}
      backHref="/marketplace/help"
      backLabel={t("backToHelp")}
    />
  );
}
