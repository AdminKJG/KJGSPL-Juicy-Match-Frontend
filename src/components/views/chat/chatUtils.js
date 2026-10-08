// Utility functions for Chat components

export const formatConversationTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffHours = (now - date) / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 48) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const getLastMessageSnippet = (msg) => {
  if (!msg) return "No messages yet";
  if (typeof msg === "string") return msg;
  if (msg.isDeletedForEveryone) return "🚫 This message was deleted";
  if (msg.type === "voice" || msg.mediaType === "audio") return "🎙️ Voice note";
  if (msg.type === "image" || msg.mediaUrl) return "📷 Photo shared";
  if (msg.type === "call") return `📞 ${msg.body || "Call"}`;
  return msg.body || msg.text || "Message";
};

export const getPeerOnlineStatus = (peer, lastActive) => {
  if (!peer) return { isOnline: false, text: "Offline", color: "#9ca3af" };
  
  if (peer.isOnline === true || peer.onlineStatus === "online") {
    return { isOnline: true, text: "Online", color: "#10b981" };
  }
  
  const timestamp = lastActive || peer.lastActive || peer.lastSeen;
  if (timestamp) {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    
    if (diffMins < 60) {
      return { isOnline: false, text: `Last seen ${diffMins}m ago`, color: "#f59e0b" };
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return { isOnline: false, text: `Last seen ${diffHours}h ago`, color: "#9ca3af" };
    }
    const diffDays = Math.floor(diffHours / 24);
    return { isOnline: false, text: `Last seen ${diffDays}d ago`, color: "#9ca3af" };
  }
  return { isOnline: false, text: "Offline", color: "#9ca3af" };
};

export const getPeerPortraitIndex = (peer) => {
  if (!peer) return 0;
  const idStr = String(peer.id || peer.pseudonym || "0");
  let num = 0;
  for (let i = 0; i < idStr.length; i++) {
    num += idStr.charCodeAt(i);
  }
  return num % 6;
};
