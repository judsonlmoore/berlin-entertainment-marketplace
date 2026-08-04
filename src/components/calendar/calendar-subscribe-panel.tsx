"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  subscribeUrl: string;
};

export function CalendarSubscribePanel({ subscribeUrl }: Props) {
  const t = useTranslations("calendar");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="panel grid gap-3 p-4">
      <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
        {t("icsSubscribeTitle")}
      </h2>
      <p className="text-sm text-[var(--text-muted)]">{t("icsSubscribeBody")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <code className="min-w-0 flex-1 break-all rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3 text-xs sm:text-sm">
          {subscribeUrl}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          {copied ? t("icsSubscribeCopied") : t("icsSubscribeCopy")}
        </button>
      </div>
    </section>
  );
}
