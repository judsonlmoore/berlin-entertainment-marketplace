"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { changeApprovalState } from "@/src/actions/approval";
import { Button } from "@/src/components/ui/button";
import { APPROVAL_STATES, type ApprovalState } from "@/src/domain/approval";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  marketplaceAccountId: string;
  currentState: ApprovalState;
};

export function ApprovalForm({
  locale,
  marketplaceAccountId,
  currentState,
}: Props) {
  const t = useTranslations("admin");
  const status = useTranslations("status");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await changeApprovalState({
            marketplaceAccountId,
            nextState: String(form.get("nextState")) as ApprovalState,
            reason: String(form.get("reason") ?? ""),
            locale,
          });

          if (!result.ok) {
            setError(
              errors.has(result.code)
                ? errors(result.code as "forbidden")
                : result.message,
            );
            return;
          }

          router.refresh();
        });
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        {t("currentState")}: {status(currentState)}
      </p>
      <label className="grid gap-1 text-sm">
        <span>{t("update")}</span>
        <select
          name="nextState"
          defaultValue={currentState === "applied" ? "approved" : "suspended"}
          className="field"
        >
          {APPROVAL_STATES.filter((state) => state !== currentState).map(
            (state) => (
              <option key={state} value={state}>
                {status(state)}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("reasonLabel")}</span>
        <input
          name="reason"
          required
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
        variant="primary"
      >
        {t("update")}
      </Button>
    </form>
  );
}
