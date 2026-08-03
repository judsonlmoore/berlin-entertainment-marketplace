"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  respondToDirectRequest,
  withdrawDirectRequest,
} from "@/src/actions/direct-requests";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "requested") return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        className="bg-[var(--accent)] px-3 py-2 text-sm text-[var(--background)]"
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
      </button>
      <button
        type="button"
        disabled={pending}
        className="border border-[var(--line)] px-3 py-2 text-sm"
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
      </button>
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state !== "requested") return null;

  return (
    <button
      type="button"
      disabled={pending}
      className="border border-[var(--line)] px-3 py-2 text-sm"
      onClick={() => {
        startTransition(async () => {
          await withdrawDirectRequest(requestId, locale);
          router.refresh();
        });
      }}
    >
      {t("withdraw")}
    </button>
  );
}
