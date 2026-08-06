"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/src/i18n/navigation";
import { markOnboardingChecklistStepAction } from "@/src/actions/onboarding-checklist";
import type { OnboardingChecklistStepKey } from "@/src/db/queries/onboarding-checklist";

/** Records a visit-based checklist step once per mount and refreshes the rail. */
export function OnboardingChecklistTracker({
  step,
}: {
  step: OnboardingChecklistStepKey;
}) {
  const router = useRouter();
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    void markOnboardingChecklistStepAction({ step }).then((result) => {
      if (result.ok) router.refresh();
    });
  }, [router, step]);

  return null;
}
