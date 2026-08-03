"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  proposeDirectRequestChanges,
  respondToDirectRequest,
  venueRespondToDirectRequestChanges,
  withdrawDirectRequest,
} from "@/src/actions/direct-requests";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function RespondDirectRequestButtons({
  locale,
  requestId,
  state,
}: {
  locale: "en" | "de";
  requestId: string;
  state: string;
}) {
  const t = useTranslations("directRequests");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);

  if (state !== "requested") return null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
          onClick={() => {
            setSuccess(null);
            startTransition(async () => {
              const result = await respondToDirectRequest({
                requestId,
                nextState: "accepted",
                locale,
              });
              if (result.ok) {
                setSuccess(t("acceptedHint"));
              }
              router.refresh();
            });
          }}
        >
          {t("accept")}
        </Button>
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          onClick={() => {
            setSuccess(null);
            startTransition(async () => {
              await respondToDirectRequest({
                requestId,
                nextState: "declined",
                locale,
              });
              router.refresh();
            });
          }}
        >
          {t("decline")}
        </Button>
      </div>
      <ProposeChangesForm locale={locale} requestId={requestId} />
      {success ? (
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {success}
        </p>
      ) : null}
    </div>
  );
}

export function ProposeChangesForm({
  locale,
  requestId,
}: {
  locale: "en" | "de";
  requestId: string;
}) {
  const t = useTranslations("directRequests");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="grid gap-2 border border-[var(--line)] p-3 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        const form = new FormData(event.currentTarget);
        const notes = String(form.get("notes") ?? "").trim();
        const startsAt = String(form.get("startsAt") ?? "");
        const endsAt = String(form.get("endsAt") ?? "");
        const feeRaw = String(form.get("proposedFeeEur") ?? "");

        startTransition(async () => {
          const result = await proposeDirectRequestChanges({
            requestId,
            ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
            ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
            ...(feeRaw ? { proposedFeeEur: Number(feeRaw) } : {}),
            ...(notes ? { notes } : {}),
            locale,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setSuccess(t("changesProposed"));
          router.refresh();
        });
      }}
    >
      <p className="font-medium">{t("proposeChangesTitle")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1">
          <span>{t("startsAt")}</span>
          <input
            name="startsAt"
            type="datetime-local"
            className="border border-[var(--line)] bg-transparent px-2 py-1"
          />
        </label>
        <label className="grid gap-1">
          <span>{t("endsAt")}</span>
          <input
            name="endsAt"
            type="datetime-local"
            className="border border-[var(--line)] bg-transparent px-2 py-1"
          />
        </label>
      </div>
      <label className="grid gap-1">
        <span>{t("proposedFee")}</span>
        <input
          name="proposedFeeEur"
          type="number"
          min={0}
          className="border border-[var(--line)] bg-transparent px-2 py-1"
        />
      </label>
      <label className="grid gap-1">
        <span>{t("notes")}</span>
        <textarea
          name="notes"
          rows={2}
          className="border border-[var(--line)] bg-transparent px-2 py-1"
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
        {t("proposeChanges")}
      </Button>
    </form>
  );
}

export function VenueRespondToChangesButtons({
  locale,
  requestId,
  state,
}: {
  locale: "en" | "de";
  requestId: string;
  state: string;
}) {
  const t = useTranslations("directRequests");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);

  if (state !== "changes_proposed") return null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="primary"
          onClick={() => {
            setSuccess(null);
            startTransition(async () => {
              const result = await venueRespondToDirectRequestChanges({
                requestId,
                nextState: "accepted",
                locale,
              });
              if (result.ok) {
                setSuccess(t("acceptedHint"));
              }
              router.refresh();
            });
          }}
        >
          {t("acceptChanges")}
        </Button>
        <Button
          type="button"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          onClick={() => {
            setSuccess(null);
            startTransition(async () => {
              await venueRespondToDirectRequestChanges({
                requestId,
                nextState: "declined",
                locale,
              });
              router.refresh();
            });
          }}
        >
          {t("declineChanges")}
        </Button>
      </div>
      {success ? (
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {success}
        </p>
      ) : null}
    </div>
  );
}

export function WithdrawDirectRequestButton({
  locale,
  requestId,
  state,
}: {
  locale: "en" | "de";
  requestId: string;
  state: string;
}) {
  const t = useTranslations("directRequests");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "requested" && state !== "changes_proposed") return null;

  return (
    <Button
      type="button"
      pending={pending}
      pendingLabel={ui("working")}
      variant="secondary"
      onClick={() => {
        startTransition(async () => {
          await withdrawDirectRequest(requestId, locale);
          router.refresh();
        });
      }}
    >
      {t("withdraw")}
    </Button>
  );
}
