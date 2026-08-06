"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { respondToProfileEnquiryAction } from "@/src/actions/profile-enquiries";
import { Button } from "@/src/components/ui/button";

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
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (state !== "pending") return null;

  function respond(decision: "interested" | "passed") {
    setError(null);
    startTransition(async () => {
      const result = await respondToProfileEnquiryAction({
        enquiryId,
        decision,
        locale,
      });
      if (!result.ok) {
        setError(
          result.code === "forbidden" || result.code === "invalid_transition"
            ? errors(result.code)
            : result.message,
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => respond("interested")}
      >
        {pending ? t("working") : t("interested")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => respond("passed")}
      >
        {t("pass")}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
