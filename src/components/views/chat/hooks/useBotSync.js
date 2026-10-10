/**
 * useBotSync.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated hook for bot-peer socket event integration.
 *
 * Responsibility:
 *   • Listen to `bot_typing`  → forward to the same `onPeerTypingChange` used
 *     by human peers (keeps UI identical — no special bot treatment).
 *   • Listen to `bot_message` → normalise payload and inject into the shared
 *     message list exactly like a human `message:received` event.
 *
 * This hook has NO awareness of `isBot` — the chat UI stays completely
 * transparent. If the backend stops sending these aliases the app degrades
 * gracefully (the same message also arrives via `message:received`).
 *
 * Per spec §5.3 of CHAT_AND_BOT_API_SPECIFICATION.md v2.5.0
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import { socketService } from "../../../../services/socketService";
import { saveLocalChatMessage } from "../../../../services/chatService";

/**
 * @param {object}   params
 * @param {object|null} params.activeConn          Currently active connection object
 * @param {Function} params.setMessages            React state setter for messages array
 * @param {Function} params.setConnections         React state setter for connections array
 * @param {Function} params.onPeerTypingChange     (isTyping: boolean) => void
 */
export function useBotSync({
  activeConn,
  setMessages,
  setConnections,
  onPeerTypingChange,
}) {
  // Stable ref so socket callbacks always read the latest activeConn
  const activeConnRef = useRef(activeConn);
  useEffect(() => {
    activeConnRef.current = activeConn;
  }, [activeConn]);

  useEffect(() => {
    const typingTimerRef = { current: null };

    // ── bot_typing ────────────────────────────────────────────────────────────
    // Spec payload: { conversationId: string, isTyping: boolean }
    const unsubBotTyping = socketService.on("bot_typing", (data) => {
      if (!data || !onPeerTypingChange) return;
      const current = activeConnRef.current;
      if (!current?.id) return;

      const connId = data.conversationId || data.connectionId || data.connection_id;
      const curId = current.id || current.connectionId;
      if (connId && curId && String(connId).toLowerCase() === String(curId).toLowerCase()) {
        const isTyping = Boolean(data.isTyping);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        onPeerTypingChange(isTyping);
        if (isTyping) {
          // Safety timeout to prevent stuck typing indicator if backend drops
          typingTimerRef.current = setTimeout(() => {
            onPeerTypingChange(false);
          }, 15000);
        }
      }
    });

    // ── bot_message ───────────────────────────────────────────────────────────
    // Spec payload: { connectionId, message: ChatMessage }
    const unsubBotMessage = socketService.on("bot_message", (data) => {
      if (!data) return;
      const current = activeConnRef.current;

      const connId = data.connectionId || data.conversationId || data.connection_id;
      const msgObj = data.message || data;

      if (!msgObj?.id && !msgObj?.clientId && !msgObj?.client_id && !msgObj?.body) return;

      const curId = current?.id || current?.connectionId;
      const isForActiveChat = Boolean(
        curId && connId && String(curId).toLowerCase() === String(connId).toLowerCase()
      );

      // When bot message arrives, clear typing bubble immediately
      if (isForActiveChat) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (onPeerTypingChange) onPeerTypingChange(false);
      }

      const cleanMsg = {
        ...msgObj,
        connectionId: connId || msgObj.connectionId,
        connection_id: connId || msgObj.connection_id,
        isMine: false,
        mine: false,
        isReceived: true,
      };

      // Persist locally under its connection key ONLY
      if (connId) {
        saveLocalChatMessage([connId], cleanMsg);
      }

      // Only inject into the message list if this belongs to the active conversation
      if (isForActiveChat) {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              (cleanMsg.id && m.id === cleanMsg.id) ||
              (cleanMsg.clientId && (m.clientId === cleanMsg.clientId || m.id === cleanMsg.clientId)) ||
              (cleanMsg.client_id && (m.clientId === cleanMsg.client_id || m.client_id === cleanMsg.client_id))
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              ...cleanMsg,
              mediaUrl: cleanMsg.mediaUrl || updated[idx].mediaUrl,
            };
            return updated;
          }
          const merged = [...prev, cleanMsg];
          merged.sort(
            (a, b) =>
              new Date(a.createdAt || a.created_at || 0) -
              new Date(b.createdAt || b.created_at || 0)
          );
          return merged;
        });
      }

      // Update sidebar last-message preview for the bot connection
      if (connId) {
        setConnections((prev) =>
          prev.map((c) => {
            const cId = c.id || c.connectionId || c.connection_id;
            if (cId && String(cId).toLowerCase() === String(connId).toLowerCase()) {
              return {
                ...c,
                lastMessage: cleanMsg,
                lastActive: new Date().toISOString(),
                unreadCount: isForActiveChat ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          })
        );
      }
    });

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      unsubBotTyping();
      unsubBotMessage();
    };
  }, [setMessages, setConnections, onPeerTypingChange]);
}
