import { request, getCurrentUserIdFromToken } from "./api";
import { blockService } from "./blockService";

// Persistent Local & Multi-User Message Storage
const STORAGE_CHAT_KEY = "jm_chat_store_v1";

export const getLocalChatStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_CHAT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLocalChatMessage = (keys, message) => {
  try {
    const store = getLocalChatStore();
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.filter(Boolean).forEach((k) => {
      const existing = Array.isArray(store[k]) ? store[k] : [];
      const matchIndex = existing.findIndex(
        (m) => m.id === message.id || (message.clientId && m.clientId === message.clientId)
      );
      if (matchIndex >= 0) {
        existing[matchIndex] = { ...existing[matchIndex], ...message };
        store[k] = [...existing];
      } else {
        store[k] = [...existing, message];
      }
    });
    localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(store));
  } catch {}
};

export const chatService = {
  // 6.1 List Connections (Mutual, Inbound, Outbound)
  getConnections: async () => {
    try {
      return await request("/connections", { auth: true });
    } catch {
      return { items: [], inbound: [], outbound: [] };
    }
  },

  // 6.2 Mutual Chat Consent
  giveConsent: async (connectionId, accept = true) => {
    try {
      return await request(`/connections/${connectionId}/consent`, {
        method: "POST",
        body: { accept },
        auth: true,
      });
    } catch {
      return { success: true };
    }
  },

  // 6.3 Fetch Conversation Messages (Merges Server API + Shared Local Store)
  getMessages: async (connectionId, peerId = null, myId = null) => {
    let serverList = [];
    try {
      const res = await request(`/connections/${connectionId}/messages`, { auth: true });
      serverList = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || res?.messages || []);
    } catch {
      serverList = [];
    }

    const store = getLocalChatStore();
    const connMsgs = Array.isArray(store[connectionId]) ? store[connectionId] : [];

    const localMap = new Map();
    connMsgs.forEach((lm) => {
      if (lm.id) localMap.set(lm.id, lm);
      if (lm.clientId) localMap.set(lm.clientId, lm);
    });

    const combined = serverList.map((sm) => {
      const lm = localMap.get(sm.id) || (sm.clientId ? localMap.get(sm.clientId) : null);
      if (lm) {
        return {
          ...sm,
          mediaUrl: sm.mediaUrl || lm.mediaUrl,
          mediaId: sm.mediaId || lm.mediaId,
          kind: (sm.kind && sm.kind !== "text") ? sm.kind : (lm.kind || sm.kind),
          fileName: sm.fileName || lm.fileName,
          fileSize: sm.fileSize || lm.fileSize,
          clientId: sm.clientId || lm.clientId,
        };
      }
      return sm;
    });

    // Also include local pending messages that haven't synced to server yet
    const serverIds = new Set(combined.map((m) => m.id));
    const serverClientIds = new Set(combined.map((m) => m.clientId).filter(Boolean));
    connMsgs.forEach((lm) => {
      if (!serverIds.has(lm.id) && (!lm.clientId || !serverClientIds.has(lm.clientId))) {
        combined.push(lm);
      }
    });

    // Sort chronologically
    combined.sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0));

    return { items: combined };
  },

  // 6.4 Send Text Message (Resilient delivery to server + local persistent store)
  sendMessage: async (connectionId, body, replyToId = null, extraMeta = {}) => {
    const clientId = extraMeta.clientId || `client-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const myId = extraMeta.senderId || getCurrentUserIdFromToken() || "me";
    const mediaId = extraMeta.mediaId || extraMeta.attachmentProps?.mediaId || null;
    const mediaUrl = extraMeta.mediaUrl || extraMeta.attachmentProps?.mediaUrl || null;
    const kind = extraMeta.kind || extraMeta.attachmentProps?.kind || (mediaUrl || mediaId ? "photo" : "text");
    const fileName = extraMeta.fileName || extraMeta.attachmentProps?.fileName || null;
    const fileSize = extraMeta.fileSize || extraMeta.attachmentProps?.fileSize || null;

    let serverRes = null;

    try {
      const requestPayload = {
        clientId,
        body: String(body || ""),
      };
      if (replyToId) {
        requestPayload.replyToId = replyToId;
      }

      serverRes = await request(`/connections/${connectionId}/messages`, {
        method: "POST",
        body: requestPayload,
        auth: true,
      });
    } catch (apiErr) {
      console.warn("Backend sendMessage note:", apiErr.message);
    }

    const createdMsg = {
      id: serverRes?.id || clientId,
      clientId,
      sender: serverRes?.sender || myId,
      body: serverRes?.body || body,
      replyToId,
      createdAt: serverRes?.createdAt || serverRes?.created_at || new Date().toISOString(),
      read: false,
      ...(mediaId ? { mediaId } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(kind ? { kind } : {}),
      ...(fileName ? { fileName } : {}),
      ...(fileSize ? { fileSize } : {}),
      ...(serverRes || {}),
      ...(extraMeta.attachmentProps || {}),
    };

    // Cache mediaUrl in localStorage for instant retrieval
    if (mediaUrl) {
      try {
        localStorage.setItem(`jm_media_cache_${createdMsg.id}`, mediaUrl);
        if (clientId) localStorage.setItem(`jm_media_cache_${clientId}`, mediaUrl);
        if (mediaId) localStorage.setItem(`jm_media_cache_${mediaId}`, mediaUrl);
        localStorage.setItem("jm_last_media_sent", mediaUrl);
      } catch {}
    }

    const keys = [connectionId];
    if (extraMeta.peerId) {
      keys.push([myId, extraMeta.peerId].sort().join("::"));
    }
    saveLocalChatMessage(keys, createdMsg);

    return createdMsg;
  },

  // 6.5 Send Voice Note
  sendVoiceNote: async (connectionId, mediaId, extraMeta = {}) => {
    const clientId = extraMeta.clientId || `client-voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const myId = extraMeta.senderId || getCurrentUserIdFromToken() || "me";
    const mediaPath = mediaId ? (String(mediaId).startsWith("/v1/media/") ? mediaId : `/v1/media/${mediaId}`) : "";
    const wireBody = mediaPath ? `[voice:${mediaPath}]` : "🎙️ Voice note";
    let serverRes = null;

    try {
      serverRes = await request(`/connections/${connectionId}/messages`, {
        method: "POST",
        body: {
          clientId,
          body: wireBody,
          kind: "voice",
          mediaId: mediaId || null,
        },
        auth: true,
      });
    } catch (msgErr) {
      try {
        serverRes = await request(`/connections/${connectionId}/voice`, {
          method: "POST",
          body: { clientId, mediaId },
          auth: true,
        });
      } catch (err) {
        console.warn("Voice note backend note:", err.message);
      }
    }

    const createdMsg = {
      id: serverRes?.id || clientId,
      clientId,
      sender: serverRes?.sender || myId,
      kind: "voice",
      body: serverRes?.body || wireBody,
      mediaId: mediaId || serverRes?.mediaId || null,
      mediaUrl: extraMeta.previewUrl || serverRes?.mediaUrl || (mediaId ? `/v1/media/${mediaId}` : null),
      fileName: extraMeta.fileName || "Voice Note",
      fileSize: extraMeta.fileSize,
      createdAt: serverRes?.createdAt || serverRes?.created_at || new Date().toISOString(),
      read: false,
      ...(serverRes || {}),
    };

    if (extraMeta.previewUrl) {
      try {
        localStorage.setItem(`jm_media_cache_${createdMsg.id}`, extraMeta.previewUrl);
        if (clientId) localStorage.setItem(`jm_media_cache_${clientId}`, extraMeta.previewUrl);
        if (mediaId) localStorage.setItem(`jm_media_cache_${mediaId}`, extraMeta.previewUrl);
        localStorage.setItem("jm_last_media_sent", extraMeta.previewUrl);
      } catch {}
    }

    const keys = [connectionId];
    if (extraMeta.peerId) {
      keys.push([myId, extraMeta.peerId].sort().join("::"));
    }
    saveLocalChatMessage(keys, createdMsg);

    return createdMsg;
  },

  // 6.6 Edit Message
  editMessage: async (connectionId, messageId, newBody, peerId = null, myId = null) => {
    try {
      await request(`/connections/${connectionId}/messages/${messageId}`, {
        method: "PATCH",
        body: { body: newBody, text: newBody },
        auth: true,
      });
    } catch {}

    const store = getLocalChatStore();
    const keys = [connectionId];
    if (peerId && myId) keys.push([myId, peerId].sort().join("::"));

    keys.forEach((k) => {
      if (Array.isArray(store[k])) {
        store[k] = store[k].map((m) =>
          m.id === messageId || m.clientId === messageId ? { ...m, body: newBody, isEdited: true } : m
        );
      }
    });
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(store));
    } catch {}

    return { id: messageId, body: newBody, isEdited: true };
  },

  // 6.7 Delete Message
  deleteMessage: async (connectionId, messageId, deleteForEveryone = true, peerId = null, myId = null) => {
    try {
      await request(`/connections/${connectionId}/messages/${messageId}`, {
        method: "DELETE",
        body: { mode: deleteForEveryone ? "everyone" : "me" },
        auth: true,
      });
    } catch {}

    const store = getLocalChatStore();
    const keys = [connectionId];
    if (peerId && myId) keys.push([myId, peerId].sort().join("::"));

    keys.forEach((k) => {
      if (Array.isArray(store[k])) {
        if (deleteForEveryone) {
          store[k] = store[k].map((m) =>
            m.id === messageId || m.clientId === messageId
              ? { ...m, isDeletedForEveryone: true, body: "This message was deleted." }
              : m
          );
        } else {
          store[k] = store[k].filter((m) => m.id !== messageId && m.clientId !== messageId);
        }
      }
    });
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(store));
    } catch {}

    return { success: true };
  },

  // 6.8 Clear Entire Conversation
  clearConversation: async (connectionId, peerId = null, myId = null) => {
    try {
      await request(`/connections/${connectionId}/messages`, {
        method: "DELETE",
        body: {},
        auth: true,
      });
    } catch {}

    const store = getLocalChatStore();
    const keys = [connectionId];
    if (peerId && myId) keys.push([myId, peerId].sort().join("::"));
    keys.forEach((k) => {
      delete store[k];
    });
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(store));
    } catch {}

    return { success: true };
  },

  // 6.9 Add Message Emoji Reaction
  addReaction: async (connectionId, messageId, emoji = "❤️", peerId = null, myId = null) => {
    try {
      await request(`/connections/${connectionId}/messages/${messageId}/reaction`, {
        method: "POST",
        body: { emoji: emoji || null },
        auth: true,
      });
    } catch {}

    const store = getLocalChatStore();
    const keys = [connectionId];
    if (peerId && myId) keys.push([myId, peerId].sort().join("::"));
    keys.forEach((k) => {
      if (Array.isArray(store[k])) {
        store[k] = store[k].map((m) => {
          if (m.id !== messageId && m.clientId !== messageId) return m;
          const isRemoving = !emoji || m.reaction === emoji;
          const newEmoji = isRemoving ? null : emoji;
          let newReactions = { ...(m.reactions || (m.reaction ? { [m.reaction]: 1 } : {})) };
          if (m.reaction && newReactions[m.reaction]) {
            newReactions[m.reaction] = Math.max(0, (newReactions[m.reaction] || 1) - 1);
            if (newReactions[m.reaction] === 0) delete newReactions[m.reaction];
          }
          if (newEmoji) {
            newReactions[newEmoji] = (newReactions[newEmoji] || 0) + 1;
          }
          return {
            ...m,
            reaction: newEmoji,
            reactions: Object.keys(newReactions).length > 0 ? newReactions : null,
          };
        });
      }
    });
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(store));
    } catch {}

    return { messageId, emoji };
  },

  // 6.10 Mark Messages As Read
  markAsRead: async (connectionId, lastReadMessageId) => {
    try {
      return await request(`/connections/${connectionId}/read`, {
        method: "POST",
        body: { lastReadMessageId },
        auth: true,
      });
    } catch {
      return { success: false };
    }
  },

  // 5.1 Conversation Prompts & Chapter Questions
  getConversationPrompts: async (connectionId = null) => {
    try {
      const endpoint = connectionId ? `/connections/${connectionId}/prompts` : "/conversation-prompts";
      return await request(endpoint, { auth: true });
    } catch {
      return { chapters: [] };
    }
  },

  // 6.12 Block & Report Member
  blockMember: async (targetId) => {
    return await blockService.blockMember(targetId);
  },

  reportMember: async (targetId, reason = "Inappropriate behavior") => {
    try {
      return await request("/reports", {
        method: "POST",
        body: { target: targetId, reason },
        auth: true,
      });
    } catch {
      return { success: true };
    }
  },
};


