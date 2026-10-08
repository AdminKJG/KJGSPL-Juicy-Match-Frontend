import { useEffect, useState, useRef, useCallback } from "react";
import { socketService } from "../services/socketService";
import { getStoredTokens } from "../services/api";

/**
 * useJuicySocket
 * Custom React hook connecting components to real-time WebSockets via socketService.
 */
export function useJuicySocket(activeConnectionId = null) {
  const [isConnected, setIsConnected] = useState(socketService.isConnected);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimerRef = useRef(null);

  // Initialize socket on mount or auth token change
  useEffect(() => {
    const { token } = getStoredTokens();
    if (!token) return;

    socketService.connect(token);

    const unsubConnect = socketService.on("connect", () => setIsConnected(true));
    const unsubDisconnect = socketService.on("disconnect", () => setIsConnected(false));

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  // Room management for active connection
  useEffect(() => {
    if (!activeConnectionId) return;

    socketService.joinConnection(activeConnectionId);

    // Listen for peer typing status in this thread
    const unsubTyping = socketService.on("typing:status", (data) => {
      if (data?.connectionId === activeConnectionId) {
        setIsPeerTyping(Boolean(data.isTyping));

        // Auto-clear typing indicator after 3 seconds if no stop event arrived
        if (data.isTyping) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3500);
        }
      }
    });

    return () => {
      socketService.leaveConnection(activeConnectionId);
      unsubTyping();
      clearTimeout(typingTimerRef.current);
    };
  }, [activeConnectionId]);

  // Send message via WebSocket
  const sendMessage = useCallback(
    async (body, clientId = null, replyToId = null) => {
      if (!activeConnectionId) throw new Error("No active connection ID");
      return await socketService.sendMessage(activeConnectionId, body, clientId, replyToId);
    },
    [activeConnectionId]
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId, body) => {
      if (!activeConnectionId) throw new Error("No active connection ID");
      return await socketService.editMessage(activeConnectionId, messageId, body);
    },
    [activeConnectionId]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId, target = "everyone") => {
      if (!activeConnectionId) throw new Error("No active connection ID");
      return await socketService.deleteMessage(activeConnectionId, messageId, target);
    },
    [activeConnectionId]
  );

  // React to message
  const reactMessage = useCallback(
    (messageId, emoji) => {
      if (!activeConnectionId) return;
      socketService.reactMessage(activeConnectionId, messageId, emoji);
    },
    [activeConnectionId]
  );

  // Mark conversation read
  const markAsRead = useCallback(() => {
    if (!activeConnectionId) return;
    socketService.markAsRead(activeConnectionId);
  }, [activeConnectionId]);

  // Typing notifications
  const startTyping = useCallback(() => {
    if (!activeConnectionId) return;
    socketService.startTyping(activeConnectionId);
  }, [activeConnectionId]);

  const stopTyping = useCallback(() => {
    if (!activeConnectionId) return;
    socketService.stopTyping(activeConnectionId);
  }, [activeConnectionId]);

  return {
    isConnected,
    isPeerTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    reactMessage,
    markAsRead,
    startTyping,
    stopTyping,
    socketService,
  };
}
