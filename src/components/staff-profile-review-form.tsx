"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { staffReviewProfile } from "@/src/actions/profiles";
import { PROFILE_PUBLICATION_STATES } from "@/src/domain/profile-publication";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  subjectType: "entertainer" | "venue";
  subjectId: string;
  currentState: string;
};

export function StaffProfileReviewForm({
  locale,
  subjectType,
  subjectId,
  currentState,
}: Props) {
  const t = useTranslations("admin");
  const publication = useTranslations("publication");
  const errors = useTranslations("errors");
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
          const result = await staffReviewProfile({
            subjectType,
            subjectId,
            nextState: String(form.get("nextState")) as
              | "draft"
              | "submitted"
              | "approved"
              | "changes_requested"
              | "suspended",
            reason: String(form.get("reason") ?? ""),
            locale,
          });
          if (!result.ok) {
            setError(
              result.code === "invalid_transition"
                ? errors("invalid_transition")
                : result.message,
            );
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        {t("currentState")}: {publication(currentState as "draft")}
      </p>
      <label className="grid gap-1 text-sm">
        <span>{t("update")}</span>
        <select
          name="nextState"
          defaultValue={
            currentState === "submitted" ? "approved" : "changes_requested"
          }
          className="border border-[var(--line)] bg-transparent px-3 py-2"
        >
          {PROFILE_PUBLICATION_STATES.filter(
            (state) => state !== currentState,
          ).map((state) => (
            <option key={state} value={state}>
              {publication(state)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("reasonLabel")}</span>
        <input
          name="reason"
          required
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
        className="bg-[var(--accent)] px-3 py-2 text-sm text-[var(--background)] disabled:opacity-60"
      >
        {t("updateProfile")}
      </button>
    </form>
  );
}
