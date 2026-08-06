import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { HelpArticleView } from "@/src/components/help-article-view";
import { auth } from "@/src/auth";
import { type AppLocale } from "@/src/i18n/routing";
import { getHelpArticle, listHelpSlugs } from "@/src/lib/help-content";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

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
  if (!article || article.audience !== "public") {
    const t = await getTranslations("help");
    return buildPublicMetadata({
      locale: locale as AppLocale,
      title: t("publicTitle"),
      description: t("publicBody"),
      path: `/help/${slug}`,
    });
  }

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: article.title,
    description: article.description,
    path: `/help/${slug}`,
  });
}

export default async function PublicHelpArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");
  const article = getHelpArticle(slug, locale as AppLocale);
  if (!article) {
    notFound();
  }

  if (article.audience === "members") {
    const session = await auth();
    if (session?.user) {
      redirect(`/${locale}/marketplace/help/${slug}`);
    }
    redirect(`/${locale}/sign-in`);
  }

  return (
    <HelpArticleView
      article={article}
      backHref="/help"
      backLabel={t("backToHelp")}
    />
  );
}
