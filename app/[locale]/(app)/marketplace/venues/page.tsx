import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  DiscoveryFilterBar,
  DiscoveryPagination,
} from "@/src/components/discovery-filters";
import { Monogram } from "@/src/components/ui/monogram";
import { PageHeader } from "@/src/components/ui/page-header";
import { StatusLabel } from "@/src/components/ui/status-label";
import { listDiscoverableVenues } from "@/src/db/queries/discovery";
import { requireVenueDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { OnboardingChecklistTracker } from "@/src/components/onboarding-checklist-tracker";
import {
  getCategoryNode,
  parseSubcategory,
  parseVenueType,
  taxonomyLabel,
  VENUE_CATEGORIES,
} from "@/src/domain/profile-taxonomy";
import { richTextToPlain } from "@/src/domain/sanitize-input";
import { Link } from "@/src/i18n/navigation";
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function venueTypeLabel(raw: string, locale: "en" | "de"): string {
  const parsed = parseVenueType(raw);
  const category = getCategoryNode(VENUE_CATEGORIES, parsed.categoryId);
  const catLabel = category
    ? taxonomyLabel(category, locale)
    : parsed.categoryId || raw;
  const sub = parseSubcategory(parsed.subcategoryRaw);
  if (sub.subcategoryId === "other" && sub.otherLabel) {
    return `${catLabel} · ${sub.otherLabel}`;
  }
  const child = category?.children.find((c) => c.id === sub.subcategoryId);
  if (child) return `${catLabel} · ${taxonomyLabel(child, locale)}`;
  return catLabel;
}

export default async function VenuesDiscoveryPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireVenueDiscoveryAccess();
  const appLocale = locale as "en" | "de";

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <PageHeader title={t("venuesTitle")} body={t("denied")} />
        {access.reason === "forbidden" ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("roleDeniedVenues")}
          </p>
        ) : null}
      </section>
    );
  }

  const query = await searchParams;
  const values = {
    q: first(query.q)?.trim(),
    district: first(query.district)?.trim(),
    venueType: first(query.venueType)?.trim(),
    capacityMin: first(query.capacityMin)?.trim(),
    capacityMax: first(query.capacityMax)?.trim(),
    page: first(query.page)?.trim(),
  };

  const capacityMin = Number(values.capacityMin);
  const capacityMax = Number(values.capacityMax);
  const page = Number(values.page) || 1;

  const result = await listDiscoverableVenues(
    {
      ...(values.q ? { q: values.q } : {}),
      ...(values.district ? { district: values.district } : {}),
      ...(values.venueType ? { venueType: values.venueType } : {}),
      ...(Number.isFinite(capacityMin) && values.capacityMin
        ? { capacityMin }
        : {}),
      ...(Number.isFinite(capacityMax) && values.capacityMax
        ? { capacityMax }
        : {}),
    },
    { page, pageSize: 12 },
  );

  const hasPerformedSearch = Boolean(values.q);

  return (
    <section className="grid gap-8">
      {hasPerformedSearch ? (
        <OnboardingChecklistTracker step="searched" />
      ) : null}
      <PageHeader
        eyebrow={t("privacyEyebrow")}
        title={t("venuesTitle")}
        body={t("venuesBody")}
      />

      <DiscoveryFilterBar kind="venues" values={values} />

      <p className="tabular text-sm text-[var(--text-muted)]">
        {t("resultCount", { count: result.total })}
      </p>

      {result.items.length === 0 ? (
        <p className="panel p-6 text-[var(--text-muted)]">{t("empty")}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((venue) => {
            const typeLabel = venueTypeLabel(venue.venueType, appLocale);
            const capacityLabel = venue.capacityContext?.trim()
              ? `${venue.capacity} ${t("capacityUnit")} · ${venue.capacityContext.trim()}`
              : `${venue.capacity} ${t("capacityUnit")}`;
            const blurb =
              richTextToPlain(venue.shortDescription) ||
              richTextToPlain(venue.audienceDescription);

            return (
              <li key={venue.id}>
                <article className="panel flex h-full flex-col overflow-hidden">
                  <Link
                    href={`/marketplace/venues/${venue.id}`}
                    className="block no-underline"
                  >
                    {venue.heroImageId ? (
                      // Auth-proxied private portfolio bytes — same-origin /api route.
                      <img
                        src={portfolioImageSrc(venue.heroImageId, "thumb")}
                        alt={venue.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <Monogram
                        name={venue.name}
                        className="h-40 w-full"
                        tone="blue"
                      />
                    )}
                  </Link>
                  <div className="grid flex-1 gap-2 p-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusLabel tone="info">{typeLabel}</StatusLabel>
                      {venue.openCallCount > 0 ? (
                        <StatusLabel tone="warning">
                          {t("openCallsBadge", { count: venue.openCallCount })}
                        </StatusLabel>
                      ) : null}
                    </div>
                    <h2 className="page-title text-xl leading-tight">
                      <Link
                        href={`/marketplace/venues/${venue.id}`}
                        className="no-underline"
                      >
                        {venue.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {venue.district} · {capacityLabel}
                    </p>
                    {blurb ? (
                      <p className="line-clamp-2 text-sm text-[var(--text-muted)]">
                        {blurb}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-3 pt-2">
                      <Link
                        href={`/marketplace/venues/${venue.id}`}
                        className="text-sm text-[var(--primary)]"
                      >
                        {t("viewProfile")} →
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
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
