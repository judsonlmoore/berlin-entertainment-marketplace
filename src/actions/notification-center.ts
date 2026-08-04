"use server";

/**
 * Server actions for reading and managing notifications
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/src/auth";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/src/db/queries/notifications";

export async function getUserNotificationsAction(params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const notifications = await getUserNotifications({
    userId: session.user.id,
    ...(params?.limit !== undefined && { limit: params.limit }),
    ...(params?.offset !== undefined && { offset: params.offset }),
    ...(params?.unreadOnly !== undefined && { unreadOnly: params.unreadOnly }),
  });

  return { ok: true as const, data: notifications };
}

export async function getUnreadCountAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const count = await getUnreadNotificationCount(session.user.id);

  return { ok: true as const, data: count };
}

export async function markAsReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  try {
    await markNotificationAsRead(notificationId);
    revalidatePath("/marketplace/notifications");
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { ok: false as const, error: "Failed to mark as read" };
  }
}

export async function markAllAsReadAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  try {
    await markAllNotificationsAsRead(session.user.id);
    revalidatePath("/marketplace/notifications");
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { ok: false as const, error: "Failed to mark all as read" };
  }
}
