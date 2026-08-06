"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import { submitProfileEnquiryAction } from "@/src/actions/profile-enquiries";
import { applyToOpportunity } from "@/src/actions/opportunities";
import { Button } from "@/src/components/ui/button";

type OpenCall = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  formatCategory: string;
  ownApplicationState: string | null;
};

type Props = {
  locale: "en" | "de";
  venueId: string;
  canSubmit: boolean;
  publishRequired: boolean;
  activeEnquiryBookingId?: string | null;
  openCalls: OpenCall[];
  defaultQuoteMinEur?: number;
  defaultQuoteMaxEur?: number;
};

export function VenueProfileContactPanel({
  locale,
  venueId,
  canSubmit,
  publishRequired,
  activeEnquiryBookingId,
  openCalls,
  defaultQuoteMinEur = 0,
  defaultQuoteMaxEur = 0,
}: Props) {
  const t = useTranslations("leads");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  });

  function submitEnquiry() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await submitProfileEnquiryAction({
        venueId,
        note,
        locale,
      });
      if (!result.ok) {
        setError(
          result.code === "validation" || result.code === "forbidden"
            ? errors(result.code)
            : result.message,
        );
        return;
      }
      setSuccess(t("enquirySubmitted"));
      setNote("");
      router.refresh();
    });
  }

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
    <div className="grid gap-6">
      <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-medium text-[var(--ink)]">
          {t("submitProfileTitle")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("submitProfileBody")}
        </p>

        {publishRequired ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("publishRequired")}{" "}
            <Link href="/profile" className="font-medium underline">
              {t("goToProfile")}
            </Link>
          </p>
        ) : activeEnquiryBookingId ? (
          <p className="mt-4 text-sm text-[var(--ink)]">
            {t("enquiryAlreadyActive")}{" "}
            <Link
              href={`/marketplace/bookings/${activeEnquiryBookingId}`}
              className="font-medium underline"
            >
              {t("viewLead")}
            </Link>
          </p>
        ) : canSubmit ? (
          <div className="mt-4 grid gap-3">
            <label className="label">
              <span className="field-label">{t("noteLabel")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={2000}
                className="field"
                placeholder={t("notePlaceholder")}
              />
            </label>
            <Button
              type="button"
              disabled={pending}
              onClick={submitEnquiry}
              className="justify-self-start"
            >
              {pending ? t("submitting") : t("submitProfileCta")}
            </Button>
          </div>
        ) : null}
      </section>

      {openCalls.length > 0 ? (
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
                    {call.formatCategory} · {dateFmt.format(call.startsAt)}
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
      ) : null}

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
