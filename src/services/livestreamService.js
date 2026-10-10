import { request } from "./api";

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
  // 1. Livestream Availability Mode
  getMode: async () => {
    return await request("/livestreams/mode", { auth: false });
  },

  // 2. Start Broadcast (Host)
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

  // 3. End Broadcast (Host)
  endBroadcast: async (streamId) => {
    try {
      const endedList = JSON.parse(localStorage.getItem("jm_ended_livestreams") || "[]");
      if (!endedList.includes(String(streamId))) {
        endedList.push(String(streamId));
        localStorage.setItem("jm_ended_livestreams", JSON.stringify(endedList));
      }
    } catch {}
    broadcastLiveEvent({ type: "HOST_ENDED_LIVE", streamId });
    return await request(`/livestreams/${streamId}/end`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },
  endStream: async (streamId, meta = {}) => {
    if (meta && Object.keys(meta).length > 0) {
      livestreamService.markStreamEndedLocally(streamId, meta);
    }
    return await livestreamService.endBroadcast(streamId);
  },

  // 4. List Active Streams (Discovery Feed)
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

  // 5. Stream Details
  getStreamDetails: async (streamId) => {
    return await request(`/livestreams/${streamId}`, { auth: true });
  },

  // 6. Livestream LiveKit Room Token (Host / Viewer)
  getLivestreamToken: async (streamId) => {
    return await request(`/livestreams/${streamId}/token`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },
  getStreamToken: async (streamId) => {
    return await livestreamService.getLivestreamToken(streamId);
  },

  // 7. Stream Chat Messages & Pagination
  getMessages: async (streamId, after = null, limit = 100) => {
    const params = new URLSearchParams();
    if (after) {
      if (typeof after === "number" && after <= 100 && !limit) {
        params.append("limit", String(after));
      } else {
        params.append("after", String(after));
        if (limit) params.append("limit", String(limit));
      }
    } else if (limit) {
      params.append("limit", String(limit));
    }
    const query = params.toString();
    const endpoint = query ? `/livestreams/${streamId}/messages?${query}` : `/livestreams/${streamId}/messages`;
    try {
      const res = await request(endpoint, { auth: true });
      return Array.isArray(res) ? res : res?.items || res?.data?.items || res?.messages || [];
    } catch {
      return [];
    }
  },

  sendMessage: async (streamId, body, clientId = null) => {
    const cId = clientId || `stream-chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return await request(`/livestreams/${streamId}/messages`, {
      method: "POST",
      body: { body, clientId: cId },
      auth: true,
    });
  },

  // 8. Stream Moderation (Mute / Ban Viewer)
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

  // 9. Report Stream
  reportStream: async (streamId, reason = "harassment") => {
    return await request(`/livestreams/${streamId}/report`, {
      method: "POST",
      body: { reason },
      auth: true,
    });
  },

  // 10. Real-Time Stream Event Stream Ticket (SSE)
  getEventsTicket: async (streamId) => {
    return await request(`/livestreams/${streamId}/events-ticket`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // Connect SSE with single-use ticket
  connectEvents: async (streamId, onEvent, onError) => {
    if (!streamId) return null;
    try {
      const ticketRes = await livestreamService.getEventsTicket(streamId);
      const ticket = ticketRes?.ticket || ticketRes?.data?.ticket;
      if (!ticket) {
        onError?.(new Error("No SSE ticket returned"));
        return null;
      }

      const { token } = getStoredTokens();
      const cleanToken = token ? token.replace(/^Bearer\s+/i, "") : "";

      const sseBase = RAW_BASE_URL ? `${RAW_BASE_URL}/v1` : "/v1";
      const sseUrl = `${sseBase}/livestreams/${streamId}/events?ticket=${encodeURIComponent(ticket)}${
        cleanToken ? `&token=${encodeURIComponent(cleanToken)}&accessToken=${encodeURIComponent(cleanToken)}` : ""
      }`;

      let es = null;
      try {
        es = new EventSource(sseUrl, { withCredentials: true });
      } catch {
        es = new EventSource(sseUrl);
      }

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent?.(data);
        } catch {
          onEvent?.({ body: e.data });
        }
      };

      // Named SSE events matching API doc
      const eventTypes = [
        "ready",
        "livestream.started",
        "livestream.viewers",
        "livestream.viewer_count",
        "livestream.message",
        "livestream.moderation",
        "livestream.muted",
        "livestream.banned",
        "livestream.ended",
        "livestream.end",
      ];

      eventTypes.forEach((evtName) => {
        es.addEventListener(evtName, (e) => {
          try {
            const data = JSON.parse(e.data);
            onEvent?.({ type: evtName, ...data });
          } catch {
            onEvent?.({ type: evtName, raw: e.data });
          }
        });
      });

      es.onerror = (err) => {
        // Prevent browser EventSource from infinite 401 retry loop
        try {
          es.close();
        } catch {}
        onError?.(err);
      };

      return es;
    } catch (err) {
      onError?.(err);
      return null;
    }
  },

  // 11. Leave Livestream (Viewer)
  leaveStream: async (streamId) => {
    return await request("/livestreams/leave", {
      method: "POST",
      body: { streamId },
      auth: true,
    });
  },

  // Helpers for UI state & ended stream caching
  markStreamEndedLocally: (streamId, meta = {}) => {
    if (!streamId) return;
    try {
      const endedList = JSON.parse(localStorage.getItem("jm_ended_livestreams") || "[]");
      if (!endedList.includes(String(streamId))) {
        endedList.push(String(streamId));
        localStorage.setItem("jm_ended_livestreams", JSON.stringify(endedList));
      }
      localStorage.setItem("jm_last_ended_stream", JSON.stringify({
        id: streamId,
        ...meta,
        endedAt: meta.endedAt || new Date().toISOString(),
      }));
    } catch {}
  },

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
};

