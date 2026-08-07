"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { removeBookingDocument } from "@/src/actions/booking-documents";
import { useRouter } from "@/src/i18n/navigation";

export function DeleteBookingDocumentButton({
  locale,
  bookingId,
  documentId,
}: {
  locale: "en" | "de";
  bookingId: string;
  documentId: string;
}) {
  const t = useTranslations("bookings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="text-sm text-[var(--danger)] underline disabled:opacity-60"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await removeBookingDocument({
            documentId,
            bookingId,
            locale,
          });
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      {t("deleteBookingDoc")}
    </button>
  );
}
