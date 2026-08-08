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
  const t = await getTranslations("forTalent");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/for-talent",
  });
}

export default async function ForTalentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forTalent");
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

      {/* Solution 1: Discover Venues */}
      <FeaturedSection
        title={t("solution1Title")}
        body={t("solution1Body")}
        imagePosition="left"
        background="surface"
        visual={
          <div className="grid gap-3">
            {[1, 2, 3].map((n, i) => {
              const name = t("mockupVenue", { n: String.fromCharCode(64 + n) });
              return (
                <div
                  key={n}
                  className="panel flex items-center gap-4 p-4"
                >
                  <Monogram name={name} size="sm" colorSeed={`venue-${i}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t("mockupVenueType")} · {t("mockupCapacity", { capacity: "80" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        }
      />

      {/* Solution 2: Apply or Send Offers */}
      <FeaturedSection
        title={t("solution2Title")}
        body={t("solution2Body")}
        imagePosition="right"
        background="canvas"
        visual={
          <div className="panel p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Monogram name={t("mockupYourAct")} size="sm" colorSeed="you" />
              <div>
                <p className="text-sm font-semibold">{t("mockupYourProfile")}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {t("mockupActFormat", { min: "1", max: "3" })}
                </p>
              </div>
            </div>
            <div className="h-px bg-[var(--rule)]" />
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-[var(--text-muted)]">
                {t("mockupTermsFlow")}
              </div>
              <div className="h-8 rounded bg-[var(--canvas)]" />
              <div className="h-8 rounded bg-[var(--canvas)]" />
            </div>
          </div>
        }
      />

      {/* Solution 3: Honest Calendars */}
      <FeaturedSection
        title={t("solution3Title")}
        body={t("solution3Body")}
        imagePosition="left"
        background="surface"
        visual={
          <div className="panel p-6 sm:p-8">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {t("mockupYourCalendar")}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }, (_, i) => {
                const isAvailable = i % 7 !== 0 && i % 7 !== 6;
                const isBooked = i === 12 || i === 19;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded text-center text-xs leading-8 ${
                      isBooked
                        ? "bg-[var(--primary)] text-white"
                        : isAvailable
                          ? "bg-[var(--canvas)]"
                          : "bg-white"
                    }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        }
      />

      {/* Categories */}
      <section className="border-y border-[var(--rule)] bg-[var(--canvas)] py-10 sm:py-12">
        <div className="shell max-w-3xl text-center">
          <h2 className="page-title mb-3 text-xl sm:text-2xl">
            {t("categoriesTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            {t("categoriesBody")}
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
