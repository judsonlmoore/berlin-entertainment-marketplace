export const APPLICATION_STATES = [
  "submitted",
  "withdrawn",
  "rejected",
  "shortlisted",
] as const;

export type ApplicationState = (typeof APPLICATION_STATES)[number];

const APPLICANT_TRANSITIONS: Record<
  ApplicationState,
  readonly ApplicationState[]
> = {
  submitted: ["withdrawn"],
  withdrawn: [],
  rejected: [],
  shortlisted: ["withdrawn"],
};

const VENUE_TRANSITIONS: Record<ApplicationState, readonly ApplicationState[]> =
  {
    submitted: ["shortlisted", "rejected"],
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
