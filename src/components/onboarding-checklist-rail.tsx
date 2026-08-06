"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { dismissOnboardingChecklistAction } from "@/src/actions/onboarding-checklist";
import type { OnboardingChecklistView } from "@/src/domain/onboarding-checklist";
import { ONBOARDING_CHECKLIST_STEPS } from "@/src/domain/onboarding-checklist";
import { Link } from "@/src/i18n/navigation";

type Props = {
  checklist: OnboardingChecklistView;
};

function CheckIcon({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border ${
        done
          ? "border-[color-mix(in_srgb,var(--primary)_55%,white)] bg-[color-mix(in_srgb,var(--primary)_70%,white)] text-[var(--primary-foreground)]"
          : "border-white/25 bg-transparent"
      }`}
    >
      {done ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.2L4.1 7.3L8 2.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

export function OnboardingChecklistRail({ checklist }: Props) {
  const t = useTranslations("onboardingChecklist");
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  return (
    <section
      className="mt-6 rounded-[var(--radius-md)] border border-white/15 bg-white/5 px-3 py-3"
      aria-label={t("title")}
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-white/55 uppercase">
        {t("title")}
      </p>
      <ol className="mt-3 grid gap-2.5">
        {ONBOARDING_CHECKLIST_STEPS.map((step) => {
          const done = checklist[step];
          return (
            <li key={step} className="flex items-start gap-2.5">
              <CheckIcon done={done} />
              <span
                className={`text-xs leading-snug ${
                  done ? "text-white/55 line-through" : "text-white/85"
                }`}
              >
                {t(`steps.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {checklist.allComplete ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-xs leading-snug text-white/85">
            {t("completeBody")}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await dismissOnboardingChecklistAction();
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                setHidden(true);
              });
            }}
            className="mt-2 inline-flex min-h-8 items-center justify-center rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-60"
          >
            {pending ? t("dismissing") : t("dismiss")}
          </button>
          {error ? (
            <p role="alert" className="mt-1.5 text-[0.65rem] text-[#ffb4a8]">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[0.65rem] leading-snug text-white/45">
          {t("progress", {
            done: checklist.completedCount,
            total: checklist.totalCount,
          })}
        </p>
      )}

      <p className="mt-3 border-t border-white/10 pt-3">
        <Link
          href="/marketplace/help"
          className="text-[0.65rem] font-medium text-white/55 no-underline hover:text-white/80"
        >
          {t("needHelp")}
        </Link>
      </p>
    </section>
  );
}
