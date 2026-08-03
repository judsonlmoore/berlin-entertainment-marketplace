"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  applyToOpportunity,
  replyClarification,
  requestClarification,
  reviewApplication,
  transitionOpportunity,
  withdrawApplication,
} from "@/src/actions/opportunities";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type ClarificationNote = {
  id: string;
  body: string;
  createdAt: Date;
  authorUserId: string;
};

export function ApplyForm({
  locale,
  opportunityId,
  initial,
}: {
  locale: "en" | "de";
  opportunityId: string;
  initial?: {
    message: string;
    quoteMinEur: number;
    quoteMaxEur: number;
    isDraft?: boolean;
  };
}) {
  const t = useTranslations("opportunities");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function submit(intent: "draft" | "submit") {
    setError(null);
    setSuccess(null);
    const form = document.getElementById(
      `apply-form-${opportunityId}`,
    ) as HTMLFormElement | null;
    if (!form) return;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await applyToOpportunity({
        opportunityId,
        message: String(data.get("message") ?? ""),
        quoteMinEur: Number(data.get("quoteMinEur") ?? 0),
        quoteMaxEur: Number(data.get("quoteMaxEur") ?? 0),
        intent,
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
      setSuccess(intent === "draft" ? t("draftSaved") : t("submitted"));
      router.refresh();
    });
  }

  return (
    <form id={`apply-form-${opportunityId}`} className="grid gap-3">
      <h3 className="text-lg font-medium">
        {initial?.isDraft ? t("continueDraft") : t("applyTitle")}
      </h3>
      <label className="grid gap-1 text-sm">
        <span>{t("message")}</span>
        <textarea
          name="message"
          required={!initial?.isDraft}
          rows={4}
          defaultValue={initial?.message}
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
            required={!initial?.isDraft}
            defaultValue={initial?.quoteMinEur ?? undefined}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t("quoteMax")}</span>
          <input
            name="quoteMaxEur"
            type="number"
            min={0}
            required={!initial?.isDraft}
            defaultValue={initial?.quoteMaxEur ?? undefined}
            className="border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {success}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          onClick={() => submit("draft")}
        >
          {t("saveDraft")}
        </Button>
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
          onClick={() => submit("submit")}
        >
          {t("apply")}
        </Button>
      </div>
    </form>
  );
}

export function ClarificationNotesList({
  notes,
  locale,
}: {
  notes: ClarificationNote[];
  locale: "en" | "de";
}) {
  const t = useTranslations("opportunities");
  if (notes.length === 0) return null;

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="grid gap-2">
      <h4 className="text-sm font-medium">{t("clarificationTitle")}</h4>
      <ul className="grid gap-2 text-sm">
        {notes.map((note) => (
          <li key={note.id} className="border border-[var(--line)] p-3">
            <p className="text-xs text-[var(--muted)]">
              {dateFmt.format(note.createdAt)}
            </p>
            <p className="mt-1">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RequestClarificationForm({
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await requestClarification({
            applicationId,
            body: String(form.get("body") ?? ""),
            locale,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setSuccess(t("clarificationSent"));
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>{t("requestClarification")}</span>
        <textarea
          name="body"
          required
          rows={3}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {success}
        </p>
      ) : null}
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
      >
        {t("requestClarification")}
      </Button>
    </form>
  );
}

export function ReplyClarificationForm({
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await replyClarification({
            applicationId,
            body: String(form.get("body") ?? ""),
            locale,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setSuccess(t("clarificationReplied"));
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>{t("replyClarification")}</span>
        <textarea
          name="body"
          required
          rows={3}
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {success}
        </p>
      ) : null}
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
      >
        {t("replyClarification")}
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
  clarificationNotes = [],
}: {
  locale: "en" | "de";
  applicationId: string;
  state: string;
  clarificationNotes?: ClarificationNote[];
}) {
  const t = useTranslations("opportunities");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "submitted" && state !== "clarification_requested") return null;

  return (
    <div className="grid gap-3">
      <ClarificationNotesList notes={clarificationNotes} locale={locale} />
      <div className="flex flex-wrap gap-2">
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
      {state === "submitted" || state === "clarification_requested" ? (
        <RequestClarificationForm locale={locale} applicationId={applicationId} />
      ) : null}
    </div>
  );
}
