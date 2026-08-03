"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  applyToOpportunity,
  reviewApplication,
  transitionOpportunity,
  withdrawApplication,
} from "@/src/actions/opportunities";
import { Button } from "@/src/components/ui/button";
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
  const ui = useTranslations("ui");
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
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
      >
        {t("apply")}
      </Button>
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
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      pending={pending}
      pendingLabel={ui("working")}
      variant="secondary"
      onClick={() => {
        startTransition(async () => {
          await withdrawApplication(applicationId, locale);
          router.refresh();
        });
      }}
    >
      {t("withdraw")}
    </Button>
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
  const ui = useTranslations("ui");
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
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
          onClick={() => transition("open")}
        >
          {t("publish")}
        </Button>
      ) : null}
      {state === "open" ? (
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          onClick={() => transition("closed")}
        >
          {t("close")}
        </Button>
      ) : null}
      {state === "closed" ? (
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
          onClick={() => transition("open")}
        >
          {t("reopen")}
        </Button>
      ) : null}
      {state === "draft" || state === "open" ? (
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          onClick={() => transition("cancelled")}
        >
          {t("cancel")}
        </Button>
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
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "submitted") return null;

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
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
      </Button>
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
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
      </Button>
    </div>
  );
}
