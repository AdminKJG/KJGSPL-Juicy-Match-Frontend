import { request } from "./api";

export const callsService = {
  // 1. POST /calls — Initiate new call
  initiateCall: async (connectionId, medium = "audio") => {
    return await request("/calls", {
      method: "POST",
      body: { connectionId, medium },
      auth: true,
    });
  },

  // 2. GET /calls — Fetch calls (list for polling & history)
  getCalls: async () => {
    return await request("/calls", { auth: true });
  },

  getAllCalls: async () => {
    return await request("/calls", { auth: true });
  },

  // 3. POST /calls/:id/action — accept | decline | end
  callAction: async (callId, action = "accept") => {
    return await request(`/calls/${callId}/action`, {
      method: "POST",
      body: { action },
      auth: true,
    });
  },

  // 4. POST /calls/:id/token — Get LiveKit JWT token & URL
  getCallToken: async (callId) => {
    return await request(`/calls/${callId}/token`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  getRoomToken: async (callId) => {
    return await request(`/calls/${callId}/token`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 5. POST /calls/:id/demo-accept — Simulate bot accept
  demoAccept: async (callId) => {
    try {
      return await request(`/calls/${callId}/demo-accept`, {
        method: "POST",
        body: {},
        auth: true,
      });
    } catch {
      return { success: true, state: "accepted" };
    }
  },
};

export const callService = callsService;
export default callsService;
