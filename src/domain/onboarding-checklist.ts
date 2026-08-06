export const ONBOARDING_CHECKLIST_STEPS = [
  "published",
  "searched",
  "openedResult",
  "enquiry",
] as const;

export type OnboardingChecklistStep = (typeof ONBOARDING_CHECKLIST_STEPS)[number];

export type OnboardingChecklistProgress = {
  published: boolean;
  searched: boolean;
  openedResult: boolean;
  enquiry: boolean;
};

export type OnboardingChecklistView = OnboardingChecklistProgress & {
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
};

export function buildOnboardingChecklistView(
  progress: OnboardingChecklistProgress,
): OnboardingChecklistView {
  const completedCount = ONBOARDING_CHECKLIST_STEPS.filter(
    (step) => progress[step],
  ).length;
  return {
    ...progress,
    completedCount,
    totalCount: ONBOARDING_CHECKLIST_STEPS.length,
    allComplete: completedCount === ONBOARDING_CHECKLIST_STEPS.length,
  };
}
