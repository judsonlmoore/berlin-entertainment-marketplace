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
    title: t("subProcessorsTitle"),
    description: t("subProcessorsDescription"),
    path: "/sub-processors",
  });
}

export default async function SubProcessorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("subProcessors");

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
          <h2>{t("listTitle")}</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("subProcessorName")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("purpose")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("location")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("safeguards")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3">
                    <strong>Vercel Inc.</strong>
                    <br />
                    <a
                      href="https://vercel.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      vercel.com
                    </a>
                  </td>
                  <td className="px-4 py-3">{t("vercelPurpose")}</td>
                  <td className="px-4 py-3">{t("vercelLocation")}</td>
                  <td className="px-4 py-3">{t("vercelSafeguards")}</td>
                </tr>

                <tr>
                  <td className="px-4 py-3">
                    <strong>Neon (Neon Tech Inc.)</strong>
                    <br />
                    <a
                      href="https://neon.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      neon.tech
                    </a>
                  </td>
                  <td className="px-4 py-3">{t("neonPurpose")}</td>
                  <td className="px-4 py-3">{t("neonLocation")}</td>
                  <td className="px-4 py-3">{t("neonSafeguards")}</td>
                </tr>

                <tr>
                  <td className="px-4 py-3">
                    <strong>Google LLC</strong>
                    <br />
                    <a
                      href="https://google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      google.com
                    </a>
                  </td>
                  <td className="px-4 py-3">{t("googlePurpose")}</td>
                  <td className="px-4 py-3">{t("googleLocation")}</td>
                  <td className="px-4 py-3">{t("googleSafeguards")}</td>
                </tr>

                <tr>
                  <td className="px-4 py-3">
                    <strong>Microsoft Corporation</strong>
                    <br />
                    <a
                      href="https://microsoft.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      microsoft.com
                    </a>
                  </td>
                  <td className="px-4 py-3">{t("microsoftPurpose")}</td>
                  <td className="px-4 py-3">{t("microsoftLocation")}</td>
                  <td className="px-4 py-3">{t("microsoftSafeguards")}</td>
                </tr>

                <tr>
                  <td className="px-4 py-3">
                    <strong>GitHub, Inc.</strong>
                    <br />
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      github.com
                    </a>
                  </td>
                  <td className="px-4 py-3">{t("githubPurpose")}</td>
                  <td className="px-4 py-3">{t("githubLocation")}</td>
                  <td className="px-4 py-3">{t("githubSafeguards")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>{t("updatesTitle")}</h2>
          <p>{t("updatesBody")}</p>
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
