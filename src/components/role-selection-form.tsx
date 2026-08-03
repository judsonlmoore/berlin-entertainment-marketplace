"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { selectInitialRole } from "@/src/actions/onboarding";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
};

export function RoleSelectionForm({ locale }: Props) {
  const t = useTranslations("roleSelection");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    "entertainer" | "venue" | null
  >(null);

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

          router.push("/onboarding");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4">
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
            <div className="font-semibold">{t("entertainer")}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t("entertainerDesc")}
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
            <div className="font-semibold">{t("venue")}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t("venueDesc")}
            </div>
          </div>
        </label>
      </div>

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
