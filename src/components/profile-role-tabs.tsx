"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Tab = "entertainer" | "venue";

export function ProfileRoleTabs({
  showEntertainer,
  showVenue,
  entertainer,
  venue,
}: {
  showEntertainer: boolean;
  showVenue: boolean;
  entertainer: React.ReactNode;
  venue: React.ReactNode;
}) {
  const t = useTranslations("profile");
  const initial: Tab = showEntertainer ? "entertainer" : "venue";
  const [tab, setTab] = useState<Tab>(initial);

  if (showEntertainer && !showVenue) return <>{entertainer}</>;
  if (showVenue && !showEntertainer) return <>{venue}</>;

  return (
    <div className="grid gap-6">
      <div
        role="tablist"
        aria-label={t("roleTabs")}
        className="flex gap-2 border-b border-[var(--rule)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "entertainer"}
          className={`min-h-11 px-4 text-sm ${
            tab === "entertainer"
              ? "border-b-2 border-[var(--terracotta)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
          onClick={() => setTab("entertainer")}
        >
          {t("entertainerTitle")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "venue"}
          className={`min-h-11 px-4 text-sm ${
            tab === "venue"
              ? "border-b-2 border-[var(--terracotta)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
          onClick={() => setTab("venue")}
        >
          {t("venuesTitle")}
        </button>
      </div>
      <div role="tabpanel">{tab === "entertainer" ? entertainer : venue}</div>
    </div>
  );
}
