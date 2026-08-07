"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import { applyToOpportunity } from "@/src/actions/opportunities";
import { Button } from "@/src/components/ui/button";

type OpenCall = {
  id: string;
  title: string;
  kind: "dated" | "standing";
  startsAt: Date | null;
  endsAt: Date | null;
  standingSchedule: string | null;
  formatCategory: string;
  ownApplicationState: string | null;
};

type Props = {
  locale: "en" | "de";
  canSubmit: boolean;
  publishRequired: boolean;
  openCalls: OpenCall[];
  defaultQuoteMinEur?: number;
  defaultQuoteMaxEur?: number;
};

/** Mid-page open calls on venue public profile (submit CTA lives in the hero). */
export function VenueOpenCallsPanel({
  locale,
  canSubmit,
  publishRequired,
  openCalls,
  defaultQuoteMinEur = 0,
  defaultQuoteMaxEur = 0,
}: Props) {
  const t = useTranslations("leads");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  });

  if (openCalls.length === 0) return null;

  function oneClickApply(opportunityId: string) {
    setError(null);
    setSuccess(null);
    setApplyingId(opportunityId);
    startTransition(async () => {
      const result = await applyToOpportunity({
        opportunityId,
        message: t("oneClickApplyMessage"),
        quoteMinEur: defaultQuoteMinEur,
        quoteMaxEur: Math.max(defaultQuoteMaxEur, defaultQuoteMinEur),
        intent: "submit",
        locale,
      });
      setApplyingId(null);
      if (!result.ok) {
        setError(
          result.code === "validation" || result.code === "forbidden"
            ? errors(result.code)
            : result.message,
        );
        return;
      }
      setSuccess(t("oneClickApplied"));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-medium text-[var(--ink)]">
          {t("openCallsTitle")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("openCallsBody")}
        </p>
        <ul className="mt-4 grid gap-3">
          {openCalls.map((call) => (
            <li
              key={call.id}
              className="flex flex-col gap-3 border border-[var(--rule)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--ink)]">{call.title}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {call.formatCategory}
                  {call.kind === "standing"
                    ? ` · ${call.standingSchedule?.trim() || t("standingOpenCall")}`
                    : call.startsAt
                      ? ` · ${dateFmt.format(call.startsAt)}`
                      : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/marketplace/opportunities/${call.id}`}
                  className="inline-flex min-h-10 items-center border border-[var(--rule)] px-3 text-sm no-underline"
                >
                  {t("viewOpenCall")}
                </Link>
                {call.ownApplicationState ? (
                  <span className="inline-flex min-h-10 items-center text-sm text-[var(--text-muted)]">
                    {t("alreadyApplied", { state: call.ownApplicationState })}
                  </span>
                ) : canSubmit && !publishRequired ? (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => oneClickApply(call.id)}
                  >
                    {applyingId === call.id
                      ? t("applying")
                      : t("oneClickApply")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[var(--ink)]" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
