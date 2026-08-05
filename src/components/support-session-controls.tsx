"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { startSupportSession, stopSupportSession } from "@/src/actions/support";
import { Button } from "@/src/components/ui/button";

type StartProps = {
  locale: "en" | "de";
  entityType: "entertainer" | "venue";
  entityId: string;
  label: string;
};

export function StartSupportButton({
  locale,
  entityType,
  entityId,
  label,
}: StartProps) {
  const t = useTranslations("adminSupport");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant="secondary"
        pending={pending}
        pendingLabel={ui("working")}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startSupportSession({
              entityType,
              entityId,
              locale,
            });
            if (!result.ok) {
              setError(
                result.code === "forbidden" ||
                  result.code === "unauthorized" ||
                  result.code === "validation" ||
                  result.code === "not_found"
                  ? errors(result.code)
                  : result.message,
              );
              return;
            }
            router.push("/profile");
            router.refresh();
          });
        }}
      >
        {t("actAs", { label })}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StopSupportButton({ locale }: { locale: "en" | "de" }) {
  const t = useTranslations("adminSupport");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      pending={pending}
      pendingLabel={ui("working")}
      onClick={() => {
        startTransition(async () => {
          await stopSupportSession(locale);
          router.push("/admin/accounts");
          router.refresh();
        });
      }}
    >
      {t("exitSupport")}
    </Button>
  );
}
