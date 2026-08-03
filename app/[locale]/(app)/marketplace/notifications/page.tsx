import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/src/auth";
import { redirect } from "@/src/i18n/navigation";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPrivateMetadata } from "@/src/lib/seo-metadata";
import { getUserNotifications } from "@/db/queries/notifications";
import { NotificationList } from "@/src/components/notification-list";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");

  return buildPrivateMetadata({
    locale: locale as AppLocale,
    title: t("centerTitle"),
    description: t("body"),
  });
}

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const notifications = await getUserNotifications({
    userId: session.user.id,
    limit: 50,
  });

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
            {t("centerTitle")}
          </h1>
          <p className="mt-3 text-sm font-medium text-[var(--text-muted)] sm:text-base">
            {t("body")}
          </p>
        </div>
        <Link
          href="/marketplace/settings/notifications"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Settings →
        </Link>
      </div>

      <NotificationList notifications={notifications} />
    </section>
  );
}
