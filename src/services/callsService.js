import { request } from "./api";

export const callsService = {
  // 7.1 Call History
  getCalls: async () => {
    return await request("/calls", { auth: true });
  },

  getAllCalls: async () => {
    return await request("/calls", { auth: true });
  },

  // 7.2 Initiate Call
  initiateCall: async (connectionId, medium = "audio") => {
    return await request("/calls", {
      method: "POST",
      body: { connectionId, medium },
      auth: true,
    });
  },

  // 7.3 Call Action (Accept / Decline / End)
  callAction: async (callId, action = "accept") => {
    return await request(`/calls/${callId}/action`, {
      method: "POST",
      body: { action },
      auth: true,
    });
  },

  // 7.4 LiveKit RTC Token Generation
  getRoomToken: async (callId) => {
    return await request(`/calls/${callId}/token`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },
};
