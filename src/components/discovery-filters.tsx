"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";

type Chip = { key: string; label: string; href: string };

function buildQuery(
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined | null>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && value === "1") continue;
    next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

export function DiscoveryFilterBar({
  kind,
  values,
  categoryFacets = [],
}: {
  kind: "entertainers" | "venues";
  values: Record<string, string | undefined>;
  categoryFacets?: string[];
}) {
  const t = useTranslations("marketplace");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeChips = useMemo(() => {
    const chips: Chip[] = [];
    const drop = (key: string, label: string) => {
      if (!values[key]) return;
      chips.push({
        key,
        label: `${label}: ${values[key]}`,
        href: `${pathname}${buildQuery(values, { [key]: null, page: "1" })}`,
      });
    };
    drop("q", t("searchLabel"));
    if (kind === "entertainers") {
      drop("category", t("filterCategory"));
      drop("berlinBase", t("filterBerlinBase"));
      drop("groupSizeMin", t("filterGroupSizeMin"));
      drop("groupSizeMax", t("filterGroupSizeMax"));
      drop("priceMinEur", t("filterPriceMin"));
      drop("priceMaxEur", t("filterPriceMax"));
    } else {
      drop("district", t("filterDistrict"));
      drop("venueType", t("filterVenueType"));
      drop("capacityMin", t("filterCapacityMin"));
      drop("capacityMax", t("filterCapacityMax"));
    }
    return chips;
  }, [kind, t, pathname, values]);

  const sizePresets =
    kind === "entertainers"
      ? [
          {
            label: t("sizeSolo"),
            patch: { groupSizeMin: "1", groupSizeMax: "1" },
          },
          {
            label: t("sizeDuo"),
            patch: { groupSizeMin: "2", groupSizeMax: "2" },
          },
          {
            label: t("sizeSmall"),
            patch: { groupSizeMin: "3", groupSizeMax: "5" },
          },
          {
            label: t("sizeEnsemble"),
            patch: { groupSizeMin: "6", groupSizeMax: "20" },
          },
        ]
      : [];

  return (
    <div className="grid gap-4">
      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        {Object.entries(values).map(([key, value]) =>
          key === "q" || key === "page" || !value ? null : (
            <input key={key} type="hidden" name={key} value={value} />
          ),
        )}
        <label className="label min-w-0 flex-1">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            name="q"
            defaultValue={values.q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="field"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)]"
          >
            {t("search")}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center border border-[var(--rule)] px-4 text-sm lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {t("filtersToggle")}
            {activeChips.length > 0 ? ` (${activeChips.length})` : ""}
          </button>
        </div>
      </form>

      {kind === "entertainers" && categoryFacets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${pathname}${buildQuery(values, { category: null, page: "1" })}`}
            className={`inline-flex min-h-9 items-center border px-3 text-xs no-underline ${
              !values.category
                ? "border-[var(--terracotta)] bg-[var(--terracotta)]/10"
                : "border-[var(--rule)]"
            }`}
          >
            {t("filterAllCategories")}
          </Link>
          {categoryFacets.map((category) => (
            <Link
              key={category}
              href={`${pathname}${buildQuery(values, {
                category,
                page: "1",
              })}`}
              className={`inline-flex min-h-9 items-center border px-3 text-xs no-underline ${
                values.category === category
                  ? "border-[var(--terracotta)] bg-[var(--terracotta)]/10"
                  : "border-[var(--rule)]"
              }`}
            >
              {category}
            </Link>
          ))}
        </div>
      ) : null}

      {sizePresets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sizePresets.map((preset) => {
            const active =
              values.groupSizeMin === preset.patch.groupSizeMin &&
              values.groupSizeMax === preset.patch.groupSizeMax;
            return (
              <Link
                key={preset.label}
                href={`${pathname}${buildQuery(values, {
                  ...preset.patch,
                  page: "1",
                })}`}
                className={`inline-flex min-h-9 items-center border px-3 text-xs no-underline ${
                  active
                    ? "border-[var(--terracotta)] bg-[var(--terracotta)]/10"
                    : "border-[var(--rule)]"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div
        className={`panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 ${
          open ? "grid" : "hidden lg:grid"
        }`}
      >
        <form method="get" className="contents">
          {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
          {kind === "entertainers" ? (
            <>
              <label className="label">
                <span>{t("filterCategory")}</span>
                <input
                  name="category"
                  defaultValue={values.category ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterBerlinBase")}</span>
                <input
                  name="berlinBase"
                  defaultValue={values.berlinBase ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterGroupSizeMin")}</span>
                <input
                  name="groupSizeMin"
                  type="number"
                  min={1}
                  defaultValue={values.groupSizeMin ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterGroupSizeMax")}</span>
                <input
                  name="groupSizeMax"
                  type="number"
                  min={1}
                  defaultValue={values.groupSizeMax ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterPriceMin")}</span>
                <input
                  name="priceMinEur"
                  type="number"
                  min={0}
                  defaultValue={values.priceMinEur ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterPriceMax")}</span>
                <input
                  name="priceMaxEur"
                  type="number"
                  min={0}
                  defaultValue={values.priceMaxEur ?? ""}
                  className="field"
                />
              </label>
            </>
          ) : (
            <>
              <label className="label">
                <span>{t("filterDistrict")}</span>
                <input
                  name="district"
                  defaultValue={values.district ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterVenueType")}</span>
                <input
                  name="venueType"
                  defaultValue={values.venueType ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterCapacityMin")}</span>
                <input
                  name="capacityMin"
                  type="number"
                  min={1}
                  defaultValue={values.capacityMin ?? ""}
                  className="field"
                />
              </label>
              <label className="label">
                <span>{t("filterCapacityMax")}</span>
                <input
                  name="capacityMax"
                  type="number"
                  min={1}
                  defaultValue={values.capacityMax ?? ""}
                  className="field"
                />
              </label>
            </>
          )}
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)] sm:col-span-2 lg:col-span-4"
          >
            {t("applyFilters")}
          </button>
        </form>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-[var(--text-muted)]">
            {t("activeFilters", { count: activeChips.length })}
          </p>
          {activeChips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="inline-flex min-h-9 items-center border border-[var(--rule)] px-3 text-xs no-underline"
            >
              {chip.label} ×
            </Link>
          ))}
          <Link
            href={pathname}
            className="text-xs text-[var(--primary)] no-underline"
          >
            {t("clearFilters")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function DiscoveryPagination({
  page,
  pageCount,
  values,
}: {
  page: number;
  pageCount: number;
  values: Record<string, string | undefined>;
}) {
  const t = useTranslations("marketplace");
  const pathname = usePathname();
  if (pageCount <= 1) return null;

  const hrefFor = (nextPage: number) =>
    `${pathname}${buildQuery(values, { page: String(nextPage) })}`;

  return (
    <nav
      aria-label={t("pagination")}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-4"
    >
      <p className="tabular text-sm text-[var(--text-muted)]">
        {t("pageOf", { page, pageCount })}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="inline-flex min-h-11 items-center border border-[var(--rule)] px-4 text-sm no-underline"
          >
            {t("previousPage")}
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link
            href={hrefFor(page + 1)}
            className="inline-flex min-h-11 items-center bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)] no-underline"
          >
            {t("nextPage")}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
