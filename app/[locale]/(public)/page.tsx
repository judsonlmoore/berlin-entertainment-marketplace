import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
      <div>
        <p className="display text-5xl leading-none sm:text-6xl">Salon</p>
        <h1 className="display mt-6 max-w-xl text-3xl leading-tight sm:text-4xl">
          {t("headline")}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">{t("body")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/apply"
            className="bg-[var(--accent)] px-5 py-3 text-[var(--background)] no-underline"
          >
            {t("ctaApply")}
          </Link>
          <Link href="/sign-in" className="panel px-5 py-3 no-underline">
            {t("ctaSignIn")}
          </Link>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="min-h-72"
        style={{
          background:
            "linear-gradient(145deg, #0f4c5c 0%, #243b36 45%, #8a5a34 100%)",
        }}
      />
    </section>
  );
}
