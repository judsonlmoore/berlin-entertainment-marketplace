"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteAvailability } from "@/src/actions/calendar";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function DeleteCalendarEntryButton({
  locale,
  entryId,
}: {
  locale: "en" | "de";
  entryId: string;
}) {
  const t = useTranslations("calendar");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      pending={pending}
      pendingLabel={ui("working")}
      className="min-h-9 px-3 py-1.5 text-xs"
      onClick={() => {
        startTransition(async () => {
          await deleteAvailability(entryId, locale);
          router.refresh();
        });
      }}
    >
      {t("remove")}
    </Button>
  );
}
