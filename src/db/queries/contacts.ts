import { and, eq } from "drizzle-orm";
import { contactMethods } from "@/src/db/schema/marketplace";

type ContactOwnerType = "user" | "entertainer" | "venue";
type ContactKind = "email" | "phone" | "other";

/** Upsert one contact method per owner/kind and mark it preferred. */
export async function upsertPreferredContact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  input: {
    ownerType: ContactOwnerType;
    ownerId: string;
    kind: ContactKind;
    value: string;
  },
) {
  const existing = await tx.query.contactMethods.findFirst({
    where: and(
      eq(contactMethods.ownerType, input.ownerType),
      eq(contactMethods.ownerId, input.ownerId),
      eq(contactMethods.kind, input.kind),
    ),
  });

  if (existing) {
    const [updated] = await tx
      .update(contactMethods)
      .set({
        value: input.value,
        isPreferred: true,
        updatedAt: new Date(),
      })
      .where(eq(contactMethods.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await tx
    .insert(contactMethods)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      kind: input.kind,
      value: input.value,
      isPreferred: true,
    })
    .returning();
  return created;
}
