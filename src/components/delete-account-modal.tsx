"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteUserAccount } from "@/src/actions/account-deletion";
import { Button } from "@/src/components/ui/button";

type Props = {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
};

export function DeleteAccountModal({ userEmail, isOpen, onClose }: Props) {
  const t = useTranslations("accountDeletion");
  const errors = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAccount({
        confirmationText,
        userEmail,
      });

      if (!result.ok) {
        setError(
          result.code === "validation" ||
            result.code === "unauthorized" ||
            result.code === "forbidden"
            ? errors(result.code)
            : result.message,
        );
        return;
      }

      window.location.href = "/en";
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="panel w-full max-w-lg bg-[var(--surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2
              id="delete-modal-title"
              className="page-title text-xl text-[var(--danger)]"
            >
              {t("modalTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t("modalEyebrow")}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={pending}
            className="text-[var(--text-muted)] hover:text-[var(--ink)]"
            aria-label={t("closeButton")}
          >
            ✕
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--warning-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {t("warningTitle")}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ink)]">
              <li>{t("warningPoint1")}</li>
              <li>{t("warningPoint2")}</li>
              <li>{t("warningPoint3")}</li>
              <li>{t("warningPoint4")}</li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm text-[var(--ink)]">
              {t("challengeInstructions")}
            </p>
            <label className="grid gap-1">
              <span className="text-sm font-medium">{t("challengeLabel")}</span>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="field"
                placeholder="DELETE"
                disabled={pending}
                autoComplete="off"
              />
            </label>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--danger)]"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            type="button"
          >
            {t("cancelButton")}
          </Button>
          <button
            onClick={handleDelete}
            disabled={pending || confirmationText !== "DELETE"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
                />
                <span>{t("deletingButton")}</span>
              </>
            ) : (
              t("deleteButton")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
