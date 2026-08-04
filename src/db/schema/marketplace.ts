import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";
import {
  accountStatusEnum,
  applicationStateEnum,
  bookingOriginEnum,
  bookingStateEnum,
  calendarEntryStateEnum,
  calendarOwnerTypeEnum,
  contactKindEnum,
  contactOwnerTypeEnum,
  depositStatusEnum,
  directRequestStateEnum,
  marketplaceRoleEnum,
  membershipStatusEnum,
  opportunityStateEnum,
  portfolioItemKindEnum,
  profilePublicationStateEnum,
  venueMembershipRoleEnum,
} from "./enums";

export const marketplaceAccounts = pgTable(
  "marketplace_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    accountStatus: accountStatusEnum("account_status")
      .notNull()
      .default("active"),
    berlinConnection: text("berlin_connection"),
    termsAcceptedAt: timestamp("terms_accepted_at", {
      withTimezone: true,
      mode: "date",
    }),
    reviewedByUserId: text("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    reviewReason: text("review_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("marketplace_accounts_status_idx").on(table.accountStatus)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: marketplaceRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("user_roles_user_uidx").on(table.userId)],
);

export const contactMethods = pgTable(
  "contact_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: contactOwnerTypeEnum("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    kind: contactKindEnum("kind").notNull(),
    /** Plaintext at app layer; rely on Neon encryption at rest. */
    value: text("value").notNull(),
    isPreferred: boolean("is_preferred").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("contact_methods_owner_idx").on(table.ownerType, table.ownerId),
    uniqueIndex("contact_methods_owner_kind_uidx").on(
      table.ownerType,
      table.ownerId,
      table.kind,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    correlationId: text("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_events_subject_idx").on(
      table.subjectType,
      table.subjectId,
      table.createdAt,
    ),
    index("audit_events_actor_idx").on(table.actorUserId, table.createdAt),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    district: text("district").notNull(),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull().default("Berlin"),
    countryCode: text("country_code").notNull().default("DE"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    venueType: text("venue_type").notNull(),
    audienceDescription: text("audience_description").notNull(),
    capacity: integer("capacity").notNull(),
    capacityContext: text("capacity_context"),
    productionResources: jsonb("production_resources")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    houseRules: text("house_rules"),
    loadInNotes: text("load_in_notes"),
    accessibilityNotes: text("accessibility_notes"),
    socialLinks: jsonb("social_links")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    websiteUrl: text("website_url"),
    publicationState: profilePublicationStateEnum("publication_state")
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("venues_publication_idx").on(table.publicationState),
    index("venues_district_idx").on(table.district),
  ],
);

export const venueMemberships = pgTable(
  "venue_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: venueMembershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("venue_memberships_venue_user_uidx").on(
      table.venueId,
      table.userId,
    ),
    index("venue_memberships_user_idx").on(table.userId),
  ],
);

