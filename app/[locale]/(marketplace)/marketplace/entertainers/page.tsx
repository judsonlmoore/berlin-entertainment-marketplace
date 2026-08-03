import { getTranslations, setRequestLocale } from "next-intl/server";
import { listDiscoverableEntertainers } from "@/src/db/queries/discovery";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatEur(cents: number, locale: string) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function EntertainersDiscoveryPage({
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
        <h1 className="display text-4xl">{t("entertainersTitle")}</h1>
        <p className="mt-4">{t("denied")}</p>
      </section>
    );
  }

  const query = await searchParams;
  const category = first(query.category)?.trim();
  const berlinBase = first(query.berlinBase)?.trim();
  const groupSizeMin = Number(first(query.groupSizeMin));
  const groupSizeMax = Number(first(query.groupSizeMax));
  const priceMinEur = Number(first(query.priceMinEur));
  const priceMaxEur = Number(first(query.priceMaxEur));

  const entertainers = await listDiscoverableEntertainers({
    ...(category ? { category } : {}),
    ...(berlinBase ? { berlinBase } : {}),
    ...(Number.isFinite(groupSizeMin) && first(query.groupSizeMin)
      ? { groupSizeMin }
      : {}),
    ...(Number.isFinite(groupSizeMax) && first(query.groupSizeMax)
      ? { groupSizeMax }
      : {}),
    ...(Number.isFinite(priceMinEur) && first(query.priceMinEur)
      ? { priceMinCents: Math.round(priceMinEur * 100) }
      : {}),
    ...(Number.isFinite(priceMaxEur) && first(query.priceMaxEur)
      ? { priceMaxCents: Math.round(priceMaxEur * 100) }
      : {}),
  });

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm">
        <Link href="/marketplace">{t("back")}</Link>
      </p>
      <h1 className="display mt-3 text-4xl">{t("entertainersTitle")}</h1>
      <p className="mt-3 text-[var(--muted)]">{t("entertainersBody")}</p>

      <form className="panel mt-6 grid gap-3 p-4 sm:grid-cols-3" method="get">
        <label className="grid gap-1 text-sm">
          <span>{t("filterCategory")}</span>
          <input
            name="category"
            defaultValue={category ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterBerlinBase")}</span>
          <input
            name="berlinBase"
            defaultValue={berlinBase ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterGroupSizeMin")}</span>
          <input
            name="groupSizeMin"
            type="number"
            min={1}
            defaultValue={first(query.groupSizeMin) ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterGroupSizeMax")}</span>
          <input
            name="groupSizeMax"
            type="number"
            min={1}
            defaultValue={first(query.groupSizeMax) ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterPriceMin")}</span>
          <input
            name="priceMinEur"
            type="number"
            min={0}
            defaultValue={first(query.priceMinEur) ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("filterPriceMax")}</span>
          <input
            name="priceMaxEur"
            type="number"
            min={0}
            defaultValue={first(query.priceMaxEur) ?? ""}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="bg-[var(--accent)] px-4 py-2 text-[var(--background)] sm:col-span-3"
        >
          {t("applyFilters")}
        </button>
      </form>

      <ul className="mt-6 grid gap-3">
        {entertainers.length === 0 ? (
          <li className="panel p-6 text-[var(--muted)]">{t("empty")}</li>
        ) : null}
        {entertainers.map((act) => (
          <li key={act.id}>
            <Link
              href={`/marketplace/entertainers/${act.id}`}
              className="panel block px-5 py-4 no-underline"
            >
              <h2 className="text-xl font-semibold">{act.actName}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {act.category} · {act.berlinBase} · {act.groupSize}{" "}
                {t("groupSizeUnit")}
              </p>
              <p className="mt-2 text-sm">
                {formatEur(act.priceMinCents, locale)} –{" "}
                {formatEur(act.priceMaxCents, locale)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                {act.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
