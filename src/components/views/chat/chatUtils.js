// Utility functions and constants for Chat components

export const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    icon: "😀",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇",
      "🙂", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜", "🤪", "😎", "🤓",
      "🧐", "🥳", "😏", "🤤", "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤",
      "😠", "😡", "🤯", "🤫", "🫣", "🫡"
    ]
  },
  {
    id: "love",
    icon: "❤️",
    label: "Love & Hearts",
    emojis: [
      "❤️", "💖", "💝", "💘", "💞", "💕", "💓", "💗", "💌", "💋", "🌹", "💐",
      "✨", "🔥", "💫", "⭐", "🥂", "🍷", "🍾", "🍓", "🍒", "🍫", "🕯️", "💍"
    ]
  },
  {
    id: "gestures",
    icon: "👍",
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘",
      "🤙", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👌",
      "🤌", "🤏"
    ]
  },
  {
    id: "fun",
    icon: "🎉",
    label: "Party & Fun",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🪄", "🪅", "👑", "💎", "🏆", "🥇", "🎯", "🎲",
      "🚀", "🏝️", "🏖️", "✈️", "🌴", "💃", "🕺", "🕶️", "🎶", "🎵", "🎧", "📸"
    ]
  },
];

export const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

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
  if (!msg) return "Tap to chat…";
  if (typeof msg === "string") {
    if (msg.startsWith("[photo:") || msg.toLowerCase().trim() === "photo") return "📷 Photo";
    if (msg.startsWith("[video:") || msg.toLowerCase().trim() === "video") return "🎥 Video";
    return msg;
  }
  if (typeof msg === "object") {
    if (msg.deleted_for_all || msg.isDeletedForEveryone) return "🚫 This message was deleted";
    if (msg.kind === "voice" || msg.media_id || msg.mediaId) return "🎙️ Voice note";
    if (
      msg.kind === "photo" ||
      msg.kind === "gallery" ||
      (typeof msg.body === "string" && (msg.body.startsWith("[photo:") || msg.body.toLowerCase().trim() === "photo"))
    ) return "📷 Photo";
    if (
      msg.kind === "video" ||
      (typeof msg.body === "string" && (msg.body.startsWith("[video:") || msg.body.toLowerCase().trim() === "video"))
    ) return "🎥 Video";
    if (msg.kind === "file") return `📄 ${typeof msg.fileName === "string" ? msg.fileName : typeof msg.body === "string" ? msg.body : "Document"}`;
    if (msg.body) {
      if (typeof msg.body === "string") {
        if (msg.body.startsWith("[photo:") || msg.body.toLowerCase().trim() === "photo") return "📷 Photo";
        if (msg.body.startsWith("[video:") || msg.body.toLowerCase().trim() === "video") return "🎥 Video";
        return msg.body;
      }
      return "Message";
    }
  }
  return "Tap to chat…";
};

export const getPeerOnlineStatus = (peer, lastActive) => {
  if (!peer) return { isOnline: false, text: "Offline", color: "#9ca3af" };
  if (peer.isOnline === true || peer.onlineStatus === "online") {
    return { isOnline: true, text: "Online", color: "#10b981" };
  }
  if (peer.isOnline === false || peer.status === "offline") {
    return { isOnline: false, text: "Offline", color: "#9ca3af" };
  }
  const timestamp = lastActive || peer.lastActive || peer.lastSeen || peer.updatedAt;
  if (timestamp) {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) {
      return { isOnline: true, text: "Online", color: "#10b981" };
    }
    if (diffMins < 60) {
      return { isOnline: false, text: `Active ${diffMins}m ago`, color: "#f59e0b" };
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return { isOnline: false, text: `Active ${diffHours}h ago`, color: "#9ca3af" };
    }
    const diffDays = Math.floor(diffHours / 24);
    return { isOnline: false, text: `Active ${diffDays}d ago`, color: "#9ca3af" };
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

export const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const isWithinTimeLimit = (createdAt, minutes = 15) => {
  if (!createdAt) return true;
  const msgTime = new Date(createdAt).getTime();
  if (isNaN(msgTime) || msgTime <= 0) return true;
  return Date.now() - msgTime <= minutes * 60 * 1000;
};
