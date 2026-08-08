import { and, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { users } from "@/src/db/schema";
import {
  entertainerProfiles,
  marketplaceAccounts,
  userRoles,
  venues,
} from "@/src/db/schema/marketplace";

export type AdminAccountSearchHit = {
  userId: string;
  name: string | null;
  email: string | null;
  accountStatus: string | null;
  role: "entertainer" | "venue" | null;
  isPlatformStaff: boolean;
  entertainer: {
    id: string;
    actName: string;
    publicationState: string;
  } | null;
  venues: {
    id: string;
    name: string;
    publicationState: string;
    membershipRole: string;
  }[];
};

/**
 * Staff search across member accounts, act names, and venue names.
 * Batched hydration (no per-user query fan-out) — eng-review P1A.
 * Anonymized account shells are never returned.
 */
export async function searchAdminAccounts(
  query: string,
  limit = 40,
): Promise<AdminAccountSearchHit[]> {
  const db = getDb();
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const notAnonymized = isNull(users.anonymizedAt);

  const matchingUserIds = new Set<string>();

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        notAnonymized,
        or(
          ilike(users.email, pattern),
          ilike(users.name, pattern),
          sql`${users.id}::text ilike ${pattern}`,
        ),
      ),
    )
    .limit(limit);

  for (const row of userRows) matchingUserIds.add(row.id);

  const actRows = await db
    .select({ userId: entertainerProfiles.userId })
    .from(entertainerProfiles)
    .innerJoin(users, eq(users.id, entertainerProfiles.userId))
    .where(and(notAnonymized, ilike(entertainerProfiles.actName, pattern)))
    .limit(limit);

  for (const row of actRows) matchingUserIds.add(row.userId);

  const venueOwnerRows = await db
    .select({ userId: venues.ownerUserId })
    .from(venues)
    .innerJoin(users, eq(users.id, venues.ownerUserId))
    .where(and(notAnonymized, ilike(venues.name, pattern)))
    .limit(limit);

  for (const row of venueOwnerRows) matchingUserIds.add(row.userId);

  if (matchingUserIds.size === 0) return [];

  const ids = [...matchingUserIds].slice(0, limit);

  const [userList, accounts, roles, entertainers, ownedVenueRows] =
    await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          isPlatformStaff: users.isPlatformStaff,
        })
        .from(users)
        .where(inArray(users.id, ids)),
      db
        .select({
          userId: marketplaceAccounts.userId,
          accountStatus: marketplaceAccounts.accountStatus,
        })
        .from(marketplaceAccounts)
        .where(inArray(marketplaceAccounts.userId, ids)),
      db
        .select({
          userId: userRoles.userId,
          role: userRoles.role,
        })
        .from(userRoles)
        .where(inArray(userRoles.userId, ids)),
      db
        .select({
          userId: entertainerProfiles.userId,
          id: entertainerProfiles.id,
          actName: entertainerProfiles.actName,
          publicationState: entertainerProfiles.publicationState,
        })
        .from(entertainerProfiles)
        .where(inArray(entertainerProfiles.userId, ids)),
      db
        .select({
          userId: venues.ownerUserId,
          id: venues.id,
          name: venues.name,
          publicationState: venues.publicationState,
        })
        .from(venues)
        .where(inArray(venues.ownerUserId, ids)),
    ]);

  const accountByUser = new Map(
    accounts.map((row) => [row.userId, row.accountStatus]),
  );
  const roleByUser = new Map(roles.map((row) => [row.userId, row.role]));
  const entertainerByUser = new Map(
    entertainers.map((row) => [row.userId, row]),
  );
  const venuesByUser = new Map<string, AdminAccountSearchHit["venues"]>();
  for (const row of ownedVenueRows) {
    const list = venuesByUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      publicationState: row.publicationState,
      membershipRole: "owner",
    });
    venuesByUser.set(row.userId, list);
  }

  const userById = new Map(userList.map((row) => [row.id, row]));

  const hits: AdminAccountSearchHit[] = [];
  for (const userId of ids) {
    const user = userById.get(userId);
    if (!user) continue;
    const entertainer = entertainerByUser.get(userId);
    hits.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      accountStatus: accountByUser.get(userId) ?? null,
      role:
        (roleByUser.get(userId) as "entertainer" | "venue" | undefined) ?? null,
      isPlatformStaff: user.isPlatformStaff,
      entertainer: entertainer
        ? {
            id: entertainer.id,
            actName: entertainer.actName,
            publicationState: entertainer.publicationState,
          }
        : null,
      venues: venuesByUser.get(userId) ?? [],
    });
  }

  return hits;
}
