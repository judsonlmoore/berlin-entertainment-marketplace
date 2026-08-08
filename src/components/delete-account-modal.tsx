"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteUserAccount } from "@/src/actions/account-deletion";
import { AppModal } from "@/src/components/ui/app-modal";
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

  const handleClose = useCallback(() => {
    if (pending) return;
    setConfirmationText("");
    setError(null);
    onClose();
  }, [onClose, pending]);

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
    <AppModal
      open={isOpen}
      onClose={handleClose}
      title={t("modalTitle")}
      subtitle={t("modalEyebrow")}
      closeLabel={t("closeButton")}
      dangerTitle
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={pending}
            type="button"
            className="w-full sm:w-auto"
          >
            {t("cancelButton")}
          </Button>
          <button
            onClick={handleDelete}
            disabled={pending || confirmationText !== "DELETE"}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
      }
    >
      <div className="space-y-4">
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
    </AppModal>
  );
}
