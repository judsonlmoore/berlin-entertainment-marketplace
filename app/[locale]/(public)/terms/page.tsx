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
    title: t("termsTitle"),
    description: t("termsDescription"),
    path: "/terms",
  });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <div className="shell py-8 sm:py-12">
      <article className="prose mx-auto max-w-3xl">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {t("title")}
        </h1>
        <p className="lead">{t("lastUpdated")}</p>

        <section>
          <h2>{t("introTitle")}</h2>
          <p>{t("introBody")}</p>
        </section>

        <section>
          <h2>{t("providerTitle")}</h2>
          <p>
            <strong>Moore World Wide Enterprises, LLC</strong>
            <br />
            {t("doingBusinessAs")}: Moore World Wide Enterprises / MWWE
            <br />
            <br />
            {t("registeredOffice")}:
            <br />
            2102 Quail Hollow Dr
            <br />
            Bryan, Texas 77802
            <br />
            United States
            <br />
            <br />
            {t("representedBy")}: Judson Moore (President & CEO)
            <br />
            {t("contactEmail")}: <a href="mailto:hello@moorewwe.com">hello@moorewwe.com</a>
          </p>
        </section>

        <section>
          <h2>{t("serviceDescriptionTitle")}</h2>
          <p>{t("serviceDescriptionBody")}</p>
        </section>

        <section>
          <h2>{t("accountRequirementsTitle")}</h2>
          <p>{t("accountRequirementsBody")}</p>
          <ul>
            <li>{t("accountReq1")}</li>
            <li>{t("accountReq2")}</li>
            <li>{t("accountReq3")}</li>
            <li>{t("accountReq4")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("approvalProcessTitle")}</h2>
          <p>{t("approvalProcessBody")}</p>
        </section>

        <section>
          <h2>{t("userObligationsTitle")}</h2>
          <ul>
            <li>{t("userObligation1")}</li>
            <li>{t("userObligation2")}</li>
            <li>{t("userObligation3")}</li>
            <li>{t("userObligation4")}</li>
            <li>{t("userObligation5")}</li>
            <li>{t("userObligation6")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("bookingsTitle")}</h2>
          <p>{t("bookingsBody")}</p>
        </section>

        <section>
          <h2>{t("paymentsTitle")}</h2>
          <p>{t("paymentsBody")}</p>
        </section>

        <section>
          <h2>{t("intellectualPropertyTitle")}</h2>
          <p>{t("intellectualPropertyBody")}</p>
        </section>

        <section>
          <h2>{t("prohibitedConductTitle")}</h2>
          <ul>
            <li>{t("prohibited1")}</li>
            <li>{t("prohibited2")}</li>
            <li>{t("prohibited3")}</li>
            <li>{t("prohibited4")}</li>
            <li>{t("prohibited5")}</li>
            <li>{t("prohibited6")}</li>
            <li>{t("prohibited7")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("suspensionTitle")}</h2>
          <p>{t("suspensionBody")}</p>
        </section>

        <section>
          <h2>{t("disclaimersTitle")}</h2>
          <p>{t("disclaimersBody")}</p>
        </section>

        <section>
          <h2>{t("limitationLiabilityTitle")}</h2>
          <p>{t("limitationLiabilityBody")}</p>
        </section>

        <section>
          <h2>{t("indemnificationTitle")}</h2>
          <p>{t("indemnificationBody")}</p>
        </section>

        <section>
          <h2>{t("dataProtectionTitle")}</h2>
          <p>
            {t("dataProtectionBody")}{" "}
            <a href={`/${locale}/privacy`}>{t("privacyPolicyLink")}</a>
            {" "}{t("and")}{" "}
            <a href={`/${locale}/dpa`}>{t("dpaLink")}</a>
          </p>
        </section>

        <section>
          <h2>{t("terminationTitle")}</h2>
          <p>{t("terminationBody")}</p>
        </section>

        <section>
          <h2>{t("governingLawTitle")}</h2>
          <p>{t("governingLawBody")}</p>
        </section>

        <section>
          <h2>{t("changesTitle")}</h2>
          <p>{t("changesBody")}</p>
        </section>

        <section>
          <h2>{t("contactTitle")}</h2>
          <p>
            {t("contactBody")}
            <br />
            <br />
            <strong>Moore World Wide Enterprises, LLC</strong>
            <br />
            2102 Quail Hollow Dr
            <br />
            Bryan, Texas 77802
            <br />
            United States
            <br />
            Email: <a href="mailto:hello@moorewwe.com">hello@moorewwe.com</a>
          </p>
        </section>
      </article>
    </div>
  );
}
