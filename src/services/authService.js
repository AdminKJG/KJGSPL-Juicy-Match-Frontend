import { request, setStoredTokens, clearStoredTokens } from "./api";

export const authService = {
  // 1.1 Fetch Public Legal Policies
  getPublicPolicies: async () => {
    return await request("/public/policies", { auth: false });
  },

  // 1.2 Public App Configuration
  getPublicConfig: async () => {
    return await request("/public/config", { auth: false });
  },

  // 1.3 Demo Actors & Login (Demo Mode Only)
  getDemoActors: async () => {
    return await request("/demo/actors", { auth: false });
  },

  demoLogin: async (actorId) => {
    const data = await request("/demo/login", {
      method: "POST",
      body: { id: actorId },
      auth: false,
    });
    const token = data.token || data.accessToken || data.data?.token;
    const refreshToken = data.refreshToken || data.data?.refreshToken;
    if (token) {
      setStoredTokens(token, refreshToken);
    }
    return data;
  },

  // 1.4 Member Registration
  register: async ({ email, password, pseudonym, age, policyIds, city, country }) => {
    const payload = {
      email,
      password,
      pseudonym,
      age: Number(age),
      policyIds: Array.isArray(policyIds) ? policyIds : [],
    };
    if (city) payload.city = city;
    if (country) payload.country = country;

    const data = await request("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
    const token = data.token || data.accessToken || data.data?.token;
    const refreshToken = data.refreshToken || data.data?.refreshToken;
    if (token) {
      setStoredTokens(token, refreshToken);
    }
    return data;
  },

  // 1.5 Verify Email (OTP or Magic Token)
  verifyEmail: async (email, code, token) => {
    const body = token ? { token } : { email, code: String(code) };
    const data = await request("/auth/verify-email", {
      method: "POST",
      body,
      auth: false,
    });
    const jwtToken = data.token || data.accessToken || data.data?.token;
    const refreshToken = data.refreshToken || data.data?.refreshToken;
    if (jwtToken) {
      setStoredTokens(jwtToken, refreshToken);
    }
    return data;
  },

  // 1.6 Resend Verification Code
  resendVerification: async (email) => {
    return await request("/auth/resend-verification", {
      method: "POST",
      body: { email },
      auth: false,
    });
  },

  // 1.7 Login
  login: async (email, password) => {
    const data = await request("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    const token = data.token || data.accessToken || data.data?.token;
    const refreshToken = data.refreshToken || data.data?.refreshToken;
    if (token) {
      setStoredTokens(token, refreshToken);
    }
    return data;
  },

  // 1.8 Refresh Token
  refreshToken: async (refreshToken) => {
    const data = await request("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    });
    const token = data.token || data.accessToken || data.data?.token;
    const newRefreshToken = data.refreshToken || data.data?.refreshToken || refreshToken;
    if (token) {
      setStoredTokens(token, newRefreshToken);
    }
    return data;
  },

  // 1.9 Logout
  logout: async () => {
    try {
      await request("/auth/logout", {
        method: "POST",
        body: {},
        auth: true,
      });
    } finally {
      clearStoredTokens();
    }
    return { success: true };
  },

  // 1.10 Change Password
  changePassword: async (currentPassword, newPassword) => {
    return await request("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
      auth: true,
    });
  },
};
