export type MembershipSnapshot = {
  id: string;
  userId: string;
  role: "owner" | "member";
  status: "active" | "invited" | "removed";
};

export function countActiveOwners(
  memberships: readonly MembershipSnapshot[],
): number {
  return memberships.filter(
    (membership) =>
      membership.status === "active" && membership.role === "owner",
  ).length;
}

export function canRemoveMembership(
  memberships: readonly MembershipSnapshot[],
  membershipId: string,
): { ok: true } | { ok: false; reason: "not_found" | "last_owner" } {
  const target = memberships.find(
    (membership) => membership.id === membershipId,
  );
  if (!target || target.status === "removed") {
    return { ok: false, reason: "not_found" };
  }

  if (
    target.role === "owner" &&
    target.status === "active" &&
    countActiveOwners(memberships) <= 1
  ) {
    return { ok: false, reason: "last_owner" };
  }

  return { ok: true };
}
