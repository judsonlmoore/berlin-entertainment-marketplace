import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalDocumentView } from "@/src/components/legal-document";
import { getLegalDocument } from "@/src/lib/legal-content";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const document = getLegalDocument("dpa", locale as AppLocale);

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: document.title,
    description: document.description,
    path: "/dpa",
  });
}

export default async function DpaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDocumentView slug="dpa" locale={locale as AppLocale} />;
}
