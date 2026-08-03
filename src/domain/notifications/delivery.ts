/**
 * Notification delivery service
 * Handles sending notifications via in-app and email channels
 */

import { getEmailProvider } from "@/src/integrations/email";
import type { notificationTypeEnum } from "@/src/db/schema";
import {
  createNotification,
  isNotificationEnabled,
  logEmail,
  updateEmailLogStatus,
} from "@/src/db/queries/notifications";

export interface NotificationPayload {
  recipientUserId: string;
  recipientEmail: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  subjectType: string;
  subjectId: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  emailSubject?: string;
  emailText?: string;
  emailHtml?: string;
}

export interface NotificationDeliveryResult {
  inApp: {
    success: boolean;
    notificationId?: string;
    error?: string;
  };
  email: {
    success: boolean;
    emailLogId?: string;
    error?: string;
  };
}

/**
 * Send a notification via enabled channels (in-app and/or email)
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<NotificationDeliveryResult> {
  const result: NotificationDeliveryResult = {
    inApp: { success: false },
    email: { success: false },
  };

  // Check if in-app notifications are enabled
  const inAppEnabled = await isNotificationEnabled({
    userId: payload.recipientUserId,
    notificationType: payload.type,
    channel: "in_app",
  });

  // Send in-app notification
  if (inAppEnabled) {
    try {
      const notification = await createNotification({
        recipientUserId: payload.recipientUserId,
        type: payload.type,
        subjectType: payload.subjectType,
        subjectId: payload.subjectId,
        title: payload.title,
        body: payload.body,
        ...(payload.actionUrl && { actionUrl: payload.actionUrl }),
        ...(payload.actionLabel && { actionLabel: payload.actionLabel }),
        ...(payload.metadata && { metadata: payload.metadata }),
      });

      if (notification) {
        result.inApp.success = true;
        result.inApp.notificationId = notification.id;
      }
    } catch (error) {
      result.inApp.error =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to create in-app notification:", error);
    }
  }

  // Check if email notifications are enabled
  const emailEnabled = await isNotificationEnabled({
    userId: payload.recipientUserId,
    notificationType: payload.type,
    channel: "email",
  });

  // Send email notification
  if (emailEnabled && (payload.emailText || payload.emailHtml)) {
    try {
      const emailProvider = getEmailProvider();

      // Log the email attempt
      const emailLog = await logEmail({
        recipientUserId: payload.recipientUserId,
        recipientEmail: payload.recipientEmail,
        subject: payload.emailSubject || payload.title,
        notificationType: payload.type,
        ...(result.inApp.notificationId && {
          notificationId: result.inApp.notificationId,
        }),
        status: "pending",
      });

      // Send the email
      const emailResult = await emailProvider.send({
        to: payload.recipientEmail,
        subject: payload.emailSubject || payload.title,
        text: payload.emailText || payload.body,
        ...(payload.emailHtml && { html: payload.emailHtml }),
      });

      if (emailLog) {
        // Update email log with result
        await updateEmailLogStatus({
          id: emailLog.id,
          status: emailResult.success ? "sent" : "failed",
          ...(emailResult.error && { errorMessage: emailResult.error }),
          ...(emailResult.success && { sentAt: new Date() }),
        });

        result.email.success = emailResult.success;
        result.email.emailLogId = emailLog.id;
        if (emailResult.error) {
          result.email.error = emailResult.error;
        }
      }
    } catch (error) {
      result.email.error =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to send email notification:", error);
    }
  }

  return result;
}

/**
 * Send a notification to multiple recipients
 */
export async function sendBulkNotifications(
  payloads: NotificationPayload[],
): Promise<NotificationDeliveryResult[]> {
  return await Promise.all(payloads.map((payload) => sendNotification(payload)));
}
