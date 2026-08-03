import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireDiscoveryAccess } from "@/src/db/queries/discovery-access";
import { listOpenOpportunities } from "@/src/db/queries/opportunities";
import { Link } from "@/src/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

function formatRange(min: number | null, max: number | null, locale: string) {
  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  if (min === null && max === null) return "—";
  if (min !== null && max !== null) {
    return `${fmt.format(min / 100)} – ${fmt.format(max / 100)}`;
  }
  if (min !== null) return `${fmt.format(min / 100)}+`;
  return `≤ ${fmt.format((max as number) / 100)}`;
}

export default async function OpportunitiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("opportunities");
  const market = await getTranslations("marketplace");
  const access = await requireDiscoveryAccess();

  if (!access.ok) {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="display text-4xl">{t("listTitle")}</h1>
        <p className="mt-4">{market("denied")}</p>
      </section>
    );
  }

  const rows = await listOpenOpportunities();
  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm">
        <Link href="/marketplace">{market("back")}</Link>
      </p>
      <h1 className="display mt-3 text-4xl">{t("listTitle")}</h1>
      <p className="mt-3 text-[var(--muted)]">{t("listBody")}</p>

      <ul className="mt-6 grid gap-3">
        {rows.length === 0 ? (
          <li className="panel p-6 text-[var(--muted)]">{t("empty")}</li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/marketplace/opportunities/${row.id}`}
              className="panel block px-5 py-4 no-underline"
            >
              <h2 className="text-xl font-semibold">{row.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {row.venueName} · {row.district} · {row.formatCategory}
              </p>
              <p className="mt-2 text-sm">
                {dateFmt.format(row.startsAt)} – {dateFmt.format(row.endsAt)}
              </p>
              <p className="mt-1 text-sm">
                {t("budget")}:{" "}
                {formatRange(row.budgetMinCents, row.budgetMaxCents, locale)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
