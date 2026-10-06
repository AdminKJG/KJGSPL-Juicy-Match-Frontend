import { request } from "./api";

export const exploreService = {
  // 11.1 Starting Cities & Countries
  getPlaces: async () => {
    return await request("/places", { auth: true });
  },

  // 11.2 City Search & Geocoding Autocomplete
  searchPlaces: async (query, country = null) => {
    const params = new URLSearchParams({ q: query });
    if (country) params.append("country", country);
    return await request(`/places/search?${params.toString()}`, { auth: true });
  },

  // 11.3 Broad Activity Heatmap / Zones
  getMapZones: async () => {
    return await request("/map", { auth: true });
  },
  getAtmosphericMap: async () => {
    return await request("/map", { auth: true });
  },

  // 12.1 List Published Events
  getEvents: async () => {
    return await request("/events", { auth: true });
  },

  // 12.2 RSVP to Event
  rsvpEvent: async (eventId, state = "confirmed") => {
    return await request(`/events/${eventId}/rsvp`, {
      method: "POST",
      body: { state },
      auth: true,
    });
  },
  submitRsvp: async (eventId, state = "confirmed") => {
    return await request(`/events/${eventId}/rsvp`, {
      method: "POST",
      body: { state },
      auth: true,
    });
  },
};
