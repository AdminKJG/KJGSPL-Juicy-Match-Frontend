import { request } from "./api";

export const discoverService = {
  // 3.1 Daily Discovery Recommendations
  getDiscoveryFeed: async ({ includeConnected = false, includeSwiped = false } = {}) => {
    const params = new URLSearchParams();
    if (includeConnected) params.append("include_connected", "true");
    if (includeSwiped) params.append("include_swiped", "true");
    const query = params.toString();
    const endpoint = query ? `/discover?${query}` : "/discover";
    return await request(endpoint, { auth: true });
  },

  // 3.2 Swipe Action (like, pass, save, withdraw)
  swipe: async (target, action = "like") => {
    const res = await request("/swipes", {
      method: "POST",
      body: { target, action },
      auth: true,
    });
    if (res && typeof res === "object") {
      const vId = res.connectionId || res.id || res.connection?.id || (res.connection && res.connection.connectionId);
      if (vId) {
        res.id = vId;
        res.connectionId = vId;
        if (res.connection && typeof res.connection === "object") {
          res.connection.id = vId;
          res.connection.connectionId = vId;
        }
      }
    }
    return res;
  },

  // 3.3 Undo Latest Pass Swipe
  undoPass: async (target) => {
    return await request("/swipes/undo", {
      method: "POST",
      body: { target },
      auth: true,
    });
  },

  // 3.4 Withdraw / Delete Swipe
  withdrawSwipe: async (target) => {
    return await request(`/swipes/${target}`, {
      method: "DELETE",
      auth: true,
    });
  },

  // 2.4 View Peer Public Profile
  getPeerProfile: async (id) => {
    return await request(`/profiles/${id}`, { auth: true });
  },

  // 3.5 Matching Insights & Icebreaker Assistant
  getAssistInsight: async (target) => {
    return await request("/assist", {
      method: "POST",
      body: { target },
      auth: true,
    });
  },

  // 3.6 Profile Assistance & Privacy Checks
  getAssistCapabilities: async () => {
    return await request("/assist/capabilities", { auth: true });
  },

  executeAssistAction: async (action) => {
    return await request(`/assist/${action}`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },
};
