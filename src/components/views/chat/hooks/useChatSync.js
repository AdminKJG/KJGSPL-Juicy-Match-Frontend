import { useEffect, useRef } from "react";
import { saveLocalChatMessage } from "../../../../services/chatService";
import { blobUrlCache } from "../AuthImage";
import { socketService } from "../../../../services/socketService";

export function useChatSync({
  tabId,
  activeConn,
  state,
  connections,
  setMessages,
  setConnections,
  triggerSound,
  triggerEmojiShower,
  onPeerTypingChange,
}) {
  const activeConnRef = useRef(activeConn);
  const connectionsRef = useRef(connections);
  const stateRef = useRef(state);

  useEffect(() => {
    activeConnRef.current = activeConn;
  }, [activeConn]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let channel = null;

    const handleIncomingNewMessage = (data) => {
      if (!data || !data.type) return;

      if (data.tabId && data.tabId === tabId) {
        return;
      }

      if (data.type === "MESSAGE_REACTION") {
        const { messageId, emoji, userId } = data;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId && m.clientId !== messageId) return m;
            let currentReactions = { ...(m.reactions || {}) };
            if (!emoji) {
              if (userId) delete currentReactions[userId];
              return {
                ...m,
                reaction: null,
                reactions: Object.keys(currentReactions).length > 0 ? currentReactions : null,
              };
            } else {
              if (userId) currentReactions[userId] = emoji;
              return { ...m, reaction: emoji, reactions: currentReactions };
            }
          })
        );
        if (emoji && triggerEmojiShower) {
          triggerEmojiShower(emoji, false, messageId);
        }
        return;
      }

      if (data.type === "MESSAGES_READ") {
        const { connectionId, readerId } = data;
        const currentActiveConn = activeConnRef.current;
        const isMatch = connectionId === currentActiveConn?.id || (readerId && currentActiveConn?.peer?.id === readerId);
        if (isMatch) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.isMine || m.mine || m.sender === stateRef.current?.me?.id) {
                return { ...m, read: true, isRead: true, status: "read", isDelivered: true };
              }
              return m;
            })
          );
        }
        return;
      }

      if (data.type === "MESSAGE_DELIVERED") {
        const { connectionId, messageId } = data;
        const currentActiveConn = activeConnRef.current;
        if (connectionId === currentActiveConn?.id) {
          setMessages((prev) =>
            prev.map((m) => {
              if (!messageId || m.id === messageId || m.clientId === messageId) {
                return { ...m, isDelivered: true, status: m.read ? "read" : "delivered" };
              }
              return m;
            })
          );
        }
        return;
      }

      if (data.type !== "NEW_MESSAGE") return;

      const incomingMsg = data.message || data;
      if (!incomingMsg || (!incomingMsg.id && !incomingMsg.clientId && !incomingMsg.client_id && !incomingMsg.body)) return;

      const currentActiveConn = activeConnRef.current;
      const currentState = stateRef.current;
      const currentConnections = connectionsRef.current;

      const myUserId = currentState?.me?.id || currentState?.me?.account?.id || "jm-member-1";
      const activePeerId = currentActiveConn?.peer?.id;
      const activePeerName = (currentActiveConn?.peer?.pseudonym || currentActiveConn?.peer?.name || "").trim().toLowerCase();
      const senderName = (data.senderName || incomingMsg.senderName || "").trim().toLowerCase();
      const recipientName = (data.recipientName || incomingMsg.recipientName || "").trim().toLowerCase();
      const senderId = data.senderId || incomingMsg.sender || incomingMsg.senderId || incomingMsg.sender_id;
      const recipientId = data.recipientId || incomingMsg.recipient || incomingMsg.recipientId || incomingMsg.recipient_id;

      const isFromMe = Boolean(
        (senderId && senderId === myUserId) ||
        (incomingMsg.sender && incomingMsg.sender === myUserId) ||
        incomingMsg.isMine ||
        incomingMsg.mine
      );

      const cleanIncoming = {
        ...incomingMsg,
        isMine: isFromMe,
        mine: isFromMe,
        isReceived: !isFromMe,
      };

      const incomingConnId =
        data.connectionId ||
        data.connection_id ||
        data.conversationId ||
        incomingMsg.connectionId ||
        incomingMsg.connection_id ||
        incomingMsg.conversationId;

      // 1. Persist incoming message locally under all possible keys
      const allKeys = [
        incomingConnId,
        senderId,
        recipientId,
        currentActiveConn?.id,
        currentActiveConn?.connectionId,
        activePeerId ? [myUserId, activePeerId].sort().join("::") : null,
        senderId && recipientId ? [senderId, recipientId].sort().join("::") : null,
        activePeerId,
      ].filter(Boolean);
      saveLocalChatMessage(allKeys, cleanIncoming);

      if (cleanIncoming.mediaUrl) {
        try {
          if (cleanIncoming.id) localStorage.setItem(`jm_media_cache_${cleanIncoming.id}`, cleanIncoming.mediaUrl);
          if (cleanIncoming.clientId) localStorage.setItem(`jm_media_cache_${cleanIncoming.clientId}`, cleanIncoming.mediaUrl);
          if (cleanIncoming.client_id) localStorage.setItem(`jm_media_cache_${cleanIncoming.client_id}`, cleanIncoming.mediaUrl);
          if (cleanIncoming.mediaId) localStorage.setItem(`jm_media_cache_${cleanIncoming.mediaId}`, cleanIncoming.mediaUrl);
          if (cleanIncoming.media_id) localStorage.setItem(`jm_media_cache_${cleanIncoming.media_id}`, cleanIncoming.mediaUrl);
          const bMatch = (typeof cleanIncoming.body === "string" ? cleanIncoming.body : "").match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          if (bMatch && bMatch[1]) {
            localStorage.setItem(`jm_media_cache_${bMatch[1]}`, cleanIncoming.mediaUrl);
          }
          localStorage.setItem("jm_last_media_sent", cleanIncoming.mediaUrl);
          if (cleanIncoming.mediaUrl.startsWith("data:") || cleanIncoming.mediaUrl.startsWith("blob:")) {
            blobUrlCache.set(cleanIncoming.mediaUrl, cleanIncoming.mediaUrl);
          }
        } catch {}
      }

      // 2. Check if this incoming message belongs to current active conversation
      const currentActiveId = currentActiveConn?.id || currentActiveConn?.connectionId || currentActiveConn?.connection_id;
      const isForThisActiveChat = Boolean(
        (incomingConnId && currentActiveId && (incomingConnId === currentActiveId || String(incomingConnId).toLowerCase() === String(currentActiveId).toLowerCase())) ||
        (activePeerId && (senderId === activePeerId || recipientId === activePeerId)) ||
        (activePeerName && (
          (senderName && (activePeerName === senderName || activePeerName.includes(senderName) || senderName.includes(activePeerName))) ||
          (recipientName && (activePeerName === recipientName || activePeerName.includes(recipientName) || recipientName.includes(activePeerName)))
        )) ||
        (currentConnections.length <= 1 && currentActiveConn)
      );

      if (isForThisActiveChat) {
        setMessages((prev) => {
          const isCallEnded = typeof cleanIncoming.body === "string" && (cleanIncoming.body.includes("call · Ended") || cleanIncoming.body.includes("Call · Ended"));
          const lastMsg = prev[prev.length - 1];
          if (isCallEnded && lastMsg && lastMsg.body === cleanIncoming.body) {
            return prev;
          }

          const idx = prev.findIndex(
            (m) =>
              (cleanIncoming.id && m.id === cleanIncoming.id) ||
              (cleanIncoming.clientId && (m.clientId === cleanIncoming.clientId || m.id === cleanIncoming.clientId)) ||
              (cleanIncoming.client_id && (m.clientId === cleanIncoming.client_id || m.client_id === cleanIncoming.client_id))
          );
          let next;
          if (idx >= 0) {
            next = [...prev];
            next[idx] = {
              ...next[idx],
              ...cleanIncoming,
              mediaUrl: cleanIncoming.mediaUrl || next[idx].mediaUrl,
            };
          } else {
            next = [...prev, cleanIncoming];
          }
          next.sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0));
          return next;
        });
        if (!isFromMe && triggerSound) triggerSound();
      }

      // 3. Update connection preview in sidebar
      setConnections((prev) =>
        prev.map((c) => {
          const cId = c.id || c.connectionId || c.connection_id;
          const cPeerId = c.peer?.id;
          const cPeerName = (c.peer?.pseudonym || c.peer?.name || "").trim().toLowerCase();
          const isMatch =
            (incomingConnId && cId === incomingConnId) ||
            (cPeerId && (cPeerId === senderId || cPeerId === recipientId)) ||
            (cPeerName && (
              (senderName && (cPeerName === senderName || senderName.includes(cPeerName) || cPeerName.includes(senderName))) ||
              (recipientName && (cPeerName === recipientName || recipientName.includes(cPeerName) || cPeerName.includes(recipientName)))
            ));

          if (isMatch) {
            return {
              ...c,
              lastMessage: cleanIncoming,
              lastActive: cleanIncoming.createdAt || cleanIncoming.created_at || new Date().toISOString(),
              unreadCount: isForThisActiveChat ? 0 : (c.unreadCount || 0) + (isFromMe ? 0 : 1),
            };
          }
          return c;
        })
      );
    };

    // ── Real-Time Socket.io Event Bindings ─────────────────────────────
    const handleRawSocketMsg = (data) => {
      if (!data) return;
      const msgObj = data.message || data;
      if (!msgObj || (!msgObj.id && !msgObj.clientId && !msgObj.body)) return;
      const connId =
        data.connectionId ||
        data.connection_id ||
        data.conversationId ||
        msgObj.connectionId ||
        msgObj.connection_id;

      handleIncomingNewMessage({
        type: "NEW_MESSAGE",
        connectionId: connId,
        message: msgObj,
        senderId: msgObj.sender || msgObj.senderId || data.senderId,
        senderName: msgObj.senderName || data.senderName,
        recipientId: msgObj.recipient || msgObj.recipientId || data.recipientId,
      });
    };

    const unSockMsg = socketService.on("message:received", handleRawSocketMsg);
    const unSockNewMsg = socketService.on("new_message", handleRawSocketMsg);
    const unSockChatMsg = socketService.on("chat:message", handleRawSocketMsg);
    const unSockChatMsgDash = socketService.on("chat_message", handleRawSocketMsg);
    const unSockMsgRaw = socketService.on("message", handleRawSocketMsg);
    const unSockReceiveMsg = socketService.on("receive_message", handleRawSocketMsg);
    const unSockBotMsg = socketService.on("bot_message", handleRawSocketMsg);
    const unSockNotifMsg = socketService.on("notification:new_message", handleRawSocketMsg);

    const unSockUpd = socketService.on("message:updated", (data) => {
      const msg = data?.message || data;
      if (msg && (msg.id || msg.clientId)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id || m.clientId === msg.id || (msg.clientId && m.clientId === msg.clientId)
              ? { ...m, ...msg }
              : m
          )
        );
      }
    });

    const unSockDel = socketService.on("message:deleted", (data) => {
      const messageId = data?.messageId || data?.id;
      if (messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId && m.clientId !== messageId));
      }
    });

    const unSockReact = socketService.on("message:reaction_updated", (data) => {
      handleIncomingNewMessage({
        type: "MESSAGE_REACTION",
        messageId: data?.messageId,
        emoji: data?.emoji,
        userId: data?.userId,
        reactions: data?.reactions,
      });
    });

    const unSockSeen = socketService.on("message:seen", (data) => {
      handleIncomingNewMessage({
        type: "MESSAGES_READ",
        connectionId: data?.connectionId,
        readerId: data?.readBy,
      });
    });

    const unSockTyping = socketService.on("typing:status", (data) => {
      if (onPeerTypingChange && data) {
        const currentActive = activeConnRef.current;
        if (data.connectionId === currentActive?.id || (data.userId && data.userId === currentActive?.peer?.id)) {
          onPeerTypingChange(Boolean(data.isTyping));
        }
      }
    });

    try {
      channel = new BroadcastChannel("jm_chat_messages_channel");
      channel.onmessage = (event) => {
        handleIncomingNewMessage(event.data);
      };
    } catch {}

    const handleStorageMsg = (e) => {
      if ((e.key === "jm_last_chat_message" || e.key === "jm_last_chat_read" || e.key === "jm_last_chat_delivered") && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handleIncomingNewMessage(data);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageMsg);

    return () => {
      if (channel) {
        try { channel.close(); } catch {}
      }
      window.removeEventListener("storage", handleStorageMsg);
      unSockMsg();
      unSockNewMsg();
      unSockChatMsg();
      unSockChatMsgDash();
      unSockMsgRaw();
      unSockReceiveMsg();
      unSockBotMsg();
      unSockNotifMsg();
      unSockUpd();
      unSockDel();
      unSockReact();
      unSockSeen();
      unSockTyping();
    };
  }, [tabId, setMessages, setConnections, triggerSound, triggerEmojiShower, onPeerTypingChange]);
}
