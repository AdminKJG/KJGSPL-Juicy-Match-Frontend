import { request } from "./api";

export const profileService = {
  // 2.1 Fetch Current Member Profile & Account
  getMe: async () => {
    return await request("/me", { auth: true });
  },

  // 2.2 Update Profile with Optimistic Concurrency Control (OCC)
  updateProfile: async (revision, profileData) => {
    try {
      return await request("/me/profile", {
        method: "PUT",
        body: {
          revision,
          profile: profileData,
        },
        auth: true,
      });
    } catch (err) {
      // If 409 Conflict occurs, re-fetch latest profile to resolve revision conflict automatically
      if (err.status === 409) {
        const latest = await profileService.getMe();
        return await request("/me/profile", {
          method: "PUT",
          body: {
            revision: latest.revision,
            profile: profileData,
          },
          auth: true,
        });
      }
      throw err;
    }
  },

  // 2.3 Delete Account
  deleteAccount: async (reason = "Member request") => {
    return await request("/me", {
      method: "DELETE",
      body: { reason },
      auth: true,
    });
  },

  // 2.4 Active Sessions Management
  getSessions: async () => {
    return await request("/sessions", { auth: true });
  },

  revokeOtherSessions: async () => {
    return await request("/sessions/revoke-others", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 2.5 Server Global Config
  getConfig: async () => {
    try {
      return await request("/config", { auth: false });
    } catch {
      return await request("/public/config", { auth: false });
    }
  },
};
