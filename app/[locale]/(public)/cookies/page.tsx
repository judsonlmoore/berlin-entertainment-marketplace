import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("cookiesTitle"),
    description: t("cookiesDescription"),
    path: "/cookies",
  });
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookiePolicy");

  return (
    <div className="shell py-8 sm:py-12">
      <article className="prose mx-auto max-w-3xl">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {t("title")}
        </h1>
        <p className="lead">{t("lastUpdated")}</p>

        <section>
          <h2>{t("whatAreCookiesTitle")}</h2>
          <p>{t("whatAreCookiesBody")}</p>
        </section>

        <section>
          <h2>{t("howWeUseTitle")}</h2>
          <p>{t("howWeUseBody")}</p>
        </section>

        <section>
          <h3>{t("necessaryCookiesTitle")}</h3>
          <p>{t("necessaryCookiesBody")}</p>
          <ul>
            <li>
              <strong>cc_cookie</strong> — {t("ccCookieDesc")}
            </li>
            <li>
              <strong>authjs.session-token</strong> — {t("sessionCookieDesc")}
            </li>
            <li>
              <strong>authjs.csrf-token</strong> — {t("csrfCookieDesc")}
            </li>
          </ul>
        </section>

        <section>
          <h3>{t("analyticsCookiesTitle")}</h3>
          <p>{t("analyticsCookiesBody")}</p>
          <ul>
            <li>
              <strong>_ga, _gid, _gat</strong> — {t("googleAnalyticsDesc")}
            </li>
            <li>
              <strong>_clck, _clsk, CLID</strong> — {t("clarityDesc")}
            </li>
          </ul>
        </section>

        <section>
          <h3>{t("marketingCookiesTitle")}</h3>
          <p>{t("marketingCookiesBody")}</p>
        </section>

        <section>
          <h2>{t("managePreferencesTitle")}</h2>
          <p>{t("managePreferencesBody")}</p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && "CookieConsent" in window) {
                (
                  window as { CookieConsent?: { showPreferences: () => void } }
                ).CookieConsent?.showPreferences();
              }
            }}
            className="btn-primary mt-4"
          >
            {t("manageButton")}
          </button>
        </section>

        <section>
          <h2>{t("browserSettingsTitle")}</h2>
          <p>{t("browserSettingsBody")}</p>
        </section>

        <section>
          <h2>{t("contactTitle")}</h2>
          <p>
            {t("contactBody")}{" "}
            <a href="mailto:hello@moorewwe.com">hello@moorewwe.com</a>
          </p>
        </section>
      </article>
    </div>
  );
}
