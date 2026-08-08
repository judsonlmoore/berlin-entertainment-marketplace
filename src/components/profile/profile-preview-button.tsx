"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  href: string;
  /** Flush pending autosave before opening preview. */
  onBeforeNavigate?: () => Promise<unknown>;
  disabled?: boolean;
};

/** Secondary control next to Publish — opens marketplace profile preview. */
export function ProfilePreviewButton({
  href,
  onBeforeNavigate,
  disabled = false,
}: Props) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          if (onBeforeNavigate) {
            await onBeforeNavigate();
          }
          router.push(href);
        });
      }}
      className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)] disabled:opacity-60"
    >
      {pending ? t("previewOpening") : t("previewProfile")}
    </button>
  );
}
