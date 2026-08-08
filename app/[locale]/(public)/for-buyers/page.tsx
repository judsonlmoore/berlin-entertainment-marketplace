import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";
import { getApprovedMemberCount } from "@/src/lib/member-count";
import { auth } from "@/src/auth";
import {
  FeaturedSection,
  HowItWorksFlow,
  ProblemSolutionBlock,
} from "@/src/components/marketing";
import { Monogram } from "@/src/components/ui/monogram";
import { Button } from "@/src/components/ui/button";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forBuyers");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/for-buyers",
  });
}

export default async function ForBuyersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forBuyers");
  const session = await auth();

  const memberCount = await getApprovedMemberCount();

  return (
    <div>
      {/* Hero Section */}
      <section className="border-b border-[var(--rule)] bg-[var(--canvas)] py-16 sm:py-20">
        <div className="shell max-w-4xl text-center">
          <p className="eyebrow text-[var(--accent)]">{t("eyebrow")}</p>
          <h1 className="display mt-3 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">
            {t("headline")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--text-muted)] sm:text-lg">
            {t("body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href={session?.user ? "/onboarding/role-selection" : "/sign-in"}>
                {t("ctaPrimary")}
              </Link>
            </Button>
            {!session?.user && (
              <Button asChild variant="secondary">
                <Link href="/sign-in">{t("ctaSecondary")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Problem Block */}
      <ProblemSolutionBlock
        problemTitle={t("problemTitle")}
        problemBody={t("problemBody")}
      />

      {/* Solution 1: Discover Local Talent */}
      <FeaturedSection
        title={t("solution1Title")}
        body={t("solution1Body")}
        imagePosition="left"
        background="surface"
        visual={
          <div className="grid gap-3">
            {[
              { key: "jazz", name: t("mockupJazzTrio"), format: t("mockupJazzFormat") },
              { key: "comedy", name: t("mockupComedyAct"), format: t("mockupComedyFormat") },
              { key: "dance", name: t("mockupDanceEnsemble"), format: t("mockupDanceFormat") },
            ].map((act, i) => (
              <div
                key={act.key}
                className="panel flex items-center gap-4 p-4"
              >
                <Monogram name={act.name} size="sm" colorSeed={`talent-${i}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{act.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {act.format}
                  </p>
                </div>
              </div>
            ))}
          </div>
        }
      />

      {/* Solution 2: Post Open Calls */}
      <FeaturedSection
        title={t("solution2Title")}
        body={t("solution2Body")}
        imagePosition="right"
        background="canvas"
        visual={
          <div className="panel p-6 sm:p-8">
            <div className="mb-4">
              <p className="text-sm font-semibold">{t("mockupOpenCallTitle")}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {t("mockupOpenCallType")} · {t("mockupOpenCallDate")}
              </p>
            </div>
            <div className="h-px bg-[var(--rule)]" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((n, i) => {
                const name = t("mockupActName", { n: String.fromCharCode(64 + n) });
                return (
                  <div
                    key={n}
                    className="flex items-center gap-3 rounded bg-[var(--canvas)] p-2"
                  >
                    <Monogram name={name} size="xs" colorSeed={`app-${i}`} />
                    <span className="text-xs">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />

      {/* Solution 3: Clear Agreements */}
      <FeaturedSection
        title={t("solution3Title")}
        body={t("solution3Body")}
        imagePosition="left"
        background="surface"
        visual={
          <div className="panel p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{t("mockupAgreementTitle")}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {t("mockupAgreementDate")}
                </p>
              </div>
              <div className="flex -space-x-2">
                <Monogram name="Venue" size="xs" colorSeed="venue-agree" />
                <Monogram name="Talent" size="xs" colorSeed="talent-agree" />
              </div>
            </div>
            <div className="h-px bg-[var(--rule)]" />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t("mockupAgreementTermsAgreed")}</span>
                <span className="font-medium text-[var(--primary)]">✓</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t("mockupAgreementBothSigned")}</span>
                <span className="font-medium text-[var(--primary)]">✓</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t("mockupAgreementCalendarsBlocked")}</span>
                <span className="font-medium text-[var(--primary)]">✓</span>
              </div>
            </div>
          </div>
        }
      />

      {/* Venue Types */}
      <section className="border-y border-[var(--rule)] bg-[var(--canvas)] py-10 sm:py-12">
        <div className="shell max-w-3xl text-center">
          <h2 className="page-title mb-3 text-xl sm:text-2xl">
            {t("venueTypesTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            {t("venueTypesBody")}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorksFlow
        title={t("howItWorksTitle")}
        steps={[
          {
            number: "01",
            title: t("howItWorksStep1"),
            body: t("howItWorksStep1Body"),
          },
          {
            number: "02",
            title: t("howItWorksStep2"),
            body: t("howItWorksStep2Body"),
          },
          {
            number: "03",
            title: t("howItWorksStep3"),
            body: t("howItWorksStep3Body"),
          },
          {
            number: "04",
            title: t("howItWorksStep4"),
            body: t("howItWorksStep4Body"),
          },
        ]}
      />

      {/* Social Proof & Final CTA */}
      <section className="border-t border-[var(--rule)] bg-[var(--canvas)] py-12 sm:py-16">
        <div className="shell max-w-3xl text-center">
          {memberCount && (
            <p className="mb-6 text-sm font-medium text-[var(--text-muted)]">
              {t("socialProof").replace("{count}", memberCount.toString())}
            </p>
          )}
          <h2 className="page-title mb-4 text-2xl sm:text-[1.75rem]">
            {t("finalCtaTitle")}
          </h2>
          <Button asChild size="lg">
            <Link href={session?.user ? "/onboarding/role-selection" : "/sign-in"}>
              {t("finalCtaButton")}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
