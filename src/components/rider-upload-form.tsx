"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { registerRiderUpload } from "@/src/actions/riders";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function RiderUploadForm({
  locale,
  entertainerProfileId,
  storeConfigured,
}: {
  locale: "en" | "de";
  entertainerProfileId: string;
  storeConfigured: boolean;
}) {
  const t = useTranslations("profile");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!storeConfigured) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {t("riderUnconfigured")}
      </p>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNote(null);
        const form = new FormData(event.currentTarget);
        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          setError(t("riderFileRequired"));
          return;
        }
        startTransition(async () => {
          const checksum = await sha256Hex(file);
          const result = await registerRiderUpload({
            entertainerProfileId,
            mimeType: file.type || "application/pdf",
            sizeBytes: file.size,
            checksum,
            originalFilename: file.name,
            locale,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setNote(t("riderRegistered"));
          router.refresh();
        });
      }}
    >
      <label className="label">
        <span>{t("riderFileLabel")}</span>
        <input
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          className="field"
          required
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {note ? <p className="text-sm text-[var(--text-muted)]">{note}</p> : null}
      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
      >
        {t("riderRegister")}
      </Button>
    </form>
  );
}
