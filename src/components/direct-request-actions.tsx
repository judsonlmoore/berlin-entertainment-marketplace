"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  respondToDirectRequest,
  withdrawDirectRequest,
} from "@/src/actions/direct-requests";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

export function RespondDirectRequestButtons({
  locale,
  requestId,
  state,
}: {
  locale: "en" | "de";
  requestId: string;
  state: string;
}) {
  const t = useTranslations("directRequests");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "requested") return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
        onClick={() => {
          startTransition(async () => {
            await respondToDirectRequest({
              requestId,
              nextState: "accepted",
              locale,
            });
            router.refresh();
          });
        }}
      >
        {t("accept")}
      </Button>
      <Button
        type="button"
        pending={pending}
        pendingLabel={ui("working")}
        variant="secondary"
        onClick={() => {
          startTransition(async () => {
            await respondToDirectRequest({
              requestId,
              nextState: "declined",
              locale,
            });
            router.refresh();
          });
        }}
      >
        {t("decline")}
      </Button>
    </div>
  );
}

export function WithdrawDirectRequestButton({
  locale,
  requestId,
  state,
}: {
  locale: "en" | "de";
  requestId: string;
  state: string;
}) {
  const t = useTranslations("directRequests");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "requested") return null;

  return (
    <Button
      type="button"
      pending={pending}
      pendingLabel={ui("working")}
      variant="secondary"
      onClick={() => {
        startTransition(async () => {
          await withdrawDirectRequest(requestId, locale);
          router.refresh();
        });
      }}
    >
      {t("withdraw")}
    </Button>
  );
}
