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
    <div className="shell py-8 sm:py-12">
      <section className="mx-auto max-w-2xl">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {t("title")}
        </h1>
        <p className="mt-4 font-medium text-[var(--text-muted)]">{t("body")}</p>
        {session?.user ? (
          <div className="panel mt-8 p-6">
            <ApplicationForm
              locale={locale as "en" | "de"}
              defaultName={session.user.name ?? ""}
              defaultEmail={session.user.email ?? ""}
              existingRoles={session.user.roles}
            />
          </div>
        ) : (
          <p className="panel mt-8 p-6 font-medium">
            {t("signedOutHint")} <Link href="/sign-in">{nav("signIn")}</Link>
          </p>
        )}
      </section>
    </div>
  );
}
