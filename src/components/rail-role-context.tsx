"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { switchActiveRoleMode } from "@/src/actions/onboarding";
import { useRouter } from "@/src/i18n/navigation";
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
  canSwitch,
  otherMode,
  locale,
  onNavigate,
}: RailRoleContextProps) {
  const t = useTranslations("roleMode");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const modeBadge = mode === "entertainer" ? t("actBadge") : t("venueBadge");
  const modeName =
    mode === "entertainer" ? t("entertainerMode") : t("venueMode");
  const displayName = label?.trim() || modeName;

  const handleSwitch = () => {
    if (!canSwitch || !otherMode) return;
    setError(null);
    startTransition(async () => {
      const result = await switchActiveRoleMode({
        mode: otherMode,
        locale,
      });
      if (!result.ok) {
        setError(
          result.code === "validation" ||
            result.code === "unauthorized" ||
            result.code === "forbidden"
            ? errors(result.code)
            : result.message,
        );
        return;
      }
      onNavigate?.();
      router.refresh();
    });
  };

  const content = (
    <>
      <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.1em] text-white uppercase">
        {modeBadge}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-white/90">
        {displayName}
      </span>
    </>
  );

  if (canSwitch && otherMode) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSwitch}
          disabled={pending}
          title={t("switchTo", {
            role:
              otherMode === "entertainer"
                ? t("entertainerMode")
                : t("venueMode"),
          })}
          aria-label={t("switchTo", {
            role:
              otherMode === "entertainer"
                ? t("entertainerMode")
                : t("venueMode"),
          })}
          className="flex min-h-11 w-full max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-white/15 bg-white/5 px-2.5 py-2 text-left transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        >
          {content}
        </button>
        {error ? (
          <p role="alert" className="mt-1.5 text-xs text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="mt-6 flex min-h-11 max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-white/15 bg-white/5 px-2.5 py-2"
      aria-label={t("currentMode", { role: modeName })}
    >
      {content}
    </div>
  );
}
