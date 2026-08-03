export const PROFILE_PUBLICATION_STATES = [
  "draft",
  "submitted",
  "approved",
  "changes_requested",
  "suspended",
] as const;

export type ProfilePublicationState =
  (typeof PROFILE_PUBLICATION_STATES)[number];

const OWNER_TRANSITIONS: Record<
  ProfilePublicationState,
  readonly ProfilePublicationState[]
> = {
  draft: ["submitted"],
  submitted: ["draft"],
  approved: ["draft"],
  changes_requested: ["draft", "submitted"],
  suspended: [],
};

const STAFF_TRANSITIONS: Record<
  ProfilePublicationState,
  readonly ProfilePublicationState[]
> = {
  draft: ["submitted", "approved", "changes_requested", "suspended"],
  submitted: ["approved", "changes_requested", "suspended", "draft"],
  approved: ["changes_requested", "suspended", "draft"],
  changes_requested: ["approved", "suspended", "draft"],
  suspended: ["approved", "changes_requested", "draft"],
};

export function canOwnerTransitionProfile(
  from: ProfilePublicationState,
  to: ProfilePublicationState,
): boolean {
  if (from === to) return false;
  return OWNER_TRANSITIONS[from].includes(to);
}

export function canStaffTransitionProfile(
  from: ProfilePublicationState,
  to: ProfilePublicationState,
): boolean {
  if (from === to) return false;
  return STAFF_TRANSITIONS[from].includes(to);
}

export function isProfileDiscoverable(state: ProfilePublicationState): boolean {
  return state === "approved";
}
