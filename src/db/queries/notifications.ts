/**
 * Notification queries for database operations
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import {
  notifications,
  notificationPreferences,
  emailLogs,
  marketingConsent,
} from "../schema";
import type { notificationTypeEnum, notificationChannelEnum } from "../schema";

/**
 * Create a new in-app notification
 */
export async function createNotification(params: {
  recipientUserId: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  subjectType: string;
  subjectId: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      recipientUserId: params.recipientUserId,
      type: params.type,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      title: params.title,
      body: params.body,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      metadata: params.metadata || {},
      isRead: false,
    })
    .returning();

  return notification;
}

/**
 * Get notifications for a user with pagination
 */
export async function getUserNotifications(params: {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) {
  const { userId, limit = 20, offset = 0, unreadOnly = false } = params;

  const conditions = [eq(notifications.recipientUserId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  return await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
      ),
    );

  return result?.count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const [notification] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(notifications.id, notificationId))
    .returning();

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
      ),
    );
}

/**
 * Get notification preference for a user
 */
export async function getNotificationPreference(params: {
  userId: string;
  notificationType: (typeof notificationTypeEnum.enumValues)[number];
  channel: (typeof notificationChannelEnum.enumValues)[number];
}) {
  const [preference] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, params.userId),
        eq(notificationPreferences.notificationType, params.notificationType),
        eq(notificationPreferences.channel, params.channel),
      ),
    );

  return preference;
}

/**
 * Get all notification preferences for a user
 */
export async function getUserNotificationPreferences(userId: string) {
  return await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
}

/**
 * Set notification preference for a user
 */
export async function setNotificationPreference(params: {
  userId: string;
  notificationType: (typeof notificationTypeEnum.enumValues)[number];
  channel: (typeof notificationChannelEnum.enumValues)[number];
  isEnabled: boolean;
}) {
  const existing = await getNotificationPreference(params);

  if (existing) {
    const [updated] = await db
      .update(notificationPreferences)
      .set({
        isEnabled: params.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(notificationPreferences)
    .values({
      userId: params.userId,
      notificationType: params.notificationType,
      channel: params.channel,
      isEnabled: params.isEnabled,
    })
    .returning();

  return created;
}

/**
 * Check if a notification type is enabled for a user and channel
 * Defaults to enabled if no preference is set
 */
export async function isNotificationEnabled(params: {
  userId: string;
  notificationType: (typeof notificationTypeEnum.enumValues)[number];
  channel: (typeof notificationChannelEnum.enumValues)[number];
}): Promise<boolean> {
  const preference = await getNotificationPreference(params);
  return preference?.isEnabled ?? true; // Default to enabled
}

/**
 * Log an email send attempt
 */
export async function logEmail(params: {
  recipientUserId?: string;
  recipientEmail: string;
  subject: string;
  notificationType?: (typeof notificationTypeEnum.enumValues)[number];
  notificationId?: string;
  status: "pending" | "sent" | "failed" | "bounced";
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  const [emailLog] = await db
    .insert(emailLogs)
    .values({
      recipientUserId: params.recipientUserId,
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      notificationType: params.notificationType,
      notificationId: params.notificationId,
      status: params.status,
      providerMessageId: params.providerMessageId,
      errorMessage: params.errorMessage,
      sentAt: params.sentAt,
      metadata: params.metadata || {},
    })
    .returning();

  return emailLog;
}

/**
 * Update email log status
 */
export async function updateEmailLogStatus(params: {
  id: string;
  status: "pending" | "sent" | "failed" | "bounced";
  errorMessage?: string;
  sentAt?: Date;
}) {
  const [updated] = await db
    .update(emailLogs)
    .set({
      status: params.status,
      errorMessage: params.errorMessage,
      sentAt: params.sentAt,
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, params.id))
    .returning();

  return updated;
}

/**
 * Get marketing consent for a user
 */
export async function getMarketingConsent(userId: string) {
  const [consent] = await db
    .select()
    .from(marketingConsent)
    .where(eq(marketingConsent.userId, userId));

  return consent;
}

/**
 * Set marketing consent for a user
 */
export async function setMarketingConsent(params: {
  userId: string;
  hasConsented: boolean;
  consentIpAddress?: string;
  consentSource?: string;
  metadata?: Record<string, unknown>;
}) {
  const existing = await getMarketingConsent(params.userId);
  const now = new Date();

  if (existing) {
    const [updated] = await db
      .update(marketingConsent)
      .set({
        hasConsented: params.hasConsented,
        consentedAt: params.hasConsented ? now : existing.consentedAt,
        withdrawnAt: !params.hasConsented ? now : null,
        consentIpAddress: params.consentIpAddress || existing.consentIpAddress,
        consentSource: params.consentSource || existing.consentSource,
        metadata: params.metadata || existing.metadata,
        updatedAt: now,
      })
      .where(eq(marketingConsent.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(marketingConsent)
    .values({
      userId: params.userId,
      hasConsented: params.hasConsented,
      consentedAt: params.hasConsented ? now : null,
      withdrawnAt: null,
      consentIpAddress: params.consentIpAddress,
      consentSource: params.consentSource,
      metadata: params.metadata || {},
    })
    .returning();

  return created;
}
