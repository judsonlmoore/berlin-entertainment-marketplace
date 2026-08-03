import { getTranslations, setRequestLocale } from "next-intl/server";
import { listDiscoverableVenues } from "@/src/db/queries/discovery";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
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
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="display text-4xl">{t("venuesTitle")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  const query = await searchParams;
  const district = first(query.district)?.trim();
  const venueType = first(query.venueType)?.trim();
  const capacityMin = Number(first(query.capacityMin));
  const capacityMax = Number(first(query.capacityMax));

  const venueRows = await listDiscoverableVenues({
    ...(district ? { district } : {}),
    ...(venueType ? { venueType } : {}),
    ...(Number.isFinite(capacityMin) && first(query.capacityMin)
      ? { capacityMin }
      : {}),
    ...(Number.isFinite(capacityMax) && first(query.capacityMax)
      ? { capacityMax }
      : {}),
  });

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm">
        <Link href="/marketplace">{t("back")}</Link>
      </p>
      <h1 className="display mt-3 text-4xl">{t("venuesTitle")}</h1>
      <p className="mt-3 text-[var(--muted)]">{t("venuesBody")}</p>

      <form className="panel mt-6 grid gap-3 p-4 sm:grid-cols-2" method="get">
        <label className="grid gap-1 text-sm">
          <span>{t("filterDistrict")}</span>
          <input
            name="district"
            defaultValue={district ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterVenueType")}</span>
          <input
            name="venueType"
            defaultValue={venueType ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterCapacityMin")}</span>
          <input
            name="capacityMin"
            type="number"
            min={1}
            defaultValue={first(query.capacityMin) ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterCapacityMax")}</span>
          <input
            name="capacityMax"
            type="number"
            min={1}
            defaultValue={first(query.capacityMax) ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="bg-[var(--accent)] px-4 py-2 text-[var(--background)] sm:col-span-2"
        >
          {t("applyFilters")}
        </button>
      </form>

      <ul className="mt-6 grid gap-3">
        {venueRows.length === 0 ? (
          <li className="panel p-6 text-[var(--muted)]">{t("empty")}</li>
        ) : null}
        {venueRows.map((venue) => (
          <li key={venue.id}>
            <Link
              href={`/marketplace/venues/${venue.id}`}
              className="panel block px-5 py-4 no-underline"
            >
              <h2 className="text-xl font-semibold">{venue.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {venue.district} · {venue.venueType} · {venue.capacity}{" "}
                {t("capacityUnit")}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                {venue.shortDescription}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
