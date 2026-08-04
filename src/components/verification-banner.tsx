"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";

export function VerificationBanner() {
  const t = useTranslations("verification");

  return (
    <aside
      className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--warning-soft)] px-4 py-4 text-[var(--ink)]"
      role="status"
    >
      <p className="text-sm font-semibold">{t("title")}</p>
      <p className="mt-1 text-sm">{t("body")}</p>
      <ul className="mt-3 grid gap-1 text-sm">
        <li>
          <Link href="/profile" className="font-medium underline">
            {t("linkProfile")}
          </Link>
        </li>
        <li>
          <Link href="/marketplace/calendar" className="font-medium underline">
            {t("linkCalendar")}
          </Link>
        </li>
        <li>
          <Link href="/marketplace" className="font-medium underline">
            {t("linkExplore")}
          </Link>
        </li>
      </ul>
    </aside>
  );
}
