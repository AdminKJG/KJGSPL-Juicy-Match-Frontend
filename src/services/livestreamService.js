import { request } from "./api";

export const broadcastLiveEvent = (event) => {
  if (!event || !event.type) return;
  try {
    const channel = new BroadcastChannel("jm_live_channel");
    channel.postMessage(event);
    channel.close();
  } catch {}
  try {
    localStorage.setItem("jm_last_live_event", JSON.stringify({ ...event, timestamp: Date.now() }));
  } catch {}
};

export const endStreamBeacon = (streamId) => {
  if (!streamId) return;
  try {
    livestreamService.endBroadcast(streamId);
  } catch {}
};

export const livestreamService = {
  // 8.1 Livestream Availability Mode
  getMode: async () => {
    return await request("/livestreams/mode", { auth: false });
  },

  // 8.2 Start Broadcast (Host)
  startBroadcast: async (title = "Live Studio Session") => {
    return await request("/livestreams", {
      method: "POST",
      body: { title },
      auth: true,
    });
  },
  startStream: async (title = "Live Studio Session", meta = {}) => {
    return await livestreamService.startBroadcast(title);
  },

  // 8.3 End Broadcast (Host)
  endBroadcast: async (streamId) => {
    try {
      const endedList = JSON.parse(localStorage.getItem("jm_ended_livestreams") || "[]");
      if (!endedList.includes(String(streamId))) {
        endedList.push(String(streamId));
        localStorage.setItem("jm_ended_livestreams", JSON.stringify(endedList));
      }
    } catch {}
    return await request(`/livestreams/${streamId}/end`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 8.4 List Active Streams (Feed)
  listActiveStreams: async () => {
    return await request("/livestreams", { auth: true });
  },
  getLiveStreams: async (currentUser = null) => {
    try {
      const res = await livestreamService.listActiveStreams();
      const items = Array.isArray(res) ? res : res?.items || res?.data?.items || res?.data || [];
      return items;
    } catch (err) {
      console.warn("Failed to load live streams:", err.message);
      return [];
    }
  },

  // Helpers for UI state
  getLastEndedStream: () => {
    try {
      const raw = localStorage.getItem("jm_last_ended_stream");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  isStreamEndedLocally: (streamId) => {
    if (!streamId) return false;
    try {
      const list = JSON.parse(localStorage.getItem("jm_ended_livestreams") || "[]");
      return list.includes(String(streamId));
    } catch {
      return false;
    }
  },

  // 8.5 Livestream LiveKit Room Token (Host / Viewer)
  getLivestreamToken: async (streamId) => {
    return await request(`/livestreams/${streamId}/token`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 8.6 Stream Chat Messages & Pagination
  getMessages: async (streamId, after = null, limit = 100) => {
    const params = new URLSearchParams();
    if (after) params.append("after", after);
    if (limit) params.append("limit", String(limit));
    const query = params.toString();
    const endpoint = query ? `/livestreams/${streamId}/messages?${query}` : `/livestreams/${streamId}/messages`;
    return await request(endpoint, { auth: true });
  },

  sendMessage: async (streamId, body, clientId = null) => {
    const cId = clientId || `stream-chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return await request(`/livestreams/${streamId}/messages`, {
      method: "POST",
      body: { body, clientId: cId },
      auth: true,
    });
  },

  // 8.7 Stream Moderation (Mute / Ban Viewer)
  muteViewer: async (streamId, viewerId, muted = true) => {
    return await request(`/livestreams/${streamId}/viewers/${viewerId}/mute`, {
      method: "POST",
      body: { muted },
      auth: true,
    });
  },

  banViewer: async (streamId, viewerId) => {
    return await request(`/livestreams/${streamId}/viewers/${viewerId}/ban`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 8.8 Real-Time Stream Event Stream Ticket (SSE)
  getEventsTicket: async (streamId) => {
    return await request(`/livestreams/${streamId}/events-ticket`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 8.9 Leave Livestream
  leaveStream: async (streamId) => {
    return await request("/livestreams/leave", {
      method: "POST",
      body: { streamId },
      auth: true,
    });
  },
};