export const venueSpaces = pgTable("venue_spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  stageDimensions: text("stage_dimensions"),
  accessibilityNotes: text("accessibility_notes"),
  productionResources: jsonb("production_resources")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const entertainerProfiles = pgTable(
  "entertainer_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    actName: text("act_name").notNull(),
    category: text("category").notNull(),
    genres: text("genres"),
    description: text("description").notNull(),
    groupSize: integer("group_size").notNull(),
    berlinBase: text("berlin_base").notNull(),
    baseLatitude: text("base_latitude"),
    baseLongitude: text("base_longitude"),
    travelRadiusKm: integer("travel_radius_km").notNull().default(25),
    priceMinCents: integer("price_min_cents").notNull(),
    priceMaxCents: integer("price_max_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    durationMinutes: integer("duration_minutes").notNull(),
    performanceFormats: text("performance_formats"),
    technicalRequirements: text("technical_requirements").notNull(),
    languages: text("languages"),
    accessibilityNotes: text("accessibility_notes"),
    equipmentSupplied: text("equipment_supplied"),
    websiteUrl: text("website_url"),
    socialLinks: jsonb("social_links")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    publicationState: profilePublicationStateEnum("publication_state")
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("entertainer_profiles_publication_idx").on(table.publicationState),
    check(
      "entertainer_price_range_chk",
      sql`${table.priceMinCents} >= 0 AND ${table.priceMaxCents} >= ${table.priceMinCents}`,
    ),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    venueSpaceId: uuid("venue_space_id").references(() => venueSpaces.id),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    formatCategory: text("format_category").notNull(),
    expectedAudience: text("expected_audience"),
    budgetMinCents: integer("budget_min_cents"),
    budgetMaxCents: integer("budget_max_cents"),
    currency: text("currency").notNull().default("EUR"),
    actSizeMin: integer("act_size_min"),
    actSizeMax: integer("act_size_max"),
    productionContext: text("production_context"),
    applicationDeadline: timestamp("application_deadline", {
      withTimezone: true,
      mode: "date",
    }),
    notes: text("notes"),
    state: opportunityStateEnum("state").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("opportunities_state_starts_idx").on(table.state, table.startsAt),
    check("opportunities_window_chk", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    entertainerProfileId: uuid("entertainer_profile_id")
      .notNull()
      .references(() => entertainerProfiles.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    quoteMinCents: integer("quote_min_cents").notNull(),
    quoteMaxCents: integer("quote_max_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    state: applicationStateEnum("state").notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("applications_opportunity_entertainer_uidx").on(
      table.opportunityId,
      table.entertainerProfileId,
    ),
  ],
);

export const applicationClarificationNotes = pgTable(
  "application_clarification_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
);

export const directRequests = pgTable("direct_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  entertainerProfileId: uuid("entertainer_profile_id")
    .notNull()
    .references(() => entertainerProfiles.id, { onDelete: "cascade" }),
  requestedByUserId: text("requested_by_user_id")
    .notNull()
    .references(() => users.id),
  startsAt: timestamp("starts_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
  timezone: text("timezone").notNull().default("Europe/Berlin"),
  proposedFeeCents: integer("proposed_fee_cents").notNull(),
  currency: text("currency").notNull().default("EUR"),
  formatCategory: text("format_category").notNull(),
  notes: text("notes"),
  responseDeadlineAt: timestamp("response_deadline_at", {
    withTimezone: true,
    mode: "date",
  }),
  state: directRequestStateEnum("state").notNull().default("requested"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    originType: bookingOriginEnum("origin_type").notNull(),
    originId: uuid("origin_id").notNull(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id),
    entertainerProfileId: uuid("entertainer_profile_id")
      .notNull()
      .references(() => entertainerProfiles.id),
    state: bookingStateEnum("state").notNull(),
    version: integer("version").notNull().default(1),
    depositStatus: depositStatusEnum("deposit_status")
      .notNull()
      .default("not_required"),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancelledReason: text("cancelled_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_parties_state_idx").on(
      table.venueId,
      table.entertainerProfileId,
      table.state,
    ),
    uniqueIndex("bookings_origin_uidx").on(table.originType, table.originId),
  ],
);

export const bookingTerms = pgTable(
  "booking_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    proposedByUserId: text("proposed_by_user_id")
      .notNull()
      .references(() => users.id),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
    acceptedAt: timestamp("accepted_at", {
      withTimezone: true,
      mode: "date",
    }),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    feeCents: integer("fee_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    performanceFormat: text("performance_format").notNull(),
    cancellationTerms: text("cancellation_terms").notNull(),
    productionObligations: text("production_obligations").notNull(),
    depositTerms: text("deposit_terms"),
    snapshot: jsonb("snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("booking_terms_booking_version_uidx").on(
      table.bookingId,
      table.version,
    ),
  ],
);

export const contactUnlocks = pgTable("contact_unlocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  applicationId: uuid("application_id").references(() => applications.id),
  directRequestId: uuid("direct_request_id").references(
    () => directRequests.id,
  ),
  unlockedForUserId: text("unlocked_for_user_id")
    .notNull()
    .references(() => users.id),
  contactMethodId: uuid("contact_method_id")
    .notNull()
    .references(() => contactMethods.id),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const calendarEntries = pgTable(
  "calendar_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: calendarOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    title: text("title"),
    privateNote: text("private_note"),
    displayTimezone: text("display_timezone")
      .notNull()
      .default("Europe/Berlin"),
    state: calendarEntryStateEnum("state").notNull(),
    holdExpiresAt: timestamp("hold_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    bookingId: uuid("booking_id").references(() => bookings.id),
    /** RRULE text for manual recurring parents only. */
    recurrenceRule: text("recurrence_rule"),
    /** When set, this row is a concrete exception/override of the parent series. */
    recurrenceParentId: uuid("recurrence_parent_id"),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("calendar_entries_owner_range_idx").on(
      table.ownerType,
      table.ownerId,
      table.startsAt,
      table.endsAt,
    ),
    index("calendar_entries_recurrence_parent_idx").on(
      table.recurrenceParentId,
    ),
    check(
      "calendar_entries_window_chk",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "calendar_entries_hold_expiry_chk",
      sql`(${table.state} <> 'tentative_hold') OR (${table.holdExpiresAt} IS NOT NULL)`,
    ),
  ],
);

/** Skipped or overridden occurrences of a recurring manual calendar entry. */
export const calendarRecurrenceExceptions = pgTable(
  "calendar_recurrence_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentEntryId: uuid("parent_entry_id")
      .notNull()
      .references(() => calendarEntries.id, { onDelete: "cascade" }),
    /** Original occurrence start that is skipped or replaced. */
    exceptionStartsAt: timestamp("exception_starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    /** `skip` removes the occurrence; `override` points at a replacement entry. */
    kind: text("kind").notNull().default("skip"),
    overrideEntryId: uuid("override_entry_id").references(
      () => calendarEntries.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("calendar_recurrence_exceptions_parent_start_uidx").on(
      table.parentEntryId,
      table.exceptionStartsAt,
    ),
  ],
);

/** OAuth / sync connection stub rows (Phase 10b). Default disconnected. */
export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: calendarOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("disconnected"),
    externalAccountLabel: text("external_account_label"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("calendar_connections_owner_provider_uidx").on(
      table.ownerType,
      table.ownerId,
      table.provider,
    ),
  ],
);

/** Server-side iCalendar feed subscriptions (Phase 6a import). */
export const externalCalendarSubscriptions = pgTable(
  "external_calendar_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: calendarOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    label: text("label").notNull(),
    /** AES-GCM ciphertext of the feed URL (base64). */
    feedUrlCiphertext: text("feed_url_ciphertext").notNull(),
    feedUrlNonce: text("feed_url_nonce").notNull(),
    status: text("status").notNull().default("active"),
    lastRefreshedAt: timestamp("last_refreshed_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastError: text("last_error"),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("external_calendar_subscriptions_owner_idx").on(
      table.ownerType,
      table.ownerId,
    ),
  ],
);

/** Cached busy overlays from an external ICS feed (no titles/attendees). */
export const cachedExternalEvents = pgTable(
  "cached_external_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => externalCalendarSubscriptions.id, {
        onDelete: "cascade",
      }),
    externalUid: text("external_uid").notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cached_external_events_sub_uid_uidx").on(
      table.subscriptionId,
      table.externalUid,
    ),
    index("cached_external_events_range_idx").on(
      table.subscriptionId,
      table.startsAt,
      table.endsAt,
    ),
  ],
);

