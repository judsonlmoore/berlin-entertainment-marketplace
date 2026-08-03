"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runHoldExpiry } from "@/src/actions/admin-ops";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function ExpireHoldsButton({ locale }: { locale: "en" | "de" }) {
  const t = useTranslations("admin");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await runHoldExpiry({ locale });
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            setMessage(
              t("expireResult", {
                count: (result.expiredHolds ?? 0) + (result.expiredRequests ?? 0),
              }),
            );
            router.refresh();
          });
        }}
      >
        {t("expireHolds")}
      </Button>
      {message ? (
        <p className="text-sm text-[var(--text-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
