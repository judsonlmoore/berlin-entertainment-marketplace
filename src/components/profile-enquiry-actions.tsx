"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { respondToProfileEnquiryAction } from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";

/** Legacy pending enquiries without an open offer: Decline only. */
export function ProfileEnquiryRespondButtons({
  locale,
  enquiryId,
  state,
}: {
  locale: "en" | "de";
  enquiryId: string;
  state: string;
}) {
  const t = useTranslations("leads");
  const bookingsT = useTranslations("bookings");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (state !== "pending") return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        pending={pending}
        pendingLabel={t("working")}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await respondToProfileEnquiryAction({
              enquiryId,
              decision: "passed",
              locale,
            });
            if (!result.ok) {
              setError(
                result.code === "forbidden" ||
                  result.code === "invalid_transition"
                  ? errors(result.code)
                  : result.message,
              );
              return;
            }
            router.refresh();
          });
        }}
      >
        {bookingsT("declineOffer")}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
