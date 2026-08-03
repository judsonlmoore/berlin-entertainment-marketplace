"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { quarantineRiderFile } from "@/src/actions/admin-ops";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function QuarantineRiderButton({
  locale,
  riderFileId,
  scanStatus,
}: {
  locale: "en" | "de";
  riderFileId: string;
  scanStatus: string;
}) {
  const t = useTranslations("admin");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (scanStatus === "quarantined") {
    return (
      <span className="text-xs text-[var(--text-muted)]">
        {t("quarantined")}
      </span>
    );
  }

  return (
    <form
      className="mt-1 grid gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await quarantineRiderFile({
            riderFileId,
            reason: String(form.get("reason") ?? ""),
            locale,
          });
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          setMessage(t("quarantineDone"));
          router.refresh();
        });
      }}
    >
      <input
        name="reason"
        required
        placeholder={t("quarantineReasonPlaceholder")}
        className="border border-[var(--line)] bg-transparent px-2 py-1 text-xs"
      />
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
      >
        {t("quarantineRider")}
      </Button>
      {message ? (
        <p aria-live="polite" className="text-xs text-[var(--text-muted)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
