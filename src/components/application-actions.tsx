"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  applyToOpportunity,
  reviewApplication,
  transitionOpportunity,
  withdrawApplication,
} from "@/src/actions/opportunities";
import { useRouter } from "@/src/i18n/navigation";

export function ApplyForm({
  locale,
  opportunityId,
}: {
  locale: "en" | "de";
  opportunityId: string;
}) {
  const t = useTranslations("opportunities");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await applyToOpportunity({
            opportunityId,
            message: String(form.get("message") ?? ""),
            quoteMinEur: Number(form.get("quoteMinEur") ?? 0),
            quoteMaxEur: Number(form.get("quoteMaxEur") ?? 0),
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
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("applyTitle")}</h3>
      <label className="grid gap-1 text-sm">
        <span>{t("message")}</span>
        <textarea
          name="message"
          required
          rows={4}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{t("quoteMin")}</span>
          <input
            name="quoteMinEur"
            type="number"
            min={0}
            required
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("quoteMax")}</span>
          <input
            name="quoteMaxEur"
            type="number"
            min={0}
            required
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-[var(--accent)] px-4 py-3 text-[var(--background)] disabled:opacity-60"
      >
        {t("apply")}
      </button>
    </form>
  );
}

export function WithdrawButton({
  locale,
  applicationId,
}: {
  locale: "en" | "de";
  applicationId: string;
}) {
  const t = useTranslations("opportunities");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-60"
      onClick={() => {
        startTransition(async () => {
          await withdrawApplication(applicationId, locale);
          router.refresh();
        });
      }}
    >
      {t("withdraw")}
    </button>
  );
}

export function OpportunityStateButtons({
  locale,
  opportunityId,
  state,
}: {
  locale: "en" | "de";
  opportunityId: string;
  state: string;
}) {
  const t = useTranslations("opportunities");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function transition(nextState: "open" | "closed" | "cancelled") {
    startTransition(async () => {
      await transitionOpportunity({ opportunityId, nextState, locale });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {state === "draft" ? (
        <button
          type="button"
          disabled={pending}
          className="bg-[var(--accent)] px-3 py-2 text-sm text-[var(--background)]"
          onClick={() => transition("open")}
        >
          {t("publish")}
        </button>
      ) : null}
      {state === "open" ? (
        <button
          type="button"
          disabled={pending}
          className="border border-[var(--line)] px-3 py-2 text-sm"
          onClick={() => transition("closed")}
        >
          {t("close")}
        </button>
      ) : null}
      {state === "closed" ? (
        <button
          type="button"
          disabled={pending}
          className="bg-[var(--accent)] px-3 py-2 text-sm text-[var(--background)]"
          onClick={() => transition("open")}
        >
          {t("reopen")}
        </button>
      ) : null}
      {state === "draft" || state === "open" ? (
        <button
          type="button"
          disabled={pending}
          className="border border-[var(--line)] px-3 py-2 text-sm"
          onClick={() => transition("cancelled")}
        >
          {t("cancel")}
        </button>
      ) : null}
    </div>
  );
}

export function ReviewApplicationButtons({
  locale,
  applicationId,
  state,
}: {
  locale: "en" | "de";
  applicationId: string;
  state: string;
}) {
  const t = useTranslations("opportunities");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "submitted") return null;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        className="bg-[var(--accent)] px-3 py-2 text-sm text-[var(--background)]"
        onClick={() => {
          startTransition(async () => {
            await reviewApplication({
              applicationId,
              nextState: "shortlisted",
              locale,
            });
            router.refresh();
          });
        }}
      >
        {t("shortlist")}
      </button>
      <button
        type="button"
        disabled={pending}
        className="border border-[var(--line)] px-3 py-2 text-sm"
        onClick={() => {
          startTransition(async () => {
            await reviewApplication({
              applicationId,
              nextState: "rejected",
              locale,
            });
            router.refresh();
          });
        }}
      >
        {t("reject")}
      </button>
    </div>
  );
}
