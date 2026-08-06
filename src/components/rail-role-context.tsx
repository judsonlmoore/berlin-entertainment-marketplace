"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";
import type { MarketplaceRole } from "@/src/domain/permissions";

export type RailRoleContextProps = {
  mode: MarketplaceRole;
  label: string | null;
  canSwitch: boolean;
  otherMode: MarketplaceRole | null;
  locale: "en" | "de";
  onNavigate?: (() => void) | undefined;
};

export function RailRoleContext({
  mode,
  label,
  onNavigate,
}: RailRoleContextProps) {
  const t = useTranslations("roleMode");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const active = pathname.startsWith("/profile");

  const modeBadge = mode === "entertainer" ? t("actBadge") : t("venueBadge");
  const modeName =
    mode === "entertainer" ? t("entertainerMode") : t("venueMode");
  const displayName = label?.trim() || modeName;

  return (
    <Link
      href="/profile"
      onClick={onNavigate}
      className={`mt-6 flex min-h-11 max-w-full items-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 no-underline transition-colors duration-150 motion-reduce:transition-none ${
        active
          ? "border-white/25 bg-[var(--rail-active)]"
          : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/10"
      }`}
      aria-label={t("editProfileAria", { name: displayName })}
      aria-current={active ? "page" : undefined}
    >
      <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.1em] text-white uppercase">
        {modeBadge}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
        {displayName}
      </span>
      <span className="shrink-0 text-xs font-medium text-white/55">
        {tNav("editProfile")}
      </span>
    </Link>
  );
}
