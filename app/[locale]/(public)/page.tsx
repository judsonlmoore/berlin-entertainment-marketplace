import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";
import { getApprovedMemberCount } from "@/src/lib/member-count";
import { auth } from "@/src/auth";
import {
  MemberProof,
  FeaturedSection,
  AudienceCard,
} from "@/src/components/marketing";
import { Monogram } from "@/src/components/ui/monogram";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta");

  return buildPublicMetadata({
    locale: locale as AppLocale,
    title: t("homeTitle"),
    description: t("homeDescription"),
    path: "/",
    keywords: t("homeKeywords")
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const canEnter =
    session?.user?.accountStatus === "active" ||
    Boolean(session?.user?.roles?.length) ||
    Boolean(session?.user?.isPlatformStaff);

  const primaryHref = canEnter
    ? "/marketplace"
    : signedIn
      ? "/onboarding/role-selection"
      : "/sign-in";
  const primaryLabel = canEnter ? t("ctaEnter") : t("ctaApply");

  const memberCount = await getApprovedMemberCount();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative isolate min-h-[min(88vh,44rem)] overflow-hidden bg-[var(--rail)]">
        <Image
          src="/marketing/hero-venue.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-105 object-cover object-[55%_40%] blur-[2.5px] brightness-[0.72] saturate-[0.78]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[var(--rail)]/70"
        />

        <div className="shell relative flex min-h-[min(88vh,44rem)] items-end pt-16 pb-14 sm:items-center sm:pt-20 sm:pb-20">
          <div className="max-w-xl text-white">
            <p className="eyebrow text-white/70">{t("eyebrow")}</p>
            <h1 className="display mt-3 max-w-lg text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.02] text-white">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-md text-base font-medium text-white/80 sm:text-lg">
              {t("body")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] no-underline shadow-sm transition-shadow hover:shadow-md"
              >
                {primaryLabel}
                {canEnter ? " →" : ""}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Member Proof */}
      <MemberProof
        count={memberCount}
        proofMessage={t("memberProof")}
        fallbackMessage={t("proofFallback")}
      />

      {/* Featured Section: Local Scenes */}
      <FeaturedSection
        title={t("featuredLocalTitle")}
        body={t("featuredLocalBody")}
        imagePosition="left"
        background="surface"
        visual={
          <div className="flex items-center justify-center gap-4 rounded-lg border border-[var(--rule)] bg-[var(--canvas)] p-8 sm:p-12">
            <Monogram
              name="Local Scene"
              className="size-20 shrink-0 rounded-full shadow-sm [&_span]:text-2xl"
            />
            <Monogram
              name="Community Arts"
              className="size-20 shrink-0 rounded-full shadow-sm [&_span]:text-2xl"
            />
            <Monogram
              name="Independent Venues"
              className="size-20 shrink-0 rounded-full shadow-sm [&_span]:text-2xl"
            />
          </div>
        }
      />

      {/* Featured Section: Booking Flow */}
      <FeaturedSection
        title={t("featuredFlowTitle")}
        body={t("featuredFlowBody")}
        imagePosition="right"
        background="canvas"
        visual={
          <div className="grid gap-3 rounded-lg border border-[var(--rule)] bg-white p-6 sm:p-8">
            {[
              { step: "01", label: "Discover" },
              { step: "02", label: "Connect" },
              { step: "03", label: "Agree" },
              { step: "04", label: "Confirmed" },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-4 rounded border border-[var(--rule)] bg-[var(--canvas)] px-4 py-3"
              >
                <span className="eyebrow text-[var(--accent)]">
                  {item.step}
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* Principles Section */}
      <section className="border-t border-[var(--rule)] bg-white py-12 sm:py-16">
        <div className="shell grid gap-8 md:grid-cols-3 md:gap-10">
          {[
            { n: "01", title: t("principle1Title"), body: t("principle1Body") },
            { n: "02", title: t("principle2Title"), body: t("principle2Body") },
            { n: "03", title: t("principle3Title"), body: t("principle3Body") },
          ].map((item) => (
            <article key={item.n} className="grid gap-3">
              <p className="eyebrow">{item.n}</p>
              <h2 className="page-title text-xl leading-tight sm:text-[1.35rem]">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed font-medium text-[var(--text-muted)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Audience Cards */}
      <section className="bg-[var(--canvas)] py-12 sm:py-16">
        <div className="shell">
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <AudienceCard
              title={t("audienceCardTalentTitle")}
              body={t("audienceCardTalentBody")}
              ctaLabel={t("audienceCardTalentCta")}
              href="/for-talent"
            />
            <AudienceCard
              title={t("audienceCardBuyersTitle")}
              body={t("audienceCardBuyersBody")}
              ctaLabel={t("audienceCardBuyersCta")}
              href="/for-buyers"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