/** Revocable secret tokens for ICS subscription export. */
export const calendarExportTokens = pgTable(
  "calendar_export_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: calendarOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    /** High-entropy secret used in the HTTPS feed URL path. */
    tokenHash: text("token_hash").notNull(),
    label: text("label"),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    lastAccessedAt: timestamp("last_accessed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("calendar_export_tokens_hash_uidx").on(table.tokenHash),
    index("calendar_export_tokens_owner_idx").on(
      table.ownerType,
      table.ownerId,
    ),
  ],
);

export const agreementTemplates = pgTable(
  "agreement_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locale: text("locale").notNull(),
    version: text("version").notNull(),
    legalReviewStatus: text("legal_review_status").notNull().default("draft"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("agreement_templates_locale_version_uidx").on(
      table.locale,
      table.version,
    ),
  ],
);

export const agreements = pgTable(
  "agreements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    bookingTermsId: uuid("booking_terms_id")
      .notNull()
      .references(() => bookingTerms.id),
    germanTemplateVersion: text("german_template_version").notNull(),
    englishTemplateVersion: text("english_template_version").notNull(),
    /** Immutable rendered bodies captured at generation time. */
    germanBody: text("german_body").notNull(),
    englishBody: text("english_body").notNull(),
    provider: text("provider"),
    providerEnvelopeId: text("provider_envelope_id"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("agreements_booking_uidx").on(table.bookingId),
    uniqueIndex("agreements_provider_envelope_uidx").on(
      table.providerEnvelopeId,
    ),
  ],
);

export const signatures = pgTable(
  "signatures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreements.id, { onDelete: "cascade" }),
    signerUserId: text("signer_user_id")
      .notNull()
      .references(() => users.id),
    partyRole: text("party_role").notNull(),
    providerReference: text("provider_reference"),
    status: text("status").notNull().default("pending"),
    signedAt: timestamp("signed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("signatures_agreement_signer_uidx").on(
      table.agreementId,
      table.signerUserId,
    ),
  ],
);

export const depositStatusEvents = pgTable("deposit_status_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  status: depositStatusEnum("status").notNull(),
  note: text("note"),
  recordedByUserId: text("recorded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const riderFiles = pgTable("rider_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  entertainerProfileId: uuid("entertainer_profile_id").references(
    () => entertainerProfiles.id,
  ),
  blobKey: text("blob_key").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksum: text("checksum").notNull(),
  scanStatus: text("scan_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entertainerProfileId: uuid("entertainer_profile_id")
      .notNull()
      .references(() => entertainerProfiles.id, { onDelete: "cascade" }),
    kind: portfolioItemKindEnum("kind").notNull(),
    caption: text("caption"),
    altText: text("alt_text"),
    url: text("url"),
    blobKey: text("blob_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("portfolio_items_profile_sort_idx").on(
      table.entertainerProfileId,
      table.sortOrder,
    ),
  ],
);
