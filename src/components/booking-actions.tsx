"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  acceptBookingTerms,
  cancelBooking,
  recordDepositStatus,
} from "@/src/actions/bookings";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        className="bg-[var(--accent)] px-3 py-2 text-sm text-[var(--background)] disabled:opacity-60"
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
      </button>
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
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-60"
      >
        {t("cancel")}
      </button>
    </form>
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
          className="border border-[var(--line)] bg-transparent px-3 py-2"
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
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-60"
      >
        {t("depositSave")}
      </button>
    </form>
  );
}
