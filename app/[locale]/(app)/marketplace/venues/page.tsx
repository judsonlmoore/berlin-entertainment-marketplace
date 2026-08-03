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
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VenuesDiscoveryPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const access = await requireVenueDiscoveryAccess();

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

  return (
    <section className="grid gap-8">
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
          {result.items.map((venue) => (
            <li key={venue.id}>
              <Link
                href={`/marketplace/venues/${venue.id}`}
                className="panel block h-full overflow-hidden no-underline"
              >
                <Monogram
                  name={venue.name}
                  className="h-36 w-full"
                  tone="blue"
                />
                <div className="grid gap-2 p-4">
                  <StatusLabel tone="info">{venue.venueType}</StatusLabel>
                  <h2 className="page-title text-xl leading-tight">
                    {venue.name}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {venue.district} · {venue.capacity} {t("capacityUnit")}
                  </p>
                  <p className="line-clamp-2 text-sm text-[var(--text-muted)]">
                    {venue.shortDescription}
                  </p>
                  <span className="mt-1 text-sm text-[var(--primary)]">
                    {t("viewProfile")} →
                  </span>
                </div>
              </Link>
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
