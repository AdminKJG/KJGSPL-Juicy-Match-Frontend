import { request } from "./api";

/**
 * Juicy Match — Notification Module API Service
 * Implementation of NOTIFICATION_MODULE_FRONTEND_API.md specification (v1.0.0)
 */

export const notificationService = {
  /**
   * 4.1 Get Notification Inbox
   * Retrieves paginated notifications with current unreadCount.
   * @param {Object} options - { limit, category, unreadOnly }
   */
  getNotifications: async ({ limit = 50, category = null, unreadOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", String(limit));
    if (category && category !== "all") params.append("category", category);
    if (unreadOnly) params.append("unreadOnly", "true");

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await request(`/notifications${qs}`, { auth: true });

    // Normalize standard response { items: [], unreadCount: number }
    if (Array.isArray(res)) {
      const unreadCount = res.filter((n) => !n.read_at && !n.read).length;
      return { items: res, unreadCount };
    }
    const items = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.data?.items)
      ? res.data.items
      : Array.isArray(res?.data)
      ? res.data
      : [];
    const unreadCount =
      typeof res?.unreadCount === "number"
        ? res.unreadCount
        : typeof res?.data?.unreadCount === "number"
        ? res.data.unreadCount
        : items.filter((n) => !n.read_at && !n.read).length;

    return { items, unreadCount };
  },

  /**
   * 4.2 Get Unread Badge Counter
   * Lightweight endpoint to retrieve current unread notification count.
   */
  getUnreadCount: async () => {
    try {
      const res = await request("/notifications/unread-count", { auth: true });
      const count =
        typeof res?.unreadCount === "number"
          ? res.unreadCount
          : typeof res?.count === "number"
          ? res.count
          : typeof res?.data?.unreadCount === "number"
          ? res.data.unreadCount
          : 0;
      return { unreadCount: count };
    } catch (err) {
      console.warn("[notificationService] getUnreadCount fallback:", err.message);
      return { unreadCount: 0 };
    }
  },

  /**
   * 4.3 Mark Single Notification as Read
   * Automatically updates badge counter on the server.
   * @param {string} notificationId
   */
  markNotificationRead: async (notificationId) => {
    if (!notificationId) return { ok: false };
    return await request(`/notifications/${notificationId}/read`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  /**
   * 4.4 Mark All Notifications as Read
   * Batch marks all unread notifications as read and resets badge to 0.
   */
  markAllNotificationsRead: async () => {
    return await request("/notifications/read-all", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  /**
   * 4.5 Dismiss / Delete Notification
   * Permanently deletes notification from user inbox.
   * @param {string} notificationId
   */
  deleteNotification: async (notificationId) => {
    if (!notificationId) return { ok: false };
    return await request(`/notifications/${notificationId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  /**
   * 4.6 Send Test Email (Debug & QA)
   * Dispatches rendered email template to test address.
   * @param {Object} payload - { template, recipientEmail }
   */
  sendTestEmail: async ({ template = "welcome", recipientEmail }) => {
    return await request("/notifications/test-email", {
      method: "POST",
      body: { template, recipientEmail },
      auth: true,
    });
  },

  /**
   * 6.1 Get Notification Preferences
   */
  getPreferences: async () => {
    return await request("/preferences", { auth: true });
  },

  /**
   * 6.2 Update Notification Preferences
   * @param {Object} preferences - { frequency, channels, categories }
   */
  updatePreferences: async (preferences) => {
    return await request("/preferences", {
      method: "POST",
      body: preferences,
      auth: true,
    });
  },
};
