import { request } from "./api";
import { notificationService } from "./notificationService";

export const preferenceService = {
  // 14.1 Member Preferences & Delivery
  getPreferences: async () => {
    return await notificationService.getPreferences();
  },

  updatePreferences: async (preferences) => {
    return await notificationService.updatePreferences(preferences);
  },

  // 14.2 In-App Notifications
  getNotifications: async (options) => {
    return await notificationService.getNotifications(options);
  },

  getUnreadCount: async () => {
    return await notificationService.getUnreadCount();
  },

  markNotificationRead: async (notificationId) => {
    return await notificationService.markNotificationRead(notificationId);
  },

  markAllNotificationsRead: async () => {
    return await notificationService.markAllNotificationsRead();
  },

  deleteNotification: async (notificationId) => {
    return await notificationService.deleteNotification(notificationId);
  },

  sendTestEmail: async (payload) => {
    return await notificationService.sendTestEmail(payload);
  },

  // 14.3 Legal Policy Documents & Consent
  getAcceptedPolicies: async () => {
    return await request("/policies", { auth: true });
  },

  recordPolicyConsent: async (policyId, accepted = true) => {
    return await request(`/policies/${policyId}/consent`, {
      method: "POST",
      body: { accepted },
      auth: true,
    });
  },

  // 14.4 Privacy & GDPR Requests
  getPrivacyRequests: async () => {
    return await request("/privacy/requests", { auth: true });
  },

  submitPrivacyRequest: async (kind = "access") => {
    return await request("/privacy/requests", {
      method: "POST",
      body: { kind },
      auth: true,
    });
  },

  // 14.5 Member Transaction & Billing Statements
  getBillingDocuments: async () => {
    return await request("/billing/documents", { auth: true });
  },
};
