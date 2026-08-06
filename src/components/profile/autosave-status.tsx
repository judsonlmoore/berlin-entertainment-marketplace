"use client";

import { useTranslations } from "next-intl";
import type { AutosavePhase } from "@/src/components/profile/use-profile-autosave";

type Props = {
  phase: AutosavePhase;
  errorMessage?: string | null;
};

export function AutosaveStatus({ phase, errorMessage }: Props) {
  const t = useTranslations("profile");

  let label = t("autosaveIdle");
  let tone: "muted" | "ink" | "danger" | "primary" = "muted";

  switch (phase) {
    case "dirty":
      label = t("autosaveUnsaved");
      tone = "muted";
      break;
    case "saving":
      label = t("autosaveSaving");
      tone = "ink";
      break;
    case "saved":
      label = t("autosaveSaved");
      tone = "primary";
      break;
    case "error":
      label = errorMessage?.trim() ? errorMessage : t("autosaveError");
      tone = "danger";
      break;
    case "blocked":
      label = t("autosaveBlocked");
      tone = "muted";
      break;
    default:
      break;
  }

  const className =
    tone === "danger"
      ? "text-[var(--danger)]"
      : tone === "primary"
        ? "text-[var(--primary)]"
        : tone === "ink"
          ? "text-[var(--ink)]"
          : "text-[var(--text-muted)]";

  if (!label.trim()) return null;

  return (
    <p
      aria-live="polite"
      className={`inline-flex min-h-9 items-center text-sm font-medium ${className}`}
    >
      {label}
    </p>
  );
}
