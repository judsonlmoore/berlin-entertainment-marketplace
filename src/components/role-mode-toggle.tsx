"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { switchActiveRoleMode } from "@/src/actions/onboarding";
import { useRouter } from "@/src/i18n/navigation";
import type { MarketplaceRole } from "@/src/domain/permissions";

type Props = {
  currentMode: MarketplaceRole | null;
  availableRoles: readonly MarketplaceRole[];
  locale: "en" | "de";
};

export function RoleModeToggle({
  currentMode,
  availableRoles,
  locale,
}: Props) {
  const t = useTranslations("roleMode");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (availableRoles.length <= 1) {
    return null;
  }

  const otherRole = availableRoles.find((r) => r !== currentMode);

  if (!otherRole || !currentMode) {
    return null;
  }

  const handleSwitch = () => {
    setError(null);
    startTransition(async () => {
      const result = await switchActiveRoleMode({
        mode: otherRole,
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

      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--surface)] p-4">
      <p className="text-sm font-medium text-[var(--text-muted)]">
        {t("explainer")}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm">
          {t("currentMode", {
            role: t(
              currentMode === "entertainer"
                ? "entertainerMode"
                : "venueMode",
            ),
          })}
        </span>
        <button
          type="button"
          onClick={handleSwitch}
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? "..."
            : t("switchTo", {
                role: t(
                  otherRole === "entertainer"
                    ? "entertainerMode"
                    : "venueMode",
                ),
              })}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
