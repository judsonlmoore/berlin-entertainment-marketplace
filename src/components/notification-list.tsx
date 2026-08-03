"use client";

/**
 * Notification center component (client)
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { markAsReadAction, markAllAsReadAction } from "@/src/actions/notification-center";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface Props {
  notifications: Notification[];
}

export function NotificationList({ notifications: initialNotifications }: Props) {
  const t = useTranslations("notifications");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAsRead = (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );

    startTransition(async () => {
      const result = await markAsReadAction(notificationId);
      if (!result.ok) {
        // Revert on error
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: false } : n,
          ),
        );
      }
    });
  };

  const markAllAsRead = () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    startTransition(async () => {
      const result = await markAllAsReadAction();
      if (result.ok) {
        setMessage(t("markedRead"));
        setTimeout(() => setMessage(""), 3000);
      } else {
        // Revert on error
        setNotifications(initialNotifications);
        setMessage("Error marking all as read");
        setTimeout(() => setMessage(""), 3000);
      }
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
  };

  return (
    <div className="grid gap-4">
      {message && (
        <div
          className="rounded-[var(--radius-md)] bg-[var(--success-soft)] p-4 text-sm font-medium"
          role="alert"
        >
          {message}
        </div>
      )}

      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            {t("unreadCount", { count: unreadCount })}
          </p>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={isPending}
            className="text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
          >
            {t("markAllRead")}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">{t("centerEmpty")}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`panel overflow-hidden ${!notification.isRead ? "border-l-4 border-l-[var(--primary)]" : ""}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {formatRelativeTime(new Date(notification.createdAt))}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      disabled={isPending}
                      className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                {notification.actionUrl && notification.actionLabel && (
                  <div className="mt-3">
                    <Link
                      href={notification.actionUrl}
                      className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline"
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      {notification.actionLabel} →
                    </Link>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
