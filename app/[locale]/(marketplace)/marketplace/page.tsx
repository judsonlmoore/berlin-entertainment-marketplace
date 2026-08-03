import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function MarketplacePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="display text-4xl">{t("title")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-[var(--muted)]">{t("body")}</p>
      <p className="mt-3 text-sm text-[var(--muted)]">{t("contactPrivacy")}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/marketplace/entertainers"
          className="panel px-5 py-6 no-underline"
        >
          <h2 className="display text-2xl">{t("entertainersTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("entertainersBody")}
          </p>
        </Link>
        <Link
          href="/marketplace/venues"
          className="panel px-5 py-6 no-underline"
        >
          <h2 className="display text-2xl">{t("venuesTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{t("venuesBody")}</p>
        </Link>
        <Link
          href="/marketplace/opportunities"
          className="panel px-5 py-6 no-underline"
        >
          <h2 className="display text-2xl">{t("opportunitiesTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("opportunitiesBody")}
          </p>
        </Link>
      </div>
    </section>
  );
}
