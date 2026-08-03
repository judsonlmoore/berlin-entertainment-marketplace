"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import type { AppLocale } from "@/src/i18n/routing";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("nav");
  const nextLocale: AppLocale = locale === "en" ? "de" : "en";

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={t("switchLocale", { locale: nextLocale.toUpperCase() })}
      className={`min-h-11 min-w-11 border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm uppercase disabled:opacity-60 ${className}`}
      onClick={() => {
        startTransition(() => {
          router.replace(pathname, { locale: nextLocale });
        });
      }}
    >
      {pending ? "…" : nextLocale.toUpperCase()}
    </button>
  );
}
