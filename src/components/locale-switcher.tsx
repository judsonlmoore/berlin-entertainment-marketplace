"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { routing, type AppLocale } from "@/src/i18n/routing";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("nav");

  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="sr-only">{t("localeLabel")}</span>
      <select
        className="field min-w-[10rem] text-sm"
        value={locale}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={t("localeLabel")}
        onChange={(event) => {
          const nextLocale = event.target.value as AppLocale;
          if (nextLocale === locale) return;
          if (!routing.locales.includes(nextLocale)) return;
          startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
          });
        }}
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {t(`localeName.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
