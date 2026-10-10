import { useState, useEffect, useCallback, useRef } from "react";
import { chatService, getLocalChatStore } from "../../../../services/chatService";
import { mediaService } from "../../../../services/mediaService";
import { socketService } from "../../../../services/socketService";

export function useChatMessages({
  activeConn,
  state,
  tabIdRef,
  setConnections,
  isInitialLoadRef,
  seenMsgIdsRef,
  prevMsgReactionsRef,
  setIsPeerTyping,
}) {
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const activeConnRef = useRef(activeConn);
  useEffect(() => {
    activeConnRef.current = activeConn;
  }, [activeConn]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const activeConnId = activeConn?.id;

  const loadMessages = useCallback(async (isBackground = false) => {
    const currentConn = activeConnRef.current;
    const connId = currentConn?.id;
    if (!connId) {
      setMessages([]);
      return;
    }
    if (!isBackground) {
      setLoadingMsgs(true);
    }

    try {
      const myId = stateRef.current?.me?.id || "me";
      const peerId = currentConn?.peer?.id;
      const res = await chatService.getMessages(connId, peerId, myId);
      const rawServerItems = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
      // Deduplicate consecutive identical system / call-ended messages from server
      const serverItems = rawServerItems.filter((m, i, arr) => {
        if (i === 0) return true;
        const prev = arr[i - 1];
        const isCallEnded = typeof m.body === "string" && (m.body.includes("call · Ended") || m.body.includes("Call · Ended"));
        const isPrevCallEnded = typeof prev?.body === "string" && (prev.body.includes("call · Ended") || prev.body.includes("Call · Ended"));
        if (isCallEnded && isPrevCallEnded && m.body === prev.body) {
          return false;
        }
        return true;
      });

      const localStore = getLocalChatStore();
      const rawConnLocal = Array.isArray(localStore[connId]) ? localStore[connId] : [];
      const connLocal = rawConnLocal.filter((m) => {
        if (!m) return false;
        const mConn = m.connectionId || m.connection_id || m.conversationId;
        if (mConn && String(mConn).toLowerCase() !== String(connId).toLowerCase()) return false;
        return true;
      });

      const pairKey = peerId ? [myId, peerId].sort().join("::") : null;
      const rawPairLocal = (pairKey && Array.isArray(localStore[pairKey])) ? localStore[pairKey] : [];
      const pairLocal = rawPairLocal.filter((m) => {
        if (!m) return false;
        const mConn = m.connectionId || m.connection_id || m.conversationId;
        if (mConn && String(mConn).toLowerCase() !== String(connId).toLowerCase()) return false;
        return true;
      });

      const mergedLocalMap = new Map();
      [...connLocal, ...pairLocal].forEach((m) => {
        if (m.id) mergedLocalMap.set(m.id, m);
        if (m.clientId) mergedLocalMap.set(m.clientId, m);
        if (m.client_id) mergedLocalMap.set(m.client_id, m);
      });

      const serverIds = new Set();
      const serverClientIds = new Set();
      serverItems.forEach((m) => {
        if (m.id) serverIds.add(m.id);
        if (m.clientId) serverClientIds.add(m.clientId);
        if (m.client_id) serverClientIds.add(m.client_id);
      });

      const combined = serverItems.map((sm) => {
        const localMatch =
          mergedLocalMap.get(sm.id) ||
          (sm.clientId ? mergedLocalMap.get(sm.clientId) : null) ||
          (sm.client_id ? mergedLocalMap.get(sm.client_id) : null);

        if (localMatch) {
          return {
            ...localMatch,
            ...sm,
            isMine: sm.sender === myId || sm.isMine || localMatch.isMine,
            mine: sm.sender === myId || sm.mine || localMatch.mine,
            reactions: sm.reactions || localMatch.reactions,
            reaction: sm.reaction || localMatch.reaction,
            reactionCount: sm.reactionCount ?? localMatch.reactionCount,
            read: sm.read ?? localMatch.read,
            isRead: sm.isRead ?? localMatch.isRead,
            mediaUrl: sm.mediaUrl || localMatch.mediaUrl,
            mediaKind: sm.mediaKind || localMatch.mediaKind,
            clientId: sm.clientId || localMatch.clientId,
          };
        }

        return {
          ...sm,
          isMine: sm.sender === myId || sm.isMine,
          mine: sm.sender === myId || sm.mine,
        };
      });

      setMessages((prev) => {
        const mediaMap = new Map();
        try {
          prev.forEach((p) => {
            const pMedia = p.mediaUrl || p.media_url;
            if (pMedia || p.fileName || p.fileSize || p.kind === "photo" || p.kind === "video" || p.kind === "voice" || p.kind === "file") {
              if (p.id) mediaMap.set(p.id, p);
              if (p.clientId) mediaMap.set(p.clientId, p);
              if (p.client_id) mediaMap.set(p.client_id, p);
              if (p.mediaId) mediaMap.set(p.mediaId, p);
              if (p.media_id) mediaMap.set(p.media_id, p);
            }
          });
        } catch {}

        const mappedServer = combined.map((m) => {
          const cId = m.clientId || m.client_id || null;
          const rawB = typeof m.body === "string" ? m.body : "";
          const tagMatch = rawB.match(/\[(photo|image|video|media|voice|audio):([\s\S]+?)\]/i);
          const uuidMatch = (rawB + " " + (m.mediaId || m.media_id || "")).match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          const mediaUuid = uuidMatch ? uuidMatch[1] : null;
          const isVoiceKind = m.kind === "voice" || m.kind === "audio" || (tagMatch && (tagMatch[1].toLowerCase() === "voice" || tagMatch[1].toLowerCase() === "audio")) || rawB.includes("Voice note");

          const preserved =
            mediaMap.get(m.id) ||
            (cId ? mediaMap.get(cId) : null) ||
            (mediaUuid ? mediaMap.get(mediaUuid) : null) ||
            (m.mediaId ? mediaMap.get(m.mediaId) : null) ||
            (m.media_id ? mediaMap.get(m.media_id) : null) ||
            null;

          let localMediaUrl = null;
          try {
            localMediaUrl =
              (mediaUuid ? localStorage.getItem(`jm_media_cache_${mediaUuid}`) : null) ||
              (cId ? localStorage.getItem(`jm_media_cache_${cId}`) : null) ||
              (m.id ? localStorage.getItem(`jm_media_cache_${m.id}`) : null) ||
              (m.mediaId ? localStorage.getItem(`jm_media_cache_${m.mediaId}`) : null) ||
              (m.media_id ? localStorage.getItem(`jm_media_cache_${m.media_id}`) : null);
          } catch {}

          let effectiveMediaUrl = localMediaUrl || m.mediaUrl || m.media_url || (preserved ? preserved.mediaUrl || preserved.media_url : null);
          if (!effectiveMediaUrl && tagMatch) {
            effectiveMediaUrl = mediaService.getRawMediaUrl(tagMatch[2].trim());
          }
          if (!effectiveMediaUrl && (m.mediaId || m.media_id || mediaUuid)) {
            effectiveMediaUrl = mediaService.getRawMediaUrl(m.mediaId || m.media_id || mediaUuid);
          }

          const effectiveKind = isVoiceKind
            ? "voice"
            : (m.kind && m.kind !== "text")
            ? m.kind
            : (tagMatch ? (tagMatch[1].toLowerCase() === "video" ? "video" : "photo") : (preserved?.kind || (effectiveMediaUrl ? (isVoiceKind ? "voice" : "photo") : m.kind)));

          return {
            ...m,
            clientId: cId,
            client_id: cId,
            mediaId: m.mediaId || m.media_id || mediaUuid,
            media_id: m.mediaId || m.media_id || mediaUuid,
            mediaUrl: effectiveMediaUrl,
            media_url: effectiveMediaUrl,
            fileName: m.fileName || preserved?.fileName,
            fileSize: m.fileSize || preserved?.fileSize,
            kind: effectiveKind,
          };
        });

        const unsyncedLocal = prev.filter((p) => {
          if (!p) return false;
          const pConn = p.connectionId || p.connection_id || p.conversationId;
          if (pConn && String(pConn).toLowerCase() !== String(connId).toLowerCase()) {
            return false;
          }
          if (!p.isMine && !p.mine && p.sender !== myId && peerId && p.sender !== peerId) {
            return false;
          }
          return !serverIds.has(p.id) && (!p.clientId || !serverClientIds.has(p.clientId));
        });

        const allMerged = [...mappedServer, ...unsyncedLocal];
        allMerged.sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0));

        if (
          prev.length === allMerged.length &&
          prev.every((p, i) => {
            const n = allMerged[i];
            return (
              p.id === n.id &&
              p.body === n.body &&
              p.reaction === n.reaction &&
              p.reactionCount === n.reactionCount &&
              p.read === n.read &&
              p.mediaUrl === n.mediaUrl &&
              p.isDeletedForEveryone === n.isDeletedForEveryone
            );
          })
        ) {
          return prev;
        }

        return allMerged;
      });

      setConnections((prev) => {
        const target = prev.find((c) => c.id === connId);
        const lastServerMsg = serverItems.length > 0 ? serverItems[serverItems.length - 1] : null;
        if (!target) return prev;
        return prev.map((c) => {
          if (c.id === connId) {
            return {
              ...c,
              unreadCount: 0,
              lastMessage: lastServerMsg || c.lastMessage,
              lastActive: lastServerMsg?.createdAt || lastServerMsg?.created_at || c.lastActive,
            };
          }
          return c;
        });
      });

      const unread = combined.filter((m) => m.sender !== myId && !m.read);
      if (unread.length > 0) {
        const lastId = unread[unread.length - 1].id;
        chatService.markAsRead(connId, lastId).catch(() => {});
        setMessages((prev) =>
          prev.map((m) => (m.sender !== myId ? { ...m, read: true, isRead: true, status: "read" } : m))
        );

        try {
          const bc = new BroadcastChannel("jm_chat_messages_channel");
          const readPayload = {
            type: "MESSAGES_READ",
            tabId: tabIdRef?.current,
            connectionId: connId,
            readerId: myId,
            timestamp: Date.now(),
          };
          bc.postMessage(readPayload);
          localStorage.setItem("jm_last_chat_read", JSON.stringify({ ...readPayload, _salt: Math.random() }));
        } catch {}
      }
    } catch (err) {
      console.warn("Messages load note:", err.message);
    } finally {
      if (!isBackground) {
        setLoadingMsgs(false);
      }
    }
  }, [activeConnId]);

  useEffect(() => {
    const connId = activeConn?.id;
    if (connId) {
      setMessages([]);
      setConnections((prev) => {
        const target = prev.find((c) => c.id === connId);
        if (!target || Number(target.unreadCount) === 0) return prev;
        return prev.map((c) => (c.id === connId ? { ...c, unreadCount: 0 } : c));
      });
      if (isInitialLoadRef) isInitialLoadRef.current = true;
      if (seenMsgIdsRef) seenMsgIdsRef.current = new Set();
      if (prevMsgReactionsRef) prevMsgReactionsRef.current = {};
      if (setIsPeerTyping) setIsPeerTyping(false);

      // Initial immediate load
      loadMessages(false);

      socketService.joinConnection(connId);
      socketService.markAsRead(connId);

      // Zero-polling when WebSocket is active: Socket.io pushes messages, edits, and reactions in real-time
      // Only runs a gentle 30s fallback if the WebSocket connection is offline/disconnected
      const pollTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        if (socketService.isConnected) return;
        loadMessages(true);
      }, 30000);

      // Resync when tab/window regains focus if WebSocket was disconnected
      const handleWindowFocus = () => {
        if (!socketService.isConnected) {
          loadMessages(true);
        }
      };
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("visibilitychange", handleWindowFocus);

      return () => {
        clearInterval(pollTimer);
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("visibilitychange", handleWindowFocus);
        socketService.leaveConnection(connId);
      };
    } else {
      setMessages([]);
    }
  }, [activeConn?.id, loadMessages]);

  return {
    messages,
    setMessages,
    loadingMsgs,
    loadMessages,
  };
}
