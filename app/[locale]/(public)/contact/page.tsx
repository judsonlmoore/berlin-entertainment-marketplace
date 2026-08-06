import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SupportContactForm } from "@/src/components/support-contact-form";
import { auth } from "@/src/auth";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ source?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("title"),
    description: t("body"),
    path: "/contact",
  });
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const session = await auth();
  const source = query.source === "app_help" ? "app_help" : "public_contact";

  return (
    <section className="shell grid gap-8 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm font-medium text-[var(--text-muted)] sm:text-base">
          {t("body")}
        </p>
      </div>
      <SupportContactForm
        source={source}
        defaultName={session?.user?.name ?? ""}
        defaultEmail={session?.user?.email ?? ""}
      />
    </section>
  );
}
