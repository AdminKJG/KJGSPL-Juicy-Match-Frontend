import { request } from "./api";

let cachedPlaces = null;

export const passportService = {
  // 11.1 Starting Cities & Countries
  getPlaces: async () => {
    const res = await request("/places", { auth: true });
    if (res) cachedPlaces = res;
    return res;
  },

  getCountries: () => {
    return cachedPlaces?.countries?.map((c) => c.name) || [];
  },

  getCitiesByCountry: (countryName) => {
    return cachedPlaces?.cities?.filter((c) => c.country?.toLowerCase() === countryName?.toLowerCase()) || [];
  },

  // 11.2 City Search & Geocoding Autocomplete
  searchPlaces: async (query, country = null) => {
    const params = new URLSearchParams({ q: query });
    if (country) params.append("country", country);
    return await request(`/places/search?${params.toString()}`, { auth: true });
  },

  // 9.1 Member Travel Plans
  getPlans: async () => {
    return await request("/passport", { auth: true });
  },
  getTravelPlans: async () => {
    return await request("/passport", { auth: true });
  },

  createPlan: async ({ city, start, end }) => {
    return await request("/passport", {
      method: "POST",
      body: { city, start, end },
      auth: true,
    });
  },
  createTravelPlan: async (city, start, end) => {
    return await request("/passport", {
      method: "POST",
      body: { city, start, end },
      auth: true,
    });
  },

  updatePlanVisibility: async (planId, visibility = "city", revision = 1, consent = true) => {
    return await request(`/passport/${planId}/visibility`, {
      method: "PATCH",
      body: { visibility, revision, consent },
      auth: true,
    });
  },
  updateVisibility: async (planId, visibility = "city", revision = 1, consent = true) => {
    return await request(`/passport/${planId}/visibility`, {
      method: "PATCH",
      body: { visibility, revision, consent },
      auth: true,
    });
  },

  deletePlan: async (planId) => {
    return await request(`/passport/${planId}`, {
      method: "DELETE",
      auth: true,
    });
  },
  deleteTravelPlan: async (planId) => {
    return await request(`/passport/${planId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  // 9.2 Travel Discovery Matching
  discoverDestinationMatches: async (planId) => {
    return await request(`/passport/${planId}/discover`, { auth: true });
  },

  // 9.3 Travel Date Invitations
  getInvitations: async () => {
    return await request("/passport/invitations", { auth: true });
  },

  sendInvitation: async ({ planId, targetPlanId, day, consent = true }) => {
    return await request("/passport/invitations", {
      method: "POST",
      body: { planId, targetPlanId, day, consent },
      auth: true,
    });
  },

  respondToInvitation: async (invitationId, action = "accept", consent = true) => {
    return await request(`/passport/invitations/${invitationId}/action`, {
      method: "POST",
      body: { action, consent },
      auth: true,
    });
  },
};
