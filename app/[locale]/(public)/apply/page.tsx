import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { ApplicationForm } from "@/src/components/application-form";
import { Link } from "@/src/i18n/navigation";
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

export default async function ApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("apply");
  const nav = await getTranslations("nav");
  const session = await auth();

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-[var(--muted)]">{t("body")}</p>
      {session?.user ? (
        <div className="panel mt-8 p-6">
          <ApplicationForm
            locale={locale as "en" | "de"}
            defaultName={session.user.name ?? ""}
            defaultEmail={session.user.email ?? ""}
          />
        </div>
      ) : (
        <p className="panel mt-8 p-6">
          {t("signedOutHint")} <Link href="/sign-in">{nav("signIn")}</Link>
        </p>
      )}
    </section>
  );
}
