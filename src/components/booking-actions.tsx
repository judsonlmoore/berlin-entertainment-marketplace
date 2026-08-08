"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  acceptBookingTerms,
  cancelBooking,
  recordDepositStatus,
} from "@/src/actions/bookings";
import {
  ensureAgreementPackage,
  generateAgreement,
  signAgreementSandbox,
} from "@/src/actions/agreements";
import { generateBookingInvoice } from "@/src/actions/invoices";
import { Button } from "@/src/components/ui/button";
import { Link, useRouter } from "@/src/i18n/navigation";

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
      className="panel grid gap-4 p-6"
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
      <div className="border-l-4 border-[var(--danger)] pl-4">
        <h2 className="page-title text-xl text-[var(--danger)]">
          {t("dangerZoneTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("dangerZoneBody")}
        </p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--warning-soft)] p-4">
        <h3 className="text-sm font-semibold text-[var(--ink)]">
          {t("cancelTitle")}
        </h3>
        <p className="mt-2 text-sm text-[var(--ink)]">{t("cancelBody")}</p>
        <label className="mt-4 grid gap-1 text-sm">
          <span>{t("cancelReason")}</span>
          <textarea name="reason" required rows={2} className="field" />
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          pending={pending}
          pendingLabel={ui("working")}
          variant="secondary"
          className="mt-4 border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

export function GenerateAgreementButton({
  locale,
  bookingId,
  expectedVersion,
  disabled = false,
  disabledReason,
}: {
  locale: "en" | "de";
  bookingId: string;
  expectedVersion: number;
  disabled?: boolean;
  disabledReason?: string | null;
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
        disabled={disabled}
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
      {disabled && disabledReason ? (
        <p className="text-sm text-[var(--text-muted)]">
          {disabledReason}{" "}
          <Link href="/profile" className="font-medium underline">
            {t("goToProfile")}
          </Link>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DownloadAgreementPackageButton({
  agreementId,
}: {
  agreementId: string;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
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
            try {
              const res = await fetch(`/api/agreements/${agreementId}/package`);
              if (!res.ok) {
                setError(t("downloadPackageFailed"));
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `agreement-${agreementId.slice(0, 8)}.pdf`;
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
              URL.revokeObjectURL(url);
            } catch {
              setError(t("downloadPackageFailed"));
            }
          });
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {t("downloadPackagePdf")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BuildAgreementPackageButton({
  locale,
  bookingId,
  agreementId,
  force = false,
}: {
  locale: "en" | "de";
  bookingId: string;
  agreementId: string;
  force?: boolean;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      {!force ? (
        <p className="text-sm text-[var(--text-muted)]">
          {t("packagePdfMissing")}
        </p>
      ) : null}
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant={force ? "secondary" : "primary"}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await ensureAgreementPackage({
              bookingId,
              agreementId,
              locale,
              force,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {force ? t("rebuildPackagePdf") : t("buildPackagePdf")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DownloadInvoiceButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
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
            try {
              const res = await fetch(`/api/invoices/${bookingId}`);
              if (!res.ok) {
                setError(t("downloadInvoiceFailed"));
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `salon-invoice-${bookingId.slice(0, 8)}.pdf`;
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
              URL.revokeObjectURL(url);
            } catch {
              setError(t("downloadInvoiceFailed"));
            }
          });
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {t("downloadInvoice")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GenerateInvoiceButton({
  locale,
  bookingId,
  force = false,
}: {
  locale: "en" | "de";
  bookingId: string;
  force?: boolean;
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
        variant="secondary"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await generateBookingInvoice({
              bookingId,
              locale,
              force,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {force ? t("rebuildInvoice") : t("generateInvoice")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SignAgreementForm({
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
  const [phrase, setPhrase] = useState("");
  const required = locale === "de" ? "Ich stimme zu" : "I agree";
  const phraseOk =
    phrase.trim().toLocaleLowerCase() === required.toLocaleLowerCase();

  return (
    <div className="grid gap-3 border-t border-[var(--rule)] pt-4">
      <p className="text-sm text-[var(--text-muted)]">
        {t("signConfirmHint", { phrase: required })}
      </p>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("signConfirmLabel")}</span>
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          autoComplete="off"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-3"
          placeholder={required}
        />
      </label>
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
        disabled={!phraseOk}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await signAgreementSandbox({
              bookingId,
              agreementId,
              expectedVersion,
              confirmationPhrase: phrase,
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

/** @deprecated Use SignAgreementForm */
export function SignAgreementButton(
  props: Parameters<typeof SignAgreementForm>[0],
) {
  return <SignAgreementForm {...props} />;
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
        <select name="status" defaultValue={currentStatus} className="field">
          <option value="not_required">{t("depositNotRequired")}</option>
          <option value="pending">{t("depositPending")}</option>
          <option value="received">{t("depositReceived")}</option>
          <option value="refunded">{t("depositRefunded")}</option>
          <option value="disputed">{t("depositDisputed")}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("depositNote")}</span>
        <input name="note" className="field" />
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
