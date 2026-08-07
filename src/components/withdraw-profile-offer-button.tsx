"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { withdrawProfileOfferAction } from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";

export function WithdrawProfileOfferButton({
  locale,
  enquiryId,
}: {
  locale: "en" | "de";
  enquiryId: string;
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      pending={pending}
      pendingLabel={ui("working")}
      variant="secondary"
      onClick={() => {
        startTransition(async () => {
          await withdrawProfileOfferAction({ enquiryId, locale });
          router.refresh();
        });
      }}
    >
      {t("withdrawOfferCta")}
    </Button>
  );
}
