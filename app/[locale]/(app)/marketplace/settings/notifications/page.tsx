import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { redirect } from "@/src/i18n/navigation";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";
import {
  getUserNotificationPreferences,
  getMarketingConsent,
} from "@/src/db/queries/notifications";
import { NotificationPreferencesForm } from "@/src/components/notification-preferences-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");

  return buildPrivateMetadata({
    locale: locale as AppLocale,
    title: t("title"),
    description: t("body"),
  });
}

export default async function NotificationSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");

  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/sign-in", locale: locale as "en" | "de" });
  }

  const preferences = await getUserNotificationPreferences(session.user.id);
  const marketingConsent = await getMarketingConsent(session.user.id);

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm font-medium text-[var(--text-muted)] sm:text-base">
          {t("body")}
        </p>
      </div>

      <NotificationPreferencesForm
        preferences={preferences}
        marketingConsent={marketingConsent ?? null}
      />
    </section>
  );
}
