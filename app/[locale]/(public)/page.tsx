import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eyebrow } from "@/src/components/ui/eyebrow";
import { Link } from "@/src/i18n/navigation";
import { type AppLocale } from "@/src/i18n/routing";
import { buildPublicMetadata } from "@/src/lib/seo-metadata";
import { auth } from "@/src/auth";
import { countApprovedMembers } from "@/src/db/queries/overview";
import { getDb } from "@/src/db/client";
import { venues } from "@/src/db/schema/marketplace";
import { eq } from "drizzle-orm";

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
  const brand = await getTranslations("brand");
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const canEnter =
    session?.user?.approvalState === "approved" ||
    Boolean(session?.user?.isPlatformStaff);

  let venueNames: string[] = [];
  let approvedMembers = 0;
  try {
    if (process.env.DATABASE_URL) {
      const db = getDb();
      const rows = await db
        .select({ name: venues.name })
        .from(venues)
        .where(eq(venues.publicationState, "approved"))
        .limit(6);
      venueNames = rows.map((row) => row.name);
      approvedMembers = await countApprovedMembers();
    }
  } catch {
    venueNames = [];
    approvedMembers = 0;
  }

  const primaryHref = canEnter
    ? "/marketplace"
    : signedIn
      ? "/apply"
      : "/sign-in";
  const primaryLabel = canEnter ? t("ctaEnter") : t("ctaApply");

  return (
    <div>
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
          className="absolute inset-0 bg-[var(--rail)]/55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[var(--rail)]/90 via-[var(--rail)]/55 to-[var(--rail)]/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[var(--rail)]/70 via-transparent to-[var(--rail)]/25"
        />

        <div className="shell relative flex min-h-[min(88vh,44rem)] items-end pt-16 pb-14 sm:items-center sm:pt-20 sm:pb-20">
          <div className="max-w-xl text-white">
            <p className="display text-[clamp(2.75rem,6vw,4.25rem)] leading-none tracking-tight">
              {brand("name")}
            </p>
            <Eyebrow className="mt-5 !text-[#E8A090]">{t("eyebrow")}</Eyebrow>
            <h1 className="display mt-3 max-w-lg text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.02] text-white">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-md text-base font-medium text-white/80 sm:text-lg">
              {t("body")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] no-underline shadow-sm"
              >
                {primaryLabel}
                {canEnter ? " →" : ""}
              </Link>
            </div>
            <p className="mt-8 text-sm font-medium text-white/65">
              {approvedMembers > 0
                ? t("memberProof", { count: approvedMembers })
                : t("proofFallback")}
            </p>
          </div>
        </div>
      </section>

      <div className="shell grid gap-16 py-12 sm:gap-20 sm:py-16">
        <section className="rounded-[var(--radius-md)] bg-[var(--rail)] px-6 py-5 text-white sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--rail-muted)] uppercase">
              {t("stripLabel")}
            </p>
            {venueNames.length > 0 ? (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold tracking-[0.14em] uppercase">
                {venueNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--rail-muted)]">
                {t("proofFallback")}
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-8 border-t border-[var(--rule)] pt-10 md:grid-cols-3 md:gap-10">
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
        </section>
      </div>
    </div>
  );
}
