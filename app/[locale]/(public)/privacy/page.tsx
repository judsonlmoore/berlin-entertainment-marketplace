import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">{t("body")}</p>
    </section>
  );
}
