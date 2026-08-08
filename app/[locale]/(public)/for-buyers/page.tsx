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
import { Avatar } from "@/src/components/ui/monogram";

const primaryCtaClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--primary)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] no-underline";
const secondaryCtaClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] no-underline";

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
            <Link
              href={session?.user ? "/onboarding/role-selection" : "/sign-in"}
              className={primaryCtaClass}
            >
              {t("ctaPrimary")}
            </Link>
            {!session?.user && (
              <Link href="/sign-in" className={secondaryCtaClass}>
                {t("ctaSecondary")}
              </Link>
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
            {["Jazz Trio", "Comedy Act", "Dance Ensemble"].map((name, i) => (
              <div key={name} className="panel flex items-center gap-4 p-4">
                <Avatar name={name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {i === 0 && "Music · 3 members"}
                    {i === 1 && "Comedy · Solo"}
                    {i === 2 && "Dance · 4-6 members"}
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
              <p className="text-sm font-semibold">Friday Night Music</p>
              <p className="text-xs text-[var(--text-muted)]">
                Open Call · March 15, 2026
              </p>
            </div>
            <div className="h-px bg-[var(--rule)]" />
            <div className="mt-4 space-y-3">
              {["Act A", "Act B", "Act C"].map((name, i) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded bg-[var(--canvas)] p-2"
                >
                  <Avatar name={name} size={28} />
                  <span className="text-xs">{name}</span>
                </div>
              ))}
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
                <p className="text-sm font-semibold">Booking Agreement</p>
                <p className="text-xs text-[var(--text-muted)]">
                  March 15 · 20:00-22:00
                </p>
              </div>
              <div className="flex -space-x-2">
                <Avatar name="Venue" size={28} />
                <Avatar name="Talent" size={28} />
              </div>
            </div>
            <div className="h-px bg-[var(--rule)]" />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Terms agreed</span>
                <span className="font-medium text-[var(--primary)]">✓</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Both signed</span>
                <span className="font-medium text-[var(--primary)]">✓</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  Calendars blocked
                </span>
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
          <Link
            href={session?.user ? "/onboarding/role-selection" : "/sign-in"}
            className={primaryCtaClass}
          >
            {t("finalCtaButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
