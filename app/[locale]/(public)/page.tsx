import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eyebrow } from "@/src/components/ui/eyebrow";
import { Monogram } from "@/src/components/ui/monogram";
import { StatusLabel } from "@/src/components/ui/status-label";
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
  const session = await auth();
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

  return (
    <div className="grid gap-16 sm:gap-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="display mt-4 max-w-xl text-[clamp(3rem,6vw,5.5rem)] leading-[0.95]">
            {t("headline")}
          </h1>
          <p className="mt-6 max-w-lg text-base text-[var(--text-muted)] sm:text-lg">
            {t("body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {canEnter ? (
              <Link
                href="/marketplace"
                className="inline-flex min-h-11 items-center bg-[var(--primary)] px-5 py-2.5 text-sm text-[var(--primary-foreground)] no-underline"
              >
                {t("ctaEnter")} →
              </Link>
            ) : (
              <Link
                href="/apply"
                className="inline-flex min-h-11 items-center bg-[var(--primary)] px-5 py-2.5 text-sm text-[var(--primary-foreground)] no-underline"
              >
                {t("ctaEnter")} →
              </Link>
            )}
            <Link href="/apply" className="min-h-11 py-2.5 text-sm">
              {t("ctaApply")}
            </Link>
          </div>
          <p className="mt-8 text-sm text-[var(--text-muted)]">
            {approvedMembers > 0
              ? t("memberProof", { count: approvedMembers })
              : t("proofFallback")}
          </p>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden border border-[var(--rule)] bg-[var(--ochre-soft)]/35">
            <div
              aria-hidden="true"
              className="mx-auto flex h-[22rem] max-w-md items-end justify-center px-6 pt-10 pb-8 sm:h-[26rem]"
            >
              <div className="relative h-full w-full max-w-sm overflow-hidden rounded-t-[999px] border border-[var(--ink)]/20 bg-[var(--rose-soft)]">
                <Monogram
                  name="Salon Act"
                  tone="forest"
                  className="absolute inset-0 opacity-90"
                />
              </div>
            </div>
          </div>
          <div className="panel absolute top-6 left-3 max-w-[14rem] p-3 text-xs shadow-none sm:left-6">
            <StatusLabel tone="success">{t("calloutAvailable")}</StatusLabel>
            <p className="mt-2 font-medium">{t("calloutAvailableMeta")}</p>
          </div>
          <div className="panel absolute right-3 bottom-6 max-w-[14rem] p-3 text-xs shadow-none sm:right-6">
            <StatusLabel tone="success">{t("calloutConfirmed")}</StatusLabel>
            <p className="mt-2 font-medium">{t("calloutConfirmedMeta")}</p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--ink)] px-6 py-5 text-[var(--primary-foreground)] sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase">
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
            <h2 className="display text-2xl leading-tight sm:text-[1.75rem]">
              {item.title}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {item.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="border-t border-[var(--rule)] pt-8 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="display text-2xl">Salon</p>
            <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
              {t("footerNote")}
            </p>
          </div>
          <p className="text-sm">
            <Link href="/privacy">{t("footerLegal")}</Link>
            {" · "}
            <Link href="/terms">{t("footerTerms")}</Link>
            {" · "}
            <Link href="/sign-in">{t("ctaSignIn")}</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
