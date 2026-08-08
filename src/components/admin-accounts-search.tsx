"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { StartSupportButton } from "@/src/components/support-session-controls";
import { StatusLabel } from "@/src/components/ui/status-label";
import type { AdminAccountSearchHit } from "@/src/db/queries/admin-accounts";

type Props = {
  locale: "en" | "de";
  initialQuery: string;
  results: AdminAccountSearchHit[];
};

export function AdminAccountsSearch({ locale, initialQuery, results }: Props) {
  const t = useTranslations("adminSupport");
  const publication = useTranslations("publication");
  const accountStatus = useTranslations("accountStatus");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = query.trim();
          startTransition(() => {
            router.push(
              next.length >= 2
                ? `/admin/accounts?q=${encodeURIComponent(next)}`
                : "/admin/accounts",
            );
          });
        }}
      >
        <label className="grid min-w-[16rem] flex-1 gap-1 text-sm">
          <span className="font-medium">{t("searchLabel")}</span>
          <input
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
          >
            {t("search")}
          </button>
        </div>
      </form>

      {initialQuery.trim().length > 0 && initialQuery.trim().length < 2 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("queryTooShort")}</p>
      ) : null}

      {initialQuery.trim().length >= 2 && results.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("noResults")}</p>
      ) : null}

      <ul className="grid gap-4">
        {results.map((hit) => (
          <li
            key={hit.userId}
            className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">
                  {hit.name?.trim() || hit.email || hit.userId}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {hit.email}
                  {hit.role ? ` · ${hit.role}` : ""}
                  {hit.isPlatformStaff ? ` · ${t("staffBadge")}` : ""}
                </p>
                {hit.accountStatus ? (
                  <div className="mt-2">
                    <StatusLabel>
                      {accountStatus(
                        hit.accountStatus as "active" | "suspended",
                      )}
                    </StatusLabel>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {hit.entertainer ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {hit.entertainer.actName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t("entityEntertainer")} ·{" "}
                      {publication(hit.entertainer.publicationState as "draft")}
                    </p>
                  </div>
                  <StartSupportButton
                    locale={locale}
                    entityType="entertainer"
                    entityId={hit.entertainer.id}
                    label={hit.entertainer.actName}
                  />
                </div>
              ) : null}

              {hit.venues.map((venue) => (
                <div
                  key={venue.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {venue.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t("entityVenue")} · {venue.membershipRole} ·{" "}
                      {publication(venue.publicationState as "draft")}
                    </p>
                  </div>
                  <StartSupportButton
                    locale={locale}
                    entityType="venue"
                    entityId={venue.id}
                    label={venue.name}
                  />
                </div>
              ))}

              {!hit.entertainer && hit.venues.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("noEntities")}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
