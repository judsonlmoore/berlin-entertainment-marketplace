export const APPLICATION_STATES = [
  "draft",
  "submitted",
  "clarification_requested",
  "withdrawn",
  "rejected",
  "shortlisted",
] as const;

export type ApplicationState = (typeof APPLICATION_STATES)[number];

const APPLICANT_TRANSITIONS: Record<
  ApplicationState,
  readonly ApplicationState[]
> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["withdrawn"],
  clarification_requested: ["submitted", "withdrawn"],
  withdrawn: [],
  rejected: [],
  shortlisted: ["withdrawn"],
};

const VENUE_TRANSITIONS: Record<ApplicationState, readonly ApplicationState[]> =
  {
    draft: [],
    submitted: ["shortlisted", "rejected", "clarification_requested"],
    clarification_requested: [
      "shortlisted",
      "rejected",
      "clarification_requested",
    ],
    withdrawn: [],
    rejected: [],
    shortlisted: ["rejected"],
  };

export function canApplicantTransitionApplication(
  from: ApplicationState,
  to: ApplicationState,
): boolean {
  if (from === to) return false;
  return APPLICANT_TRANSITIONS[from].includes(to);
}

export function canVenueTransitionApplication(
  from: ApplicationState,
  to: ApplicationState,
): boolean {
  if (from === to) return false;
  return VENUE_TRANSITIONS[from].includes(to);
}

/** Clarification does not unlock contact — only shortlist does. */
export function unlocksContactOnApplicationTransition(
  to: ApplicationState,
): boolean {
  return to === "shortlisted";
}
