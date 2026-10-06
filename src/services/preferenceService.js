import { request } from "./api";

export const preferenceService = {
  // 14.1 Member Preferences & Delivery
  getPreferences: async () => {
    return await request("/preferences", { auth: true });
  },

  updatePreferences: async (preferences) => {
    return await request("/preferences", {
      method: "POST",
      body: preferences,
      auth: true,
    });
  },

  // 14.2 In-App Notifications
  getNotifications: async () => {
    return await request("/notifications", { auth: true });
  },

  markNotificationRead: async (notificationId) => {
    return await request(`/notifications/${notificationId}/read`, {
      method: "POST",
      body: {},
      auth: true,
    });
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
