import { and, eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users } from "../src/db/schema";
import {
  auditEvents,
  agreementTemplates,
  bookings,
  contactMethods,
  directRequests,
  entertainerProfiles,
  marketplaceAccounts,
  opportunities,
  userRoles,
  venueMemberships,
  venueSpaces,
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
    status: "active" | "suspended",
    roles: Array<"entertainer" | "venue">,
  ) {
    const existing = await db.query.marketplaceAccounts.findFirst({
      where: eq(marketplaceAccounts.userId, userId),
    });
    if (!existing) {
      await db.insert(marketplaceAccounts).values({
        userId,
        accountStatus: status,
        berlinConnection: "Synthetic Berlin pilot fixture",
        termsAcceptedAt: new Date(),
        reviewedByUserId: status === "suspended" ? staff.id : null,
        reviewedAt: status === "suspended" ? new Date() : null,
        reviewReason:
          status === "suspended" ? "Seeded suspended fixture" : null,
      });
    }

    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    await db
      .insert(userRoles)
      .values(roles.slice(0, 1).map((role) => ({ userId, role })));
  }

  await ensureAccount(entertainer.id, "active", ["entertainer"]);
  await ensureAccount(venueOperator.id, "active", ["venue"]);

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
        value: entertainerEmail,
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
      await db.insert(venueSpaces).values({
        venueId: venue.id,
        name: `${venue.name} — Main room`,
        capacity: venue.capacity,
        productionResources: {},
      });
    }
  }

  if (venue) {
    const existingSpace = await db.query.venueSpaces.findFirst({
      where: eq(venueSpaces.venueId, venue.id),
    });
    if (!existingSpace) {
      await db.insert(venueSpaces).values({
        venueId: venue.id,
        name: `${venue.name} — Main room`,
        capacity: venue.capacity,
        productionResources: {},
      });
    }

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
        value: venueEmail,
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

    if (entertainerProfile) {
      let request:
        | Awaited<ReturnType<typeof db.query.directRequests.findFirst>>
        | undefined = await db.query.directRequests.findFirst({
        where: and(
          eq(directRequests.venueId, venue.id),
          eq(directRequests.entertainerProfileId, entertainerProfile.id),
        ),
      });

      if (!request) {
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + 28);
        startsAt.setHours(19, 30, 0, 0);
        const endsAt = new Date(startsAt);
        endsAt.setHours(21, 0, 0, 0);

        const [createdRequest] = await db
          .insert(directRequests)
          .values({
            venueId: venue.id,
            entertainerProfileId: entertainerProfile.id,
            requestedByUserId: venueOperator.id,
            startsAt,
            endsAt,
            proposedFeeCents: 65000,
            formatCategory: "chamber",
            notes: "Synthetic accepted direct request for terms testing.",
            state: "accepted",
          })
          .returning();
        request = createdRequest;
      } else if (request.state !== "accepted") {
        const [updated] = await db
          .update(directRequests)
          .set({
            state: "accepted",
            notes: "Synthetic accepted direct request for terms testing.",
            updatedAt: new Date(),
          })
          .where(eq(directRequests.id, request.id))
          .returning();
        if (updated) {
          request = updated;
        }
      }

      if (request) {
        const existingBooking = await db.query.bookings.findFirst({
          where: and(
            eq(bookings.originType, "direct_request"),
            eq(bookings.originId, request.id),
          ),
        });
        if (!existingBooking) {
          await db.insert(bookings).values({
            originType: "direct_request",
            originId: request.id,
            venueId: venue.id,
            entertainerProfileId: entertainerProfile.id,
            state: "accepted",
          });
        } else if (
          existingBooking.state === "requested" ||
          existingBooking.state === "applied"
        ) {
          await db
            .update(bookings)
            .set({ state: "accepted", updatedAt: new Date() })
            .where(eq(bookings.id, existingBooking.id));
        }
      }
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

  async function ensureTemplate(
    locale: "de" | "en",
    version: string,
    body: string,
  ) {
    const existing = await db.query.agreementTemplates.findFirst({
      where: and(
        eq(agreementTemplates.locale, locale),
        eq(agreementTemplates.version, version),
      ),
    });
    if (existing) return;
    await db.insert(agreementTemplates).values({
      locale,
      version,
      legalReviewStatus: "sandbox",
      body,
    });
  }

  await ensureTemplate(
    "de",
    "de-sandbox-1",
    [
      "SANDBOX — kein rechtsverbindliches Dokument.",
      "Vereinbarung v{{termsVersion}} zwischen {{venueName}} und {{actName}}.",
      "Leistung: {{startsAt}}–{{endsAt}} ({{timezone}}).",
      "Honorar: {{fee}}. Format: {{performanceFormat}}.",
      "Storno: {{cancellationTerms}}.",
      "Produktion: {{productionObligations}}.",
      "Kaution: {{depositTerms}}.",
      "Deutscher Text ist maßgeblich.",
    ].join("\n"),
  );
  await ensureTemplate(
    "en",
    "en-sandbox-1",
    [
      "SANDBOX — not a legally binding document.",
      "Agreement v{{termsVersion}} between {{venueName}} and {{actName}}.",
      "Performance: {{startsAt}}–{{endsAt}} ({{timezone}}).",
      "Fee: {{fee}}. Format: {{performanceFormat}}.",
      "Cancellation: {{cancellationTerms}}.",
      "Production: {{productionObligations}}.",
      "Deposit: {{depositTerms}}.",
      "German text is controlling; English is a convenience translation.",
    ].join("\n"),
  );

  console.log(
    "Seeded synthetic Salon fixtures (idempotent users/roles/profiles).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
