import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  notificationTypeEnum,
  notificationChannelEnum,
  emailStatusEnum,
} from "./enums";

/**
 * In-product notifications for users.
 * Tracks all notification events and their read status.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    /** Subject type (e.g., "booking", "application", "venue") */
    subjectType: text("subject_type").notNull(),
    /** Subject ID (e.g., booking UUID, application UUID) */
    subjectId: text("subject_id").notNull(),
    /** Localized notification title (resolved at creation time) */
    title: text("title").notNull(),
    /** Localized notification body (resolved at creation time) */
    body: text("body").notNull(),
    /** Optional action URL (e.g., link to booking detail) */
    actionUrl: text("action_url"),
    /** Optional action label (e.g., "View booking") */
    actionLabel: text("action_label"),
    /** Additional context data as JSON */
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Whether the notification has been read */
    isRead: boolean("is_read").notNull().default(false),
    /** When the notification was read */
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    index("notifications_recipient_unread_idx").on(
      table.recipientUserId,
      table.isRead,
      table.createdAt,
    ),
    index("notifications_subject_idx").on(
      table.subjectType,
      table.subjectId,
      table.createdAt,
    ),
  ],
);

/**
 * User preferences for notification delivery channels.
 * Controls which notification types are delivered via which channels.
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationType: notificationTypeEnum("notification_type").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    /** Whether this notification type is enabled for this channel */
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_preferences_user_type_channel_uidx").on(
      table.userId,
      table.notificationType,
      table.channel,
    ),
    index("notification_preferences_user_idx").on(table.userId),
  ],
);

/**
 * Log of sent transactional emails.
 * Tracks email delivery status and metadata for auditing.
 */
export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientUserId: text("recipient_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Email address (stored separately from user for audit trail) */
    recipientEmail: text("recipient_email").notNull(),
    /** Email subject */
    subject: text("subject").notNull(),
    /** Notification type that triggered this email (if applicable) */
    notificationType: notificationTypeEnum("notification_type"),
    /** Related notification ID (if this email was sent for a notification) */
    notificationId: uuid("notification_id").references(() => notifications.id),
    /** Email delivery status */
    status: emailStatusEnum("status").notNull().default("pending"),
    /** Provider-specific message ID (for tracking) */
    providerMessageId: text("provider_message_id"),
    /** Error message if delivery failed */
    errorMessage: text("error_message"),
    /** When the email was sent */
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    /** Additional metadata (provider response, retry count, etc.) */
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_logs_recipient_user_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    index("email_logs_status_idx").on(table.status, table.createdAt),
    index("email_logs_notification_idx").on(table.notificationId),
  ],
);

/**
 * Marketing email consent tracking.
 * Stores user consent for marketing communications for future 3rd party integration.
 */
export const marketingConsent = pgTable(
  "marketing_consent",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    /** Whether user has consented to marketing emails */
    hasConsented: boolean("has_consented").notNull().default(false),
    /** When consent was given */
    consentedAt: timestamp("consented_at", {
      withTimezone: true,
      mode: "date",
    }),
    /** When consent was withdrawn */
    withdrawnAt: timestamp("withdrawn_at", {
      withTimezone: true,
      mode: "date",
    }),
    /** IP address when consent was recorded (for compliance) */
    consentIpAddress: text("consent_ip_address"),
    /** Source of consent (e.g., "onboarding", "settings", "checkbox") */
    consentSource: text("consent_source"),
    /** Additional metadata (e.g., version of terms, specific campaigns) */
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("marketing_consent_user_idx").on(table.userId),
    index("marketing_consent_status_idx").on(table.hasConsented),
  ],
);
