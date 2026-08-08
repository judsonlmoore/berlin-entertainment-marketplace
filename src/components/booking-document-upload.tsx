"use client";

import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";

type Props = {
  locale: "en" | "de";
  bookingId: string;
  entertainerProfileId?: string;
  venueId?: string;
};

export function BookingDocumentUpload({
  locale,
  bookingId,
  entertainerProfileId,
  venueId,
}: Props) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ownerOk =
    (Boolean(entertainerProfileId) && !venueId) ||
    (Boolean(venueId) && !entertainerProfileId);

  if (!ownerOk) return null;

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError(null);
          startTransition(async () => {
            const form = new FormData();
            form.set("file", file);
            form.set("bookingId", bookingId);
            form.set("locale", locale);
            form.set("visibility", "engagement");
            if (entertainerProfileId) {
              form.set("entertainerProfileId", entertainerProfileId);
            }
            if (venueId) {
              form.set("venueId", venueId);
            }
            const res = await fetch("/api/documents/upload", {
              method: "POST",
              body: form,
            });
            const data = (await res.json().catch(() => null)) as {
              ok?: boolean;
              error?: string;
              message?: string;
            } | null;
            if (!res.ok || !data?.ok) {
              setError(data?.message ?? data?.error ?? "upload_failed");
              return;
            }
            router.refresh();
          });
        }}
      />
      <Button
        type="button"
        variant="secondary"
        pending={pending}
        pendingLabel={ui("working")}
        onClick={() => inputRef.current?.click()}
      >
        {t("uploadBookingDoc")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
