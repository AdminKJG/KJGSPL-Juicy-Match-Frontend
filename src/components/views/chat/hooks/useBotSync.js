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
    // ── bot_typing ────────────────────────────────────────────────────────────
    // Spec payload: { conversationId: string, isTyping: boolean }
    // Note: bot engine uses `conversationId`, not `connectionId`
    const unsubBotTyping = socketService.on("bot_typing", (data) => {
      if (!data || !onPeerTypingChange) return;
      const current = activeConnRef.current;
      if (!current?.id) return;

      // Accept both key names the bot engine may send
      const connId = data.conversationId || data.connectionId;
      if (connId === current.id) {
        onPeerTypingChange(Boolean(data.isTyping));
      }
    });

    // ── bot_message ───────────────────────────────────────────────────────────
    // Spec payload: { connectionId, message: ChatMessage }
    // Mirrors `message:received` — treat identically, no special bot UI
    const unsubBotMessage = socketService.on("bot_message", (data) => {
      if (!data) return;
      const current = activeConnRef.current;

      // Normalise: bot engine may send conversationId OR connectionId
      const connId = data.connectionId || data.conversationId || data.connection_id;
      const msgObj = data.message || data;

      // Guard against empty payloads
      if (!msgObj?.id && !msgObj?.clientId && !msgObj?.client_id && !msgObj?.body) return;

      // Only inject into the currently open conversation
      const curId = current?.id || current?.connectionId;
      if (curId && connId && curId !== connId && String(curId).toLowerCase() !== String(connId).toLowerCase()) return;

      const cleanMsg = {
        ...msgObj,
        isMine: false,
        mine: false,
        isReceived: true,
      };

      // Persist locally under the connection key
      const keys = [connId, current?.id].filter(Boolean);
      saveLocalChatMessage(keys, cleanMsg);

      // Inject into message list, deduplicated by id / clientId
      setMessages((prev) => {
        const idx = prev.findIndex(
          (m) =>
            m.id === cleanMsg.id ||
            (cleanMsg.clientId &&
              (m.clientId === cleanMsg.clientId || m.id === cleanMsg.clientId))
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

      // Update sidebar last-message preview
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connId
            ? {
                ...c,
                lastMessage: cleanMsg,
                lastActive: new Date().toISOString(),
              }
            : c
        )
      );
    });

    return () => {
      unsubBotTyping();
      unsubBotMessage();
    };
  }, [setMessages, setConnections, onPeerTypingChange]);
}
