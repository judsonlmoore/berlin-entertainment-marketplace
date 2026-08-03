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
    title: t("dpaTitle"),
    description: t("dpaDescription"),
    path: "/dpa",
  });
}

export default async function DpaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dpa");

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
          <h2>{t("definitionsTitle")}</h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold">{t("controllerLabel")}</dt>
              <dd>{t("controllerDefinition")}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("processorLabel")}</dt>
              <dd>{t("processorDefinition")}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("dataSubjectLabel")}</dt>
              <dd>{t("dataSubjectDefinition")}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t("personalDataLabel")}</dt>
              <dd>{t("personalDataDefinition")}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>{t("scopeTitle")}</h2>
          <p>{t("scopeBody")}</p>
          <ul>
            <li>{t("scopeItem1")}</li>
            <li>{t("scopeItem2")}</li>
            <li>{t("scopeItem3")}</li>
            <li>{t("scopeItem4")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("instructionsTitle")}</h2>
          <p>{t("instructionsBody")}</p>
        </section>

        <section>
          <h2>{t("securityTitle")}</h2>
          <p>{t("securityBody")}</p>
          <ul>
            <li>{t("securityMeasure1")}</li>
            <li>{t("securityMeasure2")}</li>
            <li>{t("securityMeasure3")}</li>
            <li>{t("securityMeasure4")}</li>
            <li>{t("securityMeasure5")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("subProcessorsTitle")}</h2>
          <p>{t("subProcessorsBody")}</p>
          <p>
            {t("subProcessorsLink")}{" "}
            <a href={`/${locale}/sub-processors`}>
              {t("subProcessorsLinkText")}
            </a>
          </p>
        </section>

        <section>
          <h2>{t("dataSubjectRightsTitle")}</h2>
          <p>{t("dataSubjectRightsBody")}</p>
          <ul>
            <li>{t("rightAccess")}</li>
            <li>{t("rightRectification")}</li>
            <li>{t("rightErasure")}</li>
            <li>{t("rightRestriction")}</li>
            <li>{t("rightPortability")}</li>
            <li>{t("rightObject")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("dataBreachTitle")}</h2>
          <p>{t("dataBreachBody")}</p>
        </section>

        <section>
          <h2>{t("dataRetentionTitle")}</h2>
          <p>{t("dataRetentionBody")}</p>
        </section>

        <section>
          <h2>{t("dataTransferTitle")}</h2>
          <p>{t("dataTransferBody")}</p>
        </section>

        <section>
          <h2>{t("auditTitle")}</h2>
          <p>{t("auditBody")}</p>
        </section>

        <section>
          <h2>{t("terminationTitle")}</h2>
          <p>{t("terminationBody")}</p>
        </section>

        <section>
          <h2>{t("contactTitle")}</h2>
          <p>
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
