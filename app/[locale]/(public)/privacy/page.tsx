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
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    path: "/privacy",
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

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
          <h2>{t("controllerTitle")}</h2>
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
          <h2>{t("dataWeCollectTitle")}</h2>
          <h3>{t("accountDataTitle")}</h3>
          <p>{t("accountDataBody")}</p>

          <h3>{t("profileDataTitle")}</h3>
          <p>{t("profileDataBody")}</p>

          <h3>{t("bookingDataTitle")}</h3>
          <p>{t("bookingDataBody")}</p>

          <h3>{t("technicalDataTitle")}</h3>
          <p>{t("technicalDataBody")}</p>
        </section>

        <section>
          <h2>{t("legalBasisTitle")}</h2>
          <ul>
            <li>
              <strong>{t("contractBasisLabel")}</strong> — {t("contractBasisBody")}
            </li>
            <li>
              <strong>{t("legitimateInterestLabel")}</strong> — {t("legitimateInterestBody")}
            </li>
            <li>
              <strong>{t("consentBasisLabel")}</strong> — {t("consentBasisBody")}
            </li>
            <li>
              <strong>{t("legalObligationLabel")}</strong> — {t("legalObligationBody")}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t("howWeUseTitle")}</h2>
          <ul>
            <li>{t("useProvideServices")}</li>
            <li>{t("useManageAccounts")}</li>
            <li>{t("useFacilitateBookings")}</li>
            <li>{t("usePreventFraud")}</li>
            <li>{t("useComply")}</li>
            <li>{t("useImprove")}</li>
            <li>{t("useCommunicate")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("sharingTitle")}</h2>
          <p>{t("sharingBody")}</p>
          <ul>
            <li>
              <strong>{t("sharingApprovedMembers")}</strong> — {t("sharingApprovedMembersBody")}
            </li>
            <li>
              <strong>{t("sharingServiceProviders")}</strong> — {t("sharingServiceProvidersBody")}
            </li>
            <li>
              <strong>{t("sharingLegal")}</strong> — {t("sharingLegalBody")}
            </li>
          </ul>
          <p>
            {t("subProcessorsLink")}{" "}
            <a href={`/${locale}/sub-processors`}>{t("subProcessorsLinkText")}</a>
          </p>
        </section>

        <section>
          <h2>{t("internationalTransfersTitle")}</h2>
          <p>{t("internationalTransfersBody")}</p>
        </section>

        <section>
          <h2>{t("retentionTitle")}</h2>
          <p>{t("retentionBody")}</p>
        </section>

        <section>
          <h2>{t("yourRightsTitle")}</h2>
          <ul>
            <li>
              <strong>{t("rightAccessLabel")}</strong> — {t("rightAccessBody")}
            </li>
            <li>
              <strong>{t("rightRectificationLabel")}</strong> — {t("rightRectificationBody")}
            </li>
            <li>
              <strong>{t("rightErasureLabel")}</strong> — {t("rightErasureBody")}
            </li>
            <li>
              <strong>{t("rightRestrictionLabel")}</strong> — {t("rightRestrictionBody")}
            </li>
            <li>
              <strong>{t("rightPortabilityLabel")}</strong> — {t("rightPortabilityBody")}
            </li>
            <li>
              <strong>{t("rightObjectLabel")}</strong> — {t("rightObjectBody")}
            </li>
            <li>
              <strong>{t("rightWithdrawLabel")}</strong> — {t("rightWithdrawBody")}
            </li>
            <li>
              <strong>{t("rightComplainLabel")}</strong> — {t("rightComplainBody")}
            </li>
          </ul>
          <p>{t("exerciseRights")}</p>
        </section>

        <section>
          <h2>{t("securityTitle")}</h2>
          <p>{t("securityBody")}</p>
        </section>

        <section>
          <h2>{t("cookiesTitle")}</h2>
          <p>
            {t("cookiesBody")}{" "}
            <a href={`/${locale}/cookies`}>{t("cookiePolicyLink")}</a>
          </p>
        </section>

        <section>
          <h2>{t("childrenTitle")}</h2>
          <p>{t("childrenBody")}</p>
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
