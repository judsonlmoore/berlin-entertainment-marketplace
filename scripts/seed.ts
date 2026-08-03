import { and, eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users } from "../src/db/schema";
import {
  auditEvents,
  contactMethods,
  entertainerProfiles,
  marketplaceAccounts,
  opportunities,
  userRoles,
  venueMemberships,
  venues,
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

  let entertainerProfile = await db.query.entertainerProfiles.findFirst({
    where: eq(entertainerProfiles.userId, entertainer.id),
  });
  if (!entertainerProfile) {
    const [created] = await db
      .insert(entertainerProfiles)
      .values({
        userId: entertainer.id,
        actName: "Kiez Quartet",
        category: "chamber",
        description: "Synthetic four-piece acoustic act for Berlin salons.",
        groupSize: 4,
        berlinBase: "Neukölln",
        travelRadiusKm: 20,
        priceMinCents: 40000,
        priceMaxCents: 90000,
        durationMinutes: 75,
        technicalRequirements: "Two DI boxes, four chairs, soft lighting.",
        publicationState: "approved",
      })
      .returning();
    entertainerProfile = created;
  }

  if (entertainerProfile) {
    const existingContact = await db.query.contactMethods.findFirst({
      where: and(
        eq(contactMethods.ownerType, "entertainer"),
        eq(contactMethods.ownerId, entertainerProfile.id),
      ),
    });
    if (!existingContact) {
      await db.insert(contactMethods).values({
        ownerType: "entertainer",
        ownerId: entertainerProfile.id,
        kind: "email",
        valueEncrypted: entertainerEmail,
        isPreferred: true,
      });
    }
  }

  let venue = await db.query.venues.findFirst({
    where: eq(venues.name, "Salon am Kanal"),
  });
  if (!venue) {
    const [created] = await db
      .insert(venues)
      .values({
        name: "Salon am Kanal",
        shortDescription: "Synthetic canal-side room for small formats.",
        addressLine1: "Maybachufer 12",
        district: "Neukölln",
        postalCode: "12047",
        latitude: "52.4912",
        longitude: "13.4395",
        venueType: "salon",
        audienceDescription: "Seated listening, 40–60 guests.",
        capacity: 55,
        capacityContext: "mostly seated",
        productionResources: {
          notes: "Small PA, two mics, warm house lights.",
        },
        publicationState: "approved",
      })
      .returning();
    venue = created;

    if (venue) {
      await db.insert(venueMemberships).values({
        venueId: venue.id,
        userId: venueOperator.id,
        role: "owner",
        status: "active",
      });
    }
  }

  if (venue) {
    const existingVenueContact = await db.query.contactMethods.findFirst({
      where: and(
        eq(contactMethods.ownerType, "venue"),
        eq(contactMethods.ownerId, venue.id),
      ),
    });
    if (!existingVenueContact) {
      await db.insert(contactMethods).values({
        ownerType: "venue",
        ownerId: venue.id,
        kind: "email",
        valueEncrypted: venueEmail,
        isPreferred: true,
      });
    }

    const existingOpportunity = await db.query.opportunities.findFirst({
      where: eq(opportunities.title, "Late salon set — Neukölln"),
    });
    if (!existingOpportunity) {
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + 21);
      startsAt.setHours(20, 0, 0, 0);
      const endsAt = new Date(startsAt);
      endsAt.setHours(22, 0, 0, 0);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      await db.insert(opportunities).values({
        venueId: venue.id,
        createdByUserId: venueOperator.id,
        title: "Late salon set — Neukölln",
        startsAt,
        endsAt,
        formatCategory: "chamber",
        expectedAudience: "40 seated listeners",
        budgetMinCents: 50000,
        budgetMaxCents: 90000,
        actSizeMin: 1,
        actSizeMax: 5,
        productionContext: "House PA available; soft lighting preferred.",
        applicationDeadline: deadline,
        notes: "Synthetic open opportunity for local testing.",
        state: "open",
      });
    }
  }

  await db.insert(auditEvents).values({
    actorUserId: staff.id,
    action: "seed.completed",
    subjectType: "system",
    subjectId: "synthetic-seed",
    metadata: {
      users: [staffEmail, entertainerEmail, venueEmail],
    },
  });

  console.log(
    "Seeded synthetic Salon fixtures (idempotent users/roles/profiles).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
