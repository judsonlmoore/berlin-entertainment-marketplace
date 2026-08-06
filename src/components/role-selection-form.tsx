"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { selectInitialRole } from "@/src/actions/onboarding";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
};

type SelectableRole = "entertainer" | "venue";

export function RoleSelectionForm({ locale }: Props) {
  const t = useTranslations("roleSelection");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<SelectableRole | null>(null);

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (!selectedRole) {
          setError(t("required"));
          return;
        }

        startTransition(async () => {
          const result = await selectInitialRole({
            role: selectedRole,
            locale,
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

          router.push("/onboarding/setup");
          router.refresh();
        });
      }}
    >
      <fieldset className="grid gap-4" disabled={pending}>
        <legend className="sr-only">{t("title")}</legend>

        <label
          className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${
            selectedRole === "entertainer"
              ? "border-[var(--color-primary)] bg-[var(--surface)]"
              : "border-[var(--rule)] hover:border-[var(--text-muted)]"
          }`}
        >
          <input
            type="radio"
            name="role"
            value="entertainer"
            checked={selectedRole === "entertainer"}
            onChange={() => setSelectedRole("entertainer")}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-semibold">{t("talent")}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t("talentDesc")}
            </div>
          </div>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${
            selectedRole === "venue"
              ? "border-[var(--color-primary)] bg-[var(--surface)]"
              : "border-[var(--rule)] hover:border-[var(--text-muted)]"
          }`}
        >
          <input
            type="radio"
            name="role"
            value="venue"
            checked={selectedRole === "venue"}
            onChange={() => setSelectedRole("venue")}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-semibold">{t("buyer")}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t("buyerDesc")}
            </div>
          </div>
        </label>

        {/* Demand probe: agency is visible but not selectable until roster orgs ship. */}
        <div
          className="flex cursor-not-allowed items-start gap-4 rounded-lg border-2 border-dashed border-[var(--rule)] bg-[var(--background)] p-4 opacity-70"
          aria-disabled="true"
        >
          <input
            type="radio"
            name="role"
            value="agency"
            disabled
            tabIndex={-1}
            className="mt-1"
            aria-describedby="agency-coming-soon"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--text-muted)]">
                {t("agency")}
              </span>
              <span
                id="agency-coming-soon"
                className="rounded-sm bg-[var(--rule)] px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-[var(--text-muted)] uppercase"
              >
                {t("comingSoon")}
              </span>
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t("agencyDesc")}
            </div>
            <p className="mt-2 text-sm text-[var(--ink)]">{t("agencyHint")}</p>
          </div>
        </div>
      </fieldset>

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
        disabled={!selectedRole}
      >
        {t("continue")}
      </Button>
    </form>
  );
}
