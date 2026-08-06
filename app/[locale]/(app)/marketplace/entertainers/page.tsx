import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  DiscoveryFilterBar,
  DiscoveryPagination,
} from "@/src/components/discovery-filters";
import { Monogram } from "@/src/components/ui/monogram";
import { formatEur } from "@/src/lib/format";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import {
  listDiscoverableEntertainers,
  listEntertainerCategoryFacets,
} from "@/src/db/queries/discovery";
import { requireEntertainerDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { OnboardingChecklistTracker } from "@/src/components/onboarding-checklist-tracker";
import { can } from "@/src/domain/permissions";
import { Link } from "@/src/i18n/navigation";
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EntertainersDiscoveryPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireEntertainerDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <PageHeader title={t("entertainersTitle")} body={t("denied")} />
        {access.reason === "forbidden" ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("roleDeniedEntertainers")}
          </p>
        ) : null}
      </section>
    );
  }

  const query = await searchParams;
  const values = {
    q: first(query.q)?.trim(),
    category: first(query.category)?.trim(),
    berlinBase: first(query.berlinBase)?.trim(),
    groupSizeMin: first(query.groupSizeMin)?.trim(),
    groupSizeMax: first(query.groupSizeMax)?.trim(),
    priceMinEur: first(query.priceMinEur)?.trim(),
    priceMaxEur: first(query.priceMaxEur)?.trim(),
    availableOn: first(query.availableOn)?.trim(),
    page: first(query.page)?.trim(),
  };

  const groupSizeMin = Number(values.groupSizeMin);
  const groupSizeMax = Number(values.groupSizeMax);
  const priceMinEur = Number(values.priceMinEur);
  const priceMaxEur = Number(values.priceMaxEur);
  const page = Number(values.page) || 1;
  const availableOn =
    values.availableOn && /^\d{4}-\d{2}-\d{2}$/.test(values.availableOn)
      ? values.availableOn
      : undefined;

  const [result, categoryFacets] = await Promise.all([
    listDiscoverableEntertainers(
      {
        ...(values.q ? { q: values.q } : {}),
        ...(values.category ? { category: values.category } : {}),
        ...(values.berlinBase ? { berlinBase: values.berlinBase } : {}),
        ...(Number.isFinite(groupSizeMin) && values.groupSizeMin
          ? { groupSizeMin }
          : {}),
        ...(Number.isFinite(groupSizeMax) && values.groupSizeMax
          ? { groupSizeMax }
          : {}),
        ...(Number.isFinite(priceMinEur) && values.priceMinEur
          ? { priceMinCents: Math.round(priceMinEur * 100) }
          : {}),
        ...(Number.isFinite(priceMaxEur) && values.priceMaxEur
          ? { priceMaxCents: Math.round(priceMaxEur * 100) }
          : {}),
        ...(availableOn ? { availableOn } : {}),
      },
      { page, pageSize: 12 },
    ),
    listEntertainerCategoryFacets(),
  ]);

  const canRequest =
    Boolean(access.actor.venueId) &&
    can(access.actor, "direct_request.send", {
      venueId: access.actor.venueId!,
    });

  const hasPerformedSearch = Boolean(values.q);

  return (
    <section className="grid gap-8">
      {hasPerformedSearch ? (
        <OnboardingChecklistTracker step="searched" />
      ) : null}
      <PageHeader
        eyebrow={t("privacyEyebrow")}
        title={t("entertainersTitle")}
        body={t("entertainersBody")}
      />

      <DiscoveryFilterBar
        kind="entertainers"
        values={values}
        categoryFacets={categoryFacets}
      />

      {availableOn ? (
        <p className="text-sm text-[var(--text-muted)]">
          {t("availableOnActive", { date: availableOn })}
        </p>
      ) : null}

      <p className="tabular text-sm text-[var(--text-muted)]">
        {t("resultCount", { count: result.total })}
      </p>

      {result.items.length === 0 ? (
        <p className="panel p-6 text-[var(--text-muted)]">
          {availableOn ? t("availableOnEmpty") : t("empty")}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((act) => (
            <li key={act.id}>
              <article className="panel flex h-full flex-col overflow-hidden">
                <Link
                  href={`/marketplace/entertainers/${act.id}`}
                  className="block no-underline"
                >
                  {act.heroImageId ? (
                    // Auth-proxied private portfolio bytes — same-origin /api route.
                    <img
                      src={portfolioImageSrc(act.heroImageId, "thumb")}
                      alt={act.actName}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <Monogram name={act.actName} className="h-40 w-full" />
                  )}
                </Link>
                <div className="grid flex-1 gap-2 p-4">
                  <StatusLabel tone="info">{act.category}</StatusLabel>
                  <h2 className="page-title text-xl leading-tight">
                    <Link
                      href={`/marketplace/entertainers/${act.id}`}
                      className="no-underline"
                    >
                      {act.actName}
                    </Link>
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {act.berlinBase} · {act.groupSize} {t("groupSizeUnit")}
                  </p>
                  <p className="tabular text-sm">
                    {formatEur(act.priceMinCents, locale)} –{" "}
                    {formatEur(act.priceMaxCents, locale)}
                  </p>
                  <p className="line-clamp-2 text-sm text-[var(--text-muted)]">
                    {act.description}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-2">
                    <Link
                      href={`/marketplace/entertainers/${act.id}`}
                      className="text-sm text-[var(--primary)]"
                    >
                      {t("viewProfile")} →
                    </Link>
                    {canRequest ? (
                      <Link
                        href={`/marketplace/entertainers/${act.id}`}
                        className="text-sm font-medium text-[var(--primary)]"
                      >
                        {t("connectionRequestCta")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <DiscoveryPagination
        page={result.page}
        pageCount={result.pageCount}
        values={values}
      />
    </section>
  );
}
