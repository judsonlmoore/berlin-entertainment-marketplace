export const PROFILE_PUBLICATION_STATES = [
  "draft",
  "submitted",
  "approved",
  "changes_requested",
  "suspended",
] as const;

export type ProfilePublicationState =
  (typeof PROFILE_PUBLICATION_STATES)[number];

/**
 * Self-serve publication: owners publish to approved (discoverable) and
 * unpublish to draft. Legacy submitted/changes_requested can still publish
 * or unpublish. Suspended profiles stay staff-only.
 */
const OWNER_TRANSITIONS: Record<
  ProfilePublicationState,
  readonly ProfilePublicationState[]
> = {
  draft: ["approved"],
  submitted: ["approved", "draft"],
  approved: ["draft"],
  changes_requested: ["approved", "draft"],
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

export function canOwnerPublishProfile(
  state: ProfilePublicationState,
): boolean {
  return canOwnerTransitionProfile(state, "approved");
}

export function canOwnerUnpublishProfile(
  state: ProfilePublicationState,
): boolean {
  return canOwnerTransitionProfile(state, "draft");
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

export function isProfilePublished(state: ProfilePublicationState): boolean {
  return state === "approved";
}
