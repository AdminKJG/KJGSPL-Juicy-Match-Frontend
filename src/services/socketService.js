import { io } from "socket.io-client";
import { getStoredTokens } from "./api";

// ── Socket Server URL Resolution ─────────────────────────────────────────────
const RAW_API_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const RAW_SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || RAW_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8100"))
  .replace(/\/v1\/?$/, "")
  .replace(/\/$/, "");

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.activeConnectionId = null;
    this.activeLivestreamId = null;
    this.listeners = new Map(); // event -> Set(callbacks)
  }

  // ── Initialize and Connect ───────────────────────────────────────────────────
  connect(tokenOverride = null) {
    if (this.socket && this.isConnected) return this.socket;

    const { token } = getStoredTokens();
    const authToken = tokenOverride || token;

    if (!authToken) {
      console.log("[JM Socket] No auth token available; skipping connection.");
      return null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      console.log("[JM Socket] Connecting to:", RAW_SOCKET_URL);
      this.socket = io(RAW_SOCKET_URL, {
        auth: {
          token: authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.socket.on("connect", () => {
        console.log("⚡ [JM Socket] Connected. ID:", this.socket.id);
        this.isConnected = true;
        this._notifyListeners("connect", { socketId: this.socket.id });

        // Rejoin active connection room if any
        if (this.activeConnectionId) {
          this.joinConnection(this.activeConnectionId);
        }
        // Rejoin active livestream room if any
        if (this.activeLivestreamId) {
          this.joinLivestream(this.activeLivestreamId);
        }
      });

      this.socket.on("connect_error", (err) => {
        console.warn("❌ [JM Socket] Connection error:", err.message);
        this.isConnected = false;
        this._notifyListeners("connect_error", err);
      });

      this.socket.on("disconnect", (reason) => {
        console.warn("⚠️ [JM Socket] Disconnected:", reason);
        this.isConnected = false;
        this._notifyListeners("disconnect", reason);
      });

      // Bind all registered server events
      this._bindGlobalEvents();

      return this.socket;
    } catch (err) {
      console.warn("[JM Socket] Setup error:", err.message);
      return null;
    }
  }

  // Disconnect Socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.activeConnectionId = null;
    this.activeLivestreamId = null;
  }

  // ── Room Management ─────────────────────────────────────────────────────────
  joinConnection(connectionId) {
    if (!connectionId) return;
    this.activeConnectionId = connectionId;
    if (this.socket && this.isConnected) {
      this.socket.emit("connection:join", { connectionId }, (res) => {
        if (res?.ok) console.log("[JM Socket] Joined connection room:", connectionId);
      });
    }
  }

  leaveConnection(connectionId) {
    if (!connectionId) return;
    if (this.activeConnectionId === connectionId) {
      this.activeConnectionId = null;
    }
    if (this.socket && this.isConnected) {
      this.socket.emit("connection:leave", { connectionId });
    }
  }

  joinLivestream(livestreamId) {
    if (!livestreamId) return;
    this.activeLivestreamId = livestreamId;
    if (this.socket && this.isConnected) {
      this.socket.emit("livestream:join", { livestreamId });
    }
  }

  leaveLivestream(livestreamId) {
    if (!livestreamId) return;
    if (this.activeLivestreamId === livestreamId) {
      this.activeLivestreamId = null;
    }
    if (this.socket && this.isConnected) {
      this.socket.emit("livestream:leave", { livestreamId });
    }
  }

  // ── Chat Actions (Emit) ─────────────────────────────────────────────────────
  sendMessage(connectionId, body, clientId = null, replyToId = null) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error("Socket not connected"));
        return;
      }
      this.socket.emit(
        "message:send",
        {
          connectionId,
          body,
          clientId: clientId || `sock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          replyToId,
        },
        (response) => {
          if (response?.ok) resolve(response.message || response);
          else reject(new Error(response?.error || "Failed to send message"));
        }
      );
    });
  }

  editMessage(connectionId, messageId, body) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error("Socket not connected"));
        return;
      }
      this.socket.emit("message:edit", { connectionId, messageId, body }, (res) => {
        if (res?.ok) resolve(res.message || res);
        else reject(new Error(res?.error || "Failed to edit message"));
      });
    });
  }

  deleteMessage(connectionId, messageId, target = "everyone") {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error("Socket not connected"));
        return;
      }
      this.socket.emit("message:delete", { connectionId, messageId, target }, (res) => {
        if (res?.ok) resolve(res);
        else reject(new Error(res?.error || "Failed to delete message"));
      });
    });
  }

  reactMessage(connectionId, messageId, emoji) {
    if (this.socket && this.isConnected) {
      this.socket.emit("message:reaction", { connectionId, messageId, emoji });
    }
  }

  markAsRead(connectionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("message:read", { connectionId });
    }
  }

  startTyping(connectionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing:start", { connectionId });
    }
  }

  stopTyping(connectionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing:stop", { connectionId });
    }
  }

  // ── Global Event Subscriptions ──────────────────────────────────────────────
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return cleanup unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  _notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[JM Socket] Listener error on '${event}':`, err);
        }
      });
    }
  }

  _bindGlobalEvents() {
    if (!this.socket) return;

    const eventsToForward = [
      // 1. Direct Messaging
      "message:received",
      "new_message",
      "message:updated",
      "message:deleted",
      "message:reaction_updated",
      "message:seen",

      // 2. Typing Indicators
      "typing:status",

      // 3. Match & Discovery
      "match:created",
      "match:withdrawn",

      // 4. Audio / Video Calling
      "call:incoming",
      "call:accepted",
      "call:declined",
      "call:ended",

      // 5. Notifications
      "notification:received",
      "notification:badge_update",

      // 6. Private Photo Requests
      "photo_request:received",
      "photo_request:resolved",

      // 7. Travel Passport
      "travel_invite:received",
      "travel_invite:status_updated",

      // 8. Livestream
      "livestream:message_received",
      "livestream:viewer_count",
      "livestream:moderation",
      "livestream:banned",
      "livestream:ended",
    ];

    eventsToForward.forEach((eventName) => {
      this.socket.off(eventName);
      this.socket.on(eventName, (data) => {
        console.log(`[JM Socket Event] ${eventName}:`, data);
        this._notifyListeners(eventName, data);
      });
    });
  }
}

export const socketService = new SocketService();
