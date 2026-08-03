"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  acceptBookingTerms,
  cancelBooking,
  recordDepositStatus,
} from "@/src/actions/bookings";
import {
  generateAgreement,
  signAgreementSandbox,
} from "@/src/actions/agreements";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function AcceptTermsButton({
  locale,
  bookingId,
  termsId,
  expectedVersion,
}: {
  locale: "en" | "de";
  bookingId: string;
  termsId: string;
  expectedVersion: number;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptBookingTerms({
              bookingId,
              termsId,
              expectedVersion,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {t("acceptTerms")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CancelBookingForm({
  locale,
  bookingId,
  expectedVersion,
}: {
  locale: "en" | "de";
  bookingId: string;
  expectedVersion: number;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await cancelBooking({
            bookingId,
            expectedVersion,
            reason: String(form.get("reason") ?? ""),
            locale,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("cancelTitle")}</h3>
      <label className="grid gap-1 text-sm">
        <span>{t("cancelReason")}</span>
        <textarea
          name="reason"
          required
          rows={2}
          className="field"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
      >
        {t("cancel")}
      </Button>
    </form>
  );
}

export function GenerateAgreementButton({
  locale,
  bookingId,
  expectedVersion,
}: {
  locale: "en" | "de";
  bookingId: string;
  expectedVersion: number;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await generateAgreement({
              bookingId,
              expectedVersion,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {t("generateAgreement")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SignAgreementButton({
  locale,
  bookingId,
  agreementId,
  expectedVersion,
}: {
  locale: "en" | "de";
  bookingId: string;
  agreementId: string;
  expectedVersion: number;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await signAgreementSandbox({
              bookingId,
              agreementId,
              expectedVersion,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {t("signSandbox")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DepositStatusForm({
  locale,
  bookingId,
  currentStatus,
}: {
  locale: "en" | "de";
  bookingId: string;
  currentStatus: string;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const note = String(form.get("note") ?? "").trim();
        startTransition(async () => {
          const result = await recordDepositStatus({
            bookingId,
            status: String(form.get("status") ?? "") as
              "not_required" | "pending" | "received" | "refunded" | "disputed",
            ...(note ? { note } : {}),
            locale,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-medium">{t("depositTitle")}</h3>
      <p className="text-sm text-[var(--muted)]">{t("depositBody")}</p>
      <p className="text-sm">
        {t("depositCurrent")}: {currentStatus}
      </p>
      <label className="grid gap-1 text-sm">
        <span>{t("depositStatus")}</span>
        <select
          name="status"
          defaultValue={currentStatus}
          className="field"
        >
          <option value="not_required">{t("depositNotRequired")}</option>
          <option value="pending">{t("depositPending")}</option>
          <option value="received">{t("depositReceived")}</option>
          <option value="refunded">{t("depositRefunded")}</option>
          <option value="disputed">{t("depositDisputed")}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("depositNote")}</span>
        <input
          name="note"
          className="field"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
      >
        {t("depositSave")}
      </Button>
    </form>
  );
}
