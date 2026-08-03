import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { auditEvents } from "../src/db/schema/marketplace";
import { users } from "../src/db/schema";

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SET_STAFF !== "true"
  ) {
    throw new Error(
      "Refusing to grant staff in production without ALLOW_SET_STAFF=true",
    );
  }

  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: tsx scripts/set-staff.ts email@example.com");
  }

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ isPlatformStaff: true, updatedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()))
    .returning({
      id: users.id,
      email: users.email,
      staff: users.isPlatformStaff,
    });

  if (!updated) {
    console.log("no user found");
    return;
  }

  await db.insert(auditEvents).values({
    actorUserId: null,
    action: "staff.granted",
    subjectType: "user",
    subjectId: updated.id,
    metadata: {
      email: updated.email,
      via: "scripts/set-staff.ts",
    },
  });

  console.log(updated);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
