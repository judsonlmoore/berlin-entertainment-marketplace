"use client";

import { useTranslations } from "next-intl";
import type { MarketplaceRole } from "@/src/domain/permissions";

export type RailRoleContextProps = {
  mode: MarketplaceRole;
  label: string | null;
  canSwitch: boolean;
  otherMode: MarketplaceRole | null;
  locale: "en" | "de";
  onNavigate?: (() => void) | undefined;
};

export function RailRoleContext({ mode, label }: RailRoleContextProps) {
  const t = useTranslations("roleMode");

  const modeBadge = mode === "entertainer" ? t("actBadge") : t("venueBadge");
  const modeName =
    mode === "entertainer" ? t("entertainerMode") : t("venueMode");
  const displayName = label?.trim() || modeName;

  return (
    <div
      className="mt-6 flex min-h-11 max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-white/15 bg-white/5 px-2.5 py-2"
      aria-label={t("currentMode", { role: modeName })}
    >
      <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.1em] text-white uppercase">
        {modeBadge}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-white/90">
        {displayName}
      </span>
    </div>
  );
}
