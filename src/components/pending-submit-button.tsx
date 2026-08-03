"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";

type Props = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

/** Submit button that reflects pending state for Server Action forms. */
export function PendingSubmitButton({
  children,
  variant = "primary",
  className = "",
}: Props) {
  const { pending } = useFormStatus();
  const t = useTranslations("ui");

  return (
    <Button
      type="submit"
      variant={variant}
      pending={pending}
      pendingLabel={t("working")}
      className={className}
    >
      {children}
    </Button>
  );
}
