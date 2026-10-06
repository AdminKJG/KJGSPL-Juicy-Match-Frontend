import { request } from "./api";

export const aiService = {
  // 3.6 Assist Capabilities
  getCapabilities: async () => {
    return await request("/assist/capabilities", { auth: false });
  },

  // 3.5 Matching Insights & Icebreaker Assistant
  getStarters: async (targetMemberId) => {
    return await request("/assist", {
      method: "POST",
      body: { target: targetMemberId },
      auth: true,
    });
  },

  // 3.6 Profile Assistance & Privacy Checks
  getProfileGuide: async () => {
    return await request("/assist/profile-guide", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  getPreferenceHelper: async () => {
    return await request("/assist/preference-helper", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  getPrivacyCheck: async () => {
    return await request("/assist/privacy-check", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  getDiscoveryTips: async () => {
    return await request("/assist/discovery-tips", {
      method: "POST",
      body: {},
      auth: true,
    });
  },
};
