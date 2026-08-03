import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users } from "../src/db/schema";
import {
  auditEvents,
  marketplaceAccounts,
  userRoles,
} from "../src/db/schema/marketplace";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed production");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for seeding");
  }

  if (process.env.ALLOW_DB_SEED !== "true") {
    throw new Error("Set ALLOW_DB_SEED=true to run synthetic seed");
  }

  const db = getDb();

  const staffEmail = "staff@salon.example";
  const entertainerEmail = "act@salon.example";
  const venueEmail = "venue@salon.example";

  async function upsertUser(input: {
    email: string;
    name: string;
    isPlatformStaff?: boolean;
  }) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existing) {
      return existing;
    }
    const [created] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        emailVerified: new Date(),
        isPlatformStaff: Boolean(input.isPlatformStaff),
      })
      .returning();
    if (!created) {
      throw new Error(`Failed to create user ${input.email}`);
    }
    return created;
  }

  const staff = await upsertUser({
    email: staffEmail,
    name: "Salon Staff",
    isPlatformStaff: true,
  });
  const entertainer = await upsertUser({
    email: entertainerEmail,
    name: "Kiez Quartet",
  });
  const venueOperator = await upsertUser({
    email: venueEmail,
    name: "Neukölln Room",
  });

  async function ensureAccount(
    userId: string,
    state: "applied" | "approved",
    roles: Array<"entertainer" | "venue">,
  ) {
    const existing = await db.query.marketplaceAccounts.findFirst({
      where: eq(marketplaceAccounts.userId, userId),
    });
    if (!existing) {
      await db.insert(marketplaceAccounts).values({
        userId,
        approvalState: state,
        berlinConnection: "Synthetic Berlin pilot fixture",
        termsAcceptedAt: new Date(),
        reviewedByUserId: state === "approved" ? staff.id : null,
        reviewedAt: state === "approved" ? new Date() : null,
        reviewReason: state === "approved" ? "Seeded approved fixture" : null,
      });
    }

    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    await db.insert(userRoles).values(roles.map((role) => ({ userId, role })));
  }

  await ensureAccount(entertainer.id, "approved", ["entertainer"]);
  await ensureAccount(venueOperator.id, "approved", ["venue"]);

  await db.insert(auditEvents).values({
    actorUserId: staff.id,
    action: "seed.completed",
    subjectType: "system",
    subjectId: "synthetic-seed",
    metadata: {
      users: [staffEmail, entertainerEmail, venueEmail],
    },
  });

  console.log("Seeded synthetic Salon fixtures (idempotent users/roles).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
