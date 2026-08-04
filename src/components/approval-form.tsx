"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { changeAccountStatus } from "@/src/actions/approval";
import { ACCOUNT_STATUSES, type AccountStatus } from "@/src/domain/approval";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  marketplaceAccountId: string;
  currentStatus: AccountStatus;
};

export function ApprovalForm({
  locale,
  marketplaceAccountId,
  currentStatus,
}: Props) {
  const t = useTranslations("admin");
  const status = useTranslations("accountStatus");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextDefault =
    currentStatus === "active" ? "suspended" : ("active" as const);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await changeAccountStatus({
            marketplaceAccountId,
            nextStatus: String(form.get("nextStatus")) as AccountStatus,
            reason: String(form.get("reason") ?? ""),
            locale,
          });
          if (!result.ok) {
            setError(
              result.code === "validation" ||
                result.code === "unauthorized" ||
                result.code === "forbidden" ||
                result.code === "invalid_transition"
                ? errors(result.code)
                : result.message,
            );
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="label">
        <span>{t("nextState")}</span>
        <select
          name="nextStatus"
          className="field"
          defaultValue={nextDefault}
          required
        >
          {ACCOUNT_STATUSES.filter((state) => state !== currentStatus).map(
            (state) => (
              <option key={state} value={state}>
                {status(state)}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="label">
        <span>{t("reason")}</span>
        <textarea name="reason" className="field" rows={3} required />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50"
      >
        {pending ? "…" : t("saveState")}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}
