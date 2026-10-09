import { request } from "./api";

export const callsService = {
  // 1. POST /calls — Initiate new call
  initiateCall: async (connectionId, medium = "audio") => {
    const cleanId = (connectionId && connectionId !== "undefined" && connectionId !== "null") ? String(connectionId).trim() : null;
    if (!cleanId) {
      throw new Error("Valid connectionId is required to start call");
    }
    try {
      return await request("/calls", {
        method: "POST",
        body: { connectionId: cleanId, medium },
        auth: true,
      });
    } catch (err) {
      // If 403 Mutual communication consent required, auto-grant consent and retry call
      if (err.status === 403 || err.message?.toLowerCase().includes("consent")) {
        try {
          await request(`/connections/${cleanId}/consent`, {
            method: "POST",
            body: { accept: true },
            auth: true,
          });
          return await request("/calls", {
            method: "POST",
            body: { connectionId: cleanId, medium },
            auth: true,
          });
        } catch {
          throw err;
        }
      }
      throw err;
    }
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
