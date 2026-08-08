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

      {/* Solution 1: Discover Venues */}
      <FeaturedSection
        title={t("solution1Title")}
        body={t("solution1Body")}
        imagePosition="left"
        background="surface"
        visual={
          <div className="grid gap-3">
            {["Venue A", "Venue B", "Venue C"].map((name, i) => (
              <div key={name} className="panel flex items-center gap-4 p-4">
                <Avatar name={name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Bar & Club · 80 capacity
                  </p>
                </div>
              </div>
            ))}
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
              <Avatar name="Your Act" size={40} />
              <div>
                <p className="text-sm font-semibold">Your Profile</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Music · 1-3 members
                </p>
              </div>
            </div>
            <div className="h-px bg-[var(--rule)]" />
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-[var(--text-muted)]">
                Terms · Agreement · Confirmation
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
            <div className="mb-4 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Your Calendar
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
