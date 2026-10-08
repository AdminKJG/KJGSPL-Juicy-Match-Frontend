import React, { useState, useEffect, useRef } from "react";
import "../../../styles/chat.css";
import Icon from "../../common/Icon";
import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ContactDrawer from "./ContactDrawer";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { chatService, saveLocalChatMessage, getLocalChatStore } from "../../../services/chatService";
import { callsService } from "../../../services/callsService";
import { mediaService } from "../../../services/mediaService";
import { aiService } from "../../../services/aiService";
import { blockService } from "../../../services/blockService";
import { getCurrentUserIdFromToken } from "../../../services/api";
import {
  formatDate,
  formatMessageTime,
  formatConversationTime,
  portraitClass,
  getPeerPortraitIndex,
  getEmojiMessageInfo,
} from "../../../utils/formatters";

const EMOJI_CATEGORIES = [
  { id: "smileys", icon: "😀", label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜", "🤪", "😎", "🤓", "🧐", "🥳", "😏", "🤤", "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "🤫", "🫣", "🫡"] },
  { id: "love", icon: "❤️", label: "Love & Hearts", emojis: ["❤️", "💖", "💝", "💘", "💞", "💕", "💓", "💗", "💌", "💋", "🌹", "💐", "✨", "🔥", "💫", "⭐", "🥂", "🍷", "🍾", "🍓", "🍒", "🍫", "🕯️", "💍"] },
  { id: "gestures", icon: "👍", label: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏"] },
  { id: "fun", icon: "🎉", label: "Party & Fun", emojis: ["🎉", "🎊", "🎈", "🎁", "🪄", "🪅", "👑", "💎", "🏆", "🥇", "🎯", "🎲", "🚀", "🏝️", "🏖️", "✈️", "🌴", "💃", "🕺", "🕶️", "🎶", "🎵", "🎧", "📸"] },
];

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const getLastMessageSnippet = (msg) => {
  if (!msg) return "Tap to chat…";
  if (typeof msg === "string") {
    if (msg.startsWith("[photo:") || msg.toLowerCase().trim() === "photo") return "📷 Photo";
    if (msg.startsWith("[video:") || msg.toLowerCase().trim() === "video") return "🎥 Video";
    return msg;
  }
  if (typeof msg === "object") {
    if (msg.deleted_for_all || msg.isDeletedForEveryone) return "🚫 This message was deleted";
    if (msg.kind === "voice" || msg.media_id || msg.mediaId) return "🎙️ Voice note";
    if (msg.kind === "photo" || msg.kind === "gallery" || (typeof msg.body === "string" && (msg.body.startsWith("[photo:") || msg.body.toLowerCase().trim() === "photo"))) return "📷 Photo";
    if (msg.kind === "video" || (typeof msg.body === "string" && (msg.body.startsWith("[video:") || msg.body.toLowerCase().trim() === "video"))) return "🎥 Video";
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

const blobUrlCache = new Map();

const DEMO_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
];

function AuthImage({ src, alt, onClick, className, style }) {
  const isDirect = Boolean(src && (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")));
  const [fallbackIndex] = useState(() => Math.floor(Math.random() * DEMO_FALLBACK_IMAGES.length));
  const [imgSrc, setImgSrc] = useState(() => {
    if (!src) return DEMO_FALLBACK_IMAGES[fallbackIndex];
    if (isDirect) return src;
    return blobUrlCache.get(src) || null;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImgSrc(DEMO_FALLBACK_IMAGES[fallbackIndex]);
      setHasError(false);
      return;
    }

    if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) {
      setImgSrc(src);
      setHasError(false);
      return;
    }

    if (blobUrlCache.has(src)) {
      setImgSrc(blobUrlCache.get(src));
      setHasError(false);
      return;
    }

    let active = true;
    mediaService.fetchMediaBlobUrl(src).then((blobUrl) => {
      if (!active) return;
      if (blobUrl && (blobUrl.startsWith("blob:") || blobUrl.startsWith("data:") || blobUrl.startsWith("http"))) {
        blobUrlCache.set(src, blobUrl);
        setImgSrc(blobUrl);
        setHasError(false);
      } else {
        setImgSrc(DEMO_FALLBACK_IMAGES[fallbackIndex]);
        setHasError(false);
      }
    }).catch(() => {
      if (!active) return;
      setImgSrc(DEMO_FALLBACK_IMAGES[fallbackIndex]);
      setHasError(false);
    });

    return () => {
      active = false;
    };
  }, [src, fallbackIndex]);

  const displaySrc = (hasError || !imgSrc) ? DEMO_FALLBACK_IMAGES[fallbackIndex] : imgSrc;

  return (
    <img
      src={displaySrc}
      alt={alt || "Shared photo"}
      className={className}
      loading="lazy"
      onClick={onClick}
      style={{
        cursor: onClick ? "zoom-in" : "default",
        width: "100%",
        maxWidth: "260px",
        maxHeight: "240px",
        borderRadius: "14px",
        objectFit: "cover",
        display: "block",
        ...style,
      }}
      onError={() => {
        setHasError(true);
      }}
    />
  );
}

export default function ChatView({ connectionId: propConnectionId }) {
  const {
    state,
    navigate,
    openModal,
    closeModal,
    showToast,
    triggerSound,
    startCall,
    activeCall,
    setActiveCall,
    switchDemoActor,
    blockMember,
  } = useApp();

  // Conversations / Contacts State
  const [connections, setConnections] = useState([]);
  const [selectedConnId, setSelectedConnId] = useState(propConnectionId || null);
  const [loadingConns, setLoadingConns] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | 'active'

  // Find currently active connection
  const activeConn =
    connections.find((c) => c.id === selectedConnId) ||
    state.connections?.find((c) => c.id === selectedConnId) ||
    (connections.length > 0 ? connections[0] : null);

  // Dynamic peer online status calculation
  const getPeerOnlineStatus = (peer, lastActive) => {
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
    // Default fallback if no online status or timestamp is provided by API
    return { isOnline: false, text: "Offline", color: "#9ca3af" };
  };

  // Filtered connections list according to search and active tab
  const filteredConnections = connections.filter((conn) => {
    if (!conn) return false;
    const name = conn.peer?.pseudonym || conn.peer?.name || conn.pseudonym || "Match";
    const lastMsg = getLastMessageSnippet(conn.lastMessage);
    const matchesQuery =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (activeTab === "unread") {
      return (Number(conn.unreadCount) || 0) > 0;
    }
    if (activeTab === "active") {
      return conn.state === "active" || conn.status === "active";
    }
    return true;
  });

  // Active Chat Message State
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputBody, setInputBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editBody, setEditBody] = useState("");

  // Attachment & Media Popups
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [activeEmojiCat, setActiveEmojiCat] = useState("smileys");
  const [pendingAttachment, setPendingAttachment] = useState(null); // { type, file, previewUrl, name, size, mediaKind }

  // 3-Dot Active Dropdown & Reaction Drawers
  const [openDropdownMsgId, setOpenDropdownMsgId] = useState(null);
  const [openReactionMsgId, setOpenReactionMsgId] = useState(null);
  const [openFullReactionMsgId, setOpenFullReactionMsgId] = useState(null);
  const [activeReactCat, setActiveReactCat] = useState("smileys");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);

  // Telegram-style Floating Emoji Shower Particles (Hearts ❤️, Roses 🌹, Flowers 🌷🌸, Love 💖💕)
  const [floatingParticles, setFloatingParticles] = useState([]);
  const broadcastChannelRef = useRef(null);
  const seenMsgIdsRef = useRef(new Set());
  const prevMsgReactionsRef = useRef({});
  const isInitialLoadRef = useRef(true);
  const lastShowerTimeRef = useRef(0);
  const processedNoncesRef = useRef(new Set());
  const mySentClientIdsRef = useRef(new Set());

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("jm_my_sent_client_ids");
      if (saved) {
        JSON.parse(saved).forEach((id) => mySentClientIdsRef.current.add(id));
      }
    } catch {}
  }, []);

  const markAsMySentMessage = (id) => {
    if (!id) return;
    mySentClientIdsRef.current.add(id);
    try {
      sessionStorage.setItem("jm_my_sent_client_ids", JSON.stringify([...mySentClientIdsRef.current]));
    } catch {}
  };

  const broadcastEmojiEvent = (emojiStr, messageId = null, action = "shower") => {
    const nonce = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    processedNoncesRef.current.add(nonce);

    const payload = {
      connectionId: activeConn?.id,
      messageId: messageId,
      emoji: String(emojiStr || "❤️"),
      action: action,
      timestamp: Date.now(),
      nonce: nonce,
    };

    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(payload);
      }
    } catch (e) {}

    try {
      localStorage.removeItem("jm_emoji_effects_event");
      localStorage.setItem("jm_emoji_effects_event", JSON.stringify(payload));
    } catch (e) {}
  };

  const triggerEmojiShower = (emoji = "❤️", shouldBroadcast = true, messageId = null) => {
    const now = Date.now();
    // Debounce to ensure animation only triggers once per interaction
    if (now - lastShowerTimeRef.current < 1600) {
      return;
    }
    lastShowerTimeRef.current = now;

    triggerSound();

    const str = String(emoji || "❤️");
    // Romantic & Expressive Palettes
    let palette = [
      "❤️", "💖", "💕", "💓", "💗", "💝", "💘", "💞", "🌹", "🌷", "🌸", "💐", "✨", "💌", "🤍",
    ];

    if (str.includes("🔥") || str.includes("⚡") || str.includes("💥")) {
      palette = ["🔥", "💥", "⚡", "✨", "🌟", "🎇", "🧡"];
    } else if (str.includes("😂") || str.includes("🤣") || str.includes("😆") || str.includes("😅")) {
      palette = ["😂", "🤣", "✨", "💛", "😆", "🎉", "😹"];
    } else if (str.includes("👍") || str.includes("👏") || str.includes("🙌") || str.includes("💯")) {
      palette = ["👍", "👏", "🙌", "✨", "💯", "🎉", "⭐", "💪"];
    } else if (str.includes("🎉") || str.includes("🥳") || str.includes("🎊") || str.includes("🎈")) {
      palette = ["🎉", "🥳", "🎊", "✨", "🎈", "🍾", "🎁"];
    } else if (str.includes("😍") || str.includes("🥰") || str.includes("😘") || str.includes("💋")) {
      palette = ["😍", "🥰", "😘", "💋", "❤️", "💖", "💕", "🌹", "✨"];
    } else if (str.includes("😮") || str.includes("😲") || str.includes("🤯")) {
      palette = ["😮", "😲", "🤯", "✨", "💫", "⭐"];
    } else if (str.includes("😢") || str.includes("😭") || str.includes("🥺")) {
      palette = ["😢", "😭", "🥺", "💧", "💔", "🩹"];
    } else {
      try {
        const emojiMatch = str.match(/(\p{Extended_Pictographic})/u) || str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/u);
        if (emojiMatch && emojiMatch[0]) {
          palette = [emojiMatch[0], emojiMatch[0], "✨", "💖", "⭐", emojiMatch[0]];
        }
      } catch (e) {}
    }

    const count = 46;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: `p-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      emoji: palette[Math.floor(Math.random() * palette.length)],
      left: Math.floor(Math.random() * 90 + 5), // 5% to 95% across chat canvas
      size: Math.floor(Math.random() * 26 + 26), // 26px to 52px
      delay: (Math.random() * 0.9).toFixed(2), // 0 to 0.9s staggered launch
      duration: (Math.random() * 1.5 + 3.8).toFixed(2), // 3.8s to 5.3s (Gentle & Slow float)
      sway: Math.floor(Math.random() * 80 - 40), // -40px to +40px
      scale: (Math.random() * 0.5 + 0.8).toFixed(2),
    }));

    setFloatingParticles((prev) => [...prev, ...newParticles]);

    // Broadcast to Receiver side so receiver window/tab/device also sees the animation
    if (shouldBroadcast && activeConn?.id) {
      broadcastEmojiEvent(str, messageId, "shower");
    }

    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 6200);
  };

  // Remote Emoji Effect Trigger: Animate the specific message bubble on receiver's screen + launch shower
  const triggerRemoteEmojiEffect = (msgId, emojiStr, nonce = null) => {
    if (nonce) {
      if (processedNoncesRef.current.has(nonce)) return;
      processedNoncesRef.current.add(nonce);
    }

    if (msgId) {
      const applyPop = () => {
        const el = document.querySelector(
          `[data-msg-id="${msgId}"] .wa-emoji-single-content, [data-msg-id="${msgId}"] .wa-emoji-few-content, [data-msg-id="${msgId}"] .wa-reactions-badge`
        );
        if (el) {
          el.classList.remove("pop-again");
          void el.offsetWidth;
          el.classList.add("pop-again");
        }
      };
      setTimeout(applyPop, 50);
      setTimeout(applyPop, 220);
    }
    triggerEmojiShower(emojiStr, false, msgId);
  };

  // Telegram-style Interactive Emoji Click (Clicking emoji animates locally AND remotely on receiver's screen)
  const handleEmojiClickOnBubble = async (msg, emojiStr, event) => {
    if (event) {
      event.stopPropagation();
      event.currentTarget.classList.remove("pop-again");
      void event.currentTarget.offsetWidth;
      event.currentTarget.classList.add("pop-again");
    }

    // 1. Play local shower animation (which also broadcasts to receiver)
    triggerEmojiShower(emojiStr, true, msg.id);

    if (activeConn?.id) {
      // 2. Send reaction / sync to backend so remote devices receive it via polling
      try {
        await chatService.addReaction(activeConn.id, msg.id, emojiStr);
      } catch (err) {}

      // 3. Update local message reaction count
      setMessages((prev) =>
        prev.map((item) =>
          item.id === msg.id
            ? {
                ...item,
                reaction: item.reaction || emojiStr,
                reactionCount: (Number(item.reactionCount) || 0) + 1,
                lastReactedAt: Date.now(),
              }
            : item
        )
      );
    }
  };

  // Listen for broadcasted animations from receiver / sender across BroadcastChannel & localStorage
  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel("jm_emoji_effects");
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data?.emoji) {
          triggerRemoteEmojiEffect(event.data.messageId, event.data.emoji, event.data.nonce);
        }
      };
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === "jm_emoji_effects_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.emoji) {
            triggerRemoteEmojiEffect(data.messageId, data.emoji, data.nonce);
          }
        } catch (err) {}
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch (e) {}
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Lightbox Preview
  const [lightboxImage, setLightboxImage] = useState(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioElementsRef = useRef({});

  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Hidden File Inputs
  const galleryInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const textInputRef = useRef(null);
  const logRef = useRef(null);
  const smartSuggestionIndexRef = useRef(0);

  // 1. Fetch Conversations / Connections List
  const loadConnections = async () => {
    setLoadingConns(true);
    try {
      const res = await chatService.getConnections();
      const list = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
      const blocked = blockService.getBlockedMemberIds();
      // Filter out any blocked peers or connections
      const cleanList = list.filter(
        (c) =>
          !blocked.includes(String(c.peer?.id)) &&
          !blocked.includes(String(c.id)) &&
          c.status !== "blocked"
      );
      // Retain state.connections as fallback if backend returns empty list (e.g. newly matched or offline demo)
      const fallbackConns = state.connections && state.connections.length > 0 ? state.connections : [];
      const finalConnections = cleanList.length > 0 ? cleanList : fallbackConns;

      setConnections(finalConnections);
      if (finalConnections.length > 0 && (!selectedConnId || !finalConnections.some((c) => c.id === selectedConnId))) {
        setSelectedConnId(finalConnections[0].id);
      } else if (finalConnections.length === 0) {
        setSelectedConnId(null);
      }
    } catch (err) {
      console.warn("Connections error:", err.message);
      const fallbackConns = state.connections && state.connections.length > 0 ? state.connections : [];
      setConnections(fallbackConns);
      if (fallbackConns.length > 0 && !selectedConnId) {
        setSelectedConnId(fallbackConns[0].id);
      }
    } finally {
      setLoadingConns(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  // Listen for block events across tabs/windows to immediately remove blocked connection
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel("jm_block_channel");
      channel.onmessage = (e) => {
        if (e.data?.targetId) {
          const tId = String(e.data.targetId);
          setConnections((prev) => {
            const next = prev.filter((c) => String(c.peer?.id) !== tId && String(c.id) !== tId);
            if (activeConn && (String(activeConn.peer?.id) === tId || String(activeConn.id) === tId)) {
              setSelectedConnId(next[0]?.id || null);
            }
            return next;
          });
        }
      };
    } catch {}
    return () => {
      if (channel) channel.close();
    };
  }, [activeConn]);

  useEffect(() => {
    if (propConnectionId) {
      setSelectedConnId(propConnectionId);
    }
  }, [propConnectionId]);

  // Unique Tab Instance ID so tabs don't filter out other tabs
  const tabIdRef = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  // 2. Fetch Messages for Active Connection (Silent background polling & local sync)
  const loadMessages = async (isBackground = false) => {
    if (!activeConn?.id) {
      setMessages([]);
      return;
    }
    if (!isBackground) {
      setLoadingMsgs(true);
    }

    try {
      const tokenUid = (typeof getCurrentUserIdFromToken === "function" ? getCurrentUserIdFromToken() : "") || "";
      const myId = state.me?.id || state.me?.account?.id || tokenUid || "me";
      const peerId = activeConn.peer?.id;
      const res = await chatService.getMessages(activeConn.id, peerId, myId).catch(() => null);
      const list = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || res?.messages || []);

      // Always check if local messages exist in AppContext state or localStorage
      let localStateMsgs = state.messages?.[activeConn.id] || [];
      try {
        const saved = localStorage.getItem("juicy_match_state_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.messages?.[activeConn.id])) {
            localStateMsgs = parsed.messages[activeConn.id];
          }
        }
      } catch {}

      const combined = [...list];
      if (localStateMsgs.length > 0) {
        localStateMsgs.forEach((lm) => {
          if (!combined.some((cm) => cm.id === lm.id || (lm.clientId && cm.clientId === lm.clientId))) {
            combined.push(lm);
          }
        });
      }

      combined.forEach((m) => {
        seenMsgIdsRef.current.add(m.id);
        if (m.reaction) {
          prevMsgReactionsRef.current[m.id] = m.reaction;
        }
      });
      isInitialLoadRef.current = false;

      setMessages((prev) => {
        const serverIds = new Set(combined.map((m) => m.id));
        const serverClientIds = new Set(combined.map((m) => m.clientId || m.client_id).filter(Boolean));

        const mediaMap = new Map();
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

        // Also pull cached media from local persistent store
        try {
          const store = getLocalChatStore();
          const connStore = [
            ...(store[activeConn.id] || []),
            ...(peerId ? (store[[myId, peerId].sort().join("::")] || []) : []),
            ...(peerId ? (store[peerId] || []) : []),
          ];
          connStore.forEach((p) => {
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
          const tagMatch = rawB.match(/\[(photo|image|video|media):([\s\S]+?)\]/i);
          const uuidMatch = (rawB + " " + (m.mediaId || m.media_id || "")).match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          const mediaUuid = uuidMatch ? uuidMatch[1] : null;

          const preserved =
            mediaMap.get(m.id) ||
            (cId ? mediaMap.get(cId) : null) ||
            (mediaUuid ? mediaMap.get(mediaUuid) : null) ||
            (m.mediaId ? mediaMap.get(m.mediaId) : null) ||
            (m.media_id ? mediaMap.get(m.media_id) : null) ||
            null;

          // Check localStorage directly for cached photo data strictly matching THIS message's UUID, cId, or ID
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

          const effectiveKind = (m.kind && m.kind !== "text")
            ? m.kind
            : (tagMatch ? (tagMatch[1].toLowerCase() === "video" ? "video" : "photo") : (preserved?.kind || (effectiveMediaUrl ? "photo" : m.kind)));

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

        // Retain any real-time or unsynced local messages from previous state
        const unsyncedLocal = prev.filter(
          (p) => !serverIds.has(p.id) && (!p.clientId || !serverClientIds.has(p.clientId))
        );

        const allMerged = [...mappedServer, ...unsyncedLocal];
        allMerged.sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0));

        // Prevent UI flicker / re-render blink when message list content has not changed
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

      // Clear unread badge for the currently active connection
      setConnections((prev) =>
        prev.map((c) => (c.id === activeConn.id ? { ...c, unreadCount: 0 } : c))
      );

      const unread = combined.filter((m) => m.sender !== state.me?.id && !m.read);
      if (unread.length > 0) {
        const lastId = unread[unread.length - 1].id;
        chatService.markAsRead(activeConn.id, lastId).catch(() => {});
        // Mark local messages as read so polling doesn't repeatedly invoke markAsRead
        setMessages((prev) =>
          prev.map((m) => (m.sender !== state.me?.id ? { ...m, read: true } : m))
        );
      }
    } catch (err) {
      console.warn("Messages load note:", err.message);
    } finally {
      if (!isBackground) {
        setLoadingMsgs(false);
      }
    }
  };

  useEffect(() => {
    if (activeConn?.id) {
      setConnections((prev) =>
        prev.map((c) => (c.id === activeConn.id ? { ...c, unreadCount: 0 } : c))
      );
      isInitialLoadRef.current = true;
      seenMsgIdsRef.current = new Set();
      prevMsgReactionsRef.current = {};
      loadMessages(false);
      setReplyTo(null);
      setPendingAttachment(null);
      setEditingMsgId(null);
      setOpenDropdownMsgId(null);
      setShowAttachMenu(false);
      setShowEmojiDrawer(false);
    }
  }, [activeConn?.id]);

  // Smart visibility-aware polling for real-time incoming messages:
  // - Polls every 5s when tab is active/visible
  // - Automatically pauses when tab is hidden/minimized to save bandwidth & prevent spam
  // - Triggers an immediate refresh when returning to tab
  useEffect(() => {
    if (!activeConn?.id) return;

    let pollInterval = null;

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        if (!document.hidden) {
          loadMessages(true);
        }
      }, 1500);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } else {
        loadMessages(true);
        startPolling();
      }
    };

    if (!document.hidden) {
      startPolling();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeConn?.id]);


  // Real-time Instant Cross-tab / Multi-user Message Sync (BroadcastChannel + LocalStorage)
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel("jm_chat_messages_channel");
      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type || data.type !== "NEW_MESSAGE") return;

        // Ignore messages originating from THIS exact tab instance
        if (data.tabId && data.tabId === tabIdRef.current) {
          return;
        }

        const incomingMsg = data.message;
        if (!incomingMsg) return;

        const myUserId = state.me?.id || "jm-member-1";
        const myUserName = (state.me?.profile?.pseudonym || "").trim().toLowerCase();
        const activePeerId = activeConn?.peer?.id;
        const activePeerName = (activeConn?.peer?.pseudonym || "").trim().toLowerCase();
        const senderName = (data.senderName || "").trim().toLowerCase();
        const recipientName = (data.recipientName || "").trim().toLowerCase();
        const senderId = data.senderId || incomingMsg.sender;
        const recipientId = data.recipientId;

        // Mark incoming message as theirs on this receiving tab
        const cleanIncoming = {
          ...incomingMsg,
          isMine: false,
          mine: false,
          isReceived: true,
        };

        // 1. ALWAYS persist incoming message locally under all possible keys
        const allKeys = [
          data.connectionId,
          senderId,
          recipientId,
          activeConn?.id,
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
        const isForThisActiveChat = Boolean(
          (data.connectionId && activeConn?.id && data.connectionId === activeConn.id) ||
          (activePeerId && (senderId === activePeerId || recipientId === activePeerId)) ||
          (activePeerName && (
            activePeerName === senderName ||
            activePeerName === recipientName ||
            activePeerName.includes(senderName) ||
            senderName.includes(activePeerName)
          )) ||
          (connections.length <= 1 && activeConn)
        );

        if (isForThisActiveChat) {
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) =>
                m.id === cleanIncoming.id ||
                (cleanIncoming.clientId && (m.clientId === cleanIncoming.clientId || m.id === cleanIncoming.clientId))
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
          triggerSound();
        }

        // 3. Update connection preview in sidebar
        setConnections((prev) =>
          prev.map((c) => {
            const cPeerId = c.peer?.id;
            const cPeerName = (c.peer?.pseudonym || "").trim().toLowerCase();
            const isMatch =
              c.id === data.connectionId ||
              (cPeerId && (cPeerId === senderId || cPeerId === recipientId)) ||
              (cPeerName && (
                cPeerName === senderName ||
                cPeerName === recipientName ||
                senderName.includes(cPeerName) ||
                recipientName.includes(cPeerName)
              ));

            if (isMatch) {
              return {
                ...c,
                lastMessage: cleanIncoming,
                lastActive: new Date().toISOString(),
                unreadCount: isForThisActiveChat ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          })
        );
      };
    } catch {}

    const handleStorageMsg = (e) => {
      if (e.key === "jm_last_chat_message" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (!data || !data.type || data.type !== "NEW_MESSAGE") return;

          if (data.tabId && data.tabId === tabIdRef.current) {
            return;
          }

          const incomingMsg = data.message;
          if (!incomingMsg) return;

          const myUserId = state.me?.id || "jm-member-1";
          const myUserName = (state.me?.profile?.pseudonym || "").trim().toLowerCase();
          const activePeerId = activeConn?.peer?.id;
          const activePeerName = (activeConn?.peer?.pseudonym || "").trim().toLowerCase();
          const senderName = (data.senderName || "").trim().toLowerCase();
          const recipientName = (data.recipientName || "").trim().toLowerCase();
          const senderId = data.senderId || incomingMsg.sender;
          const recipientId = data.recipientId;

          const cleanIncoming = {
            ...incomingMsg,
            isMine: false,
            mine: false,
            isReceived: true,
          };

          const allKeys = [
            data.connectionId,
            senderId,
            recipientId,
            activeConn?.id,
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

          const isForThisActiveChat = Boolean(
            (data.connectionId && activeConn?.id && data.connectionId === activeConn.id) ||
            (activePeerId && (senderId === activePeerId || recipientId === activePeerId)) ||
            (activePeerName && (
              activePeerName === senderName ||
              activePeerName === recipientName ||
              activePeerName.includes(senderName) ||
              senderName.includes(activePeerName)
            )) ||
            (connections.length <= 1 && activeConn)
          );

          if (isForThisActiveChat) {
            setMessages((prev) => {
              const idx = prev.findIndex(
                (m) =>
                  m.id === cleanIncoming.id ||
                  (cleanIncoming.clientId && (m.clientId === cleanIncoming.clientId || m.id === cleanIncoming.clientId))
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
            triggerSound();
          }

          setConnections((prev) =>
            prev.map((c) => {
              const cPeerId = c.peer?.id;
              const cPeerName = (c.peer?.pseudonym || "").trim().toLowerCase();
              const isMatch =
                c.id === data.connectionId ||
                (cPeerId && (cPeerId === senderId || cPeerId === recipientId)) ||
                (cPeerName && (
                  cPeerName === senderName ||
                  cPeerName === recipientName ||
                  senderName.includes(cPeerName) ||
                  recipientName.includes(cPeerName)
                ));

              if (isMatch) {
                return {
                  ...c,
                  lastMessage: cleanIncoming,
                  lastActive: new Date().toISOString(),
                  unreadCount: isForThisActiveChat ? 0 : (c.unreadCount || 0) + 1,
                };
              }
              return c;
            })
          );
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageMsg);

    return () => {
      if (channel) {
        try { channel.close(); } catch {}
      }
      window.removeEventListener("storage", handleStorageMsg);
    };
  }, [activeConn?.id, activeConn?.peer?.id, activeConn?.peer?.pseudonym]);

  // Smart Auto-scroll: Only scroll to bottom if user is near bottom or on new message
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(0);

  const handleScrollLog = (e) => {
    const el = e.currentTarget;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 150;
  };

  useEffect(() => {
    if (!logRef.current) return;
    const isNewMsg = messages.length > prevMsgCountRef.current;
    const isInitial = prevMsgCountRef.current === 0;
    prevMsgCountRef.current = messages.length;

    if (isInitial || isNearBottomRef.current || pendingAttachment) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, pendingAttachment]);

  // Auto-resize composer textarea like WhatsApp Web (dynamic expanding height, no scrollbars)
  useEffect(() => {
    const el = textInputRef.current;
    if (el) {
      el.style.height = "auto";
      const scrollHeight = el.scrollHeight;
      const targetHeight = Math.min(Math.max(scrollHeight, 46), 140);
      el.style.height = `${targetHeight}px`;
      el.style.overflowY = scrollHeight > 140 ? "auto" : "hidden";
    }
  }, [inputBody]);

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".wa-attachment-popup") && !e.target.closest(".wa-attach-trigger")) {
        setShowAttachMenu(false);
      }
      if (!e.target.closest(".wa-emoji-drawer") && !e.target.closest(".wa-emoji-trigger")) {
        setShowEmojiDrawer(false);
      }
      if (!e.target.closest(".wa-dropdown-menu") && !e.target.closest(".wa-dropdown-trigger")) {
        setOpenDropdownMsgId(null);
      }
      if (!e.target.closest(".wa-quick-react-popup") && !e.target.closest(".wa-react-trigger") && !e.target.closest(".wa-full-react-drawer")) {
        setOpenReactionMsgId(null);
        setOpenFullReactionMsgId(null);
      }
      if (!e.target.closest(".wa-header-menu-dropdown") && !e.target.closest(".wa-header-menu-trigger")) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  // 3. Send Message (Text / Attachment - Instant non-blocking optimistic dispatch)
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!activeConn?.id) return;
    if (!inputBody.trim() && !pendingAttachment) return;

    const textToSend = inputBody.trim();
    const currentReplyId = replyTo?.id || null;
    const attachmentToSend = pendingAttachment;

    setInputBody("");
    setReplyTo(null);
    setPendingAttachment(null);
    setShowAttachMenu(false);
    setShowEmojiDrawer(false);
    triggerSound();

    // Optimistic Message Construction
    const clientId = `client-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    markAsMySentMessage(clientId);

    const tokenUserId = (typeof getCurrentUserIdFromToken === "function" ? getCurrentUserIdFromToken() : "") || "";
    const myId = state.me?.id || state.me?.account?.id || tokenUserId || "me";
    const myName = state.me?.profile?.pseudonym || state.me?.pseudonym || "You";
    const peerId = activeConn.peer?.id;
    const peerName = activeConn.peer?.pseudonym || activeConn.peer?.name || "Match";
    const isPhotoAttachment =
      attachmentToSend?.type === "gallery" ||
      attachmentToSend?.mediaKind === "photo";
    const isVideoAttachment =
      attachmentToSend?.mediaKind === "video";
    const isMediaAttachment = isPhotoAttachment || isVideoAttachment;
    const mediaTagKind = isVideoAttachment ? "video" : (isPhotoAttachment ? "photo" : (attachmentToSend?.type === "file" ? "file" : "text"));

    // Body for optimistic message — NEVER include base64 in body to prevent blinking on receiver side
    // We only put a clean caption or the filename
    const optBody = isMediaAttachment
      ? (textToSend || "Photo")  // Clean body — no base64 embedded
      : (textToSend || (attachmentToSend ? attachmentToSend.name : ""));

    const newMsg = {
      id: clientId,
      clientId,
      sender: myId,
      isMine: true,
      mine: true,
      body: optBody,
      kind: attachmentToSend
        ? attachmentToSend.type === "gallery"
          ? attachmentToSend.mediaKind
          : attachmentToSend.type
        : "text",
      mediaUrl: attachmentToSend?.previewUrl,
      fileName: attachmentToSend?.name,
      fileSize: attachmentToSend?.size,
      replyToId: currentReplyId,
      replyToSnippet: replyTo ? replyTo.body : null,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Save immediately in persistent local store so receiver tab/loadMessages can read it
    const pairKey = peerId ? [myId, peerId].sort().join("::") : null;
    saveLocalChatMessage([activeConn.id, pairKey], newMsg);

    if (attachmentToSend?.previewUrl) {
      try {
        localStorage.setItem(`jm_media_cache_${clientId}`, attachmentToSend.previewUrl);
        localStorage.setItem("jm_last_media_sent", attachmentToSend.previewUrl);
      } catch {}
    }

    // Update connection's last message in sidebar immediately
    setConnections((prev) =>
      prev.map((c) =>
        c.id === activeConn.id
          ? { ...c, lastMessage: newMsg, lastActive: new Date().toISOString() }
          : c
      )
    );

    // Broadcast to other tabs/windows in real time (e.g. Receiver Tab / Jenny)
    const optimisticBroadcastMsg = {
      ...newMsg,
      mediaUrl: newMsg.mediaUrl,
      body: isMediaAttachment ? (textToSend || "Photo") : newMsg.body,
    };
    const chatBroadcastPayload = {
      type: "NEW_MESSAGE",
      tabId: tabIdRef.current,
      connectionId: activeConn.id,
      message: optimisticBroadcastMsg,
      senderId: myId,
      senderName: myName,
      recipientId: peerId,
      recipientName: peerName,
      timestamp: Date.now(),
    };

    try {
      const bc = new BroadcastChannel("jm_chat_messages_channel");
      bc.postMessage(chatBroadcastPayload);
    } catch {}

    try {
      localStorage.setItem(
        "jm_last_chat_message",
        JSON.stringify({ ...chatBroadcastPayload, _salt: Math.random() })
      );
    } catch {}

    // Non-blocking background dispatch
    (async () => {
      try {
        let res;
        if (attachmentToSend) {
          if (attachmentToSend.type === "audio" || attachmentToSend.mediaKind === "audio") {
            let mediaRes = null;
            try {
              mediaRes = await mediaService.uploadMedia(attachmentToSend.previewUrl, "voice", false);
            } catch {}
            res = await chatService.sendVoiceNote(activeConn.id, mediaRes?.id, {
              clientId,
              senderId: myId,
              peerId,
              previewUrl: attachmentToSend.previewUrl,
              fileName: attachmentToSend.name,
              fileSize: attachmentToSend.size,
            });
          } else {
            let mediaRes = null;
            try {
              mediaRes = await mediaService.uploadMedia(
                attachmentToSend.previewUrl,
                attachmentToSend.mediaKind || "photo",
                false
              );
            } catch (upErr) {
              console.warn("Upload note:", upErr.message);
            }

            const actualMediaId = mediaRes?.id || mediaRes?.mediaId;
            if (actualMediaId && attachmentToSend?.previewUrl) {
              try {
                localStorage.setItem(`jm_media_cache_${actualMediaId}`, attachmentToSend.previewUrl);
                blobUrlCache.set(actualMediaId, attachmentToSend.previewUrl);
                blobUrlCache.set(`/v1/media/${actualMediaId}`, attachmentToSend.previewUrl);
              } catch {}
            }

            // Auto-grant access to connected peer for this photo so backend doesn't 403 deny them
            if (actualMediaId && peerId) {
              mediaService.grantPhotoAccess(actualMediaId, peerId, "granted").catch((grantErr) => {
                console.warn("Auto grant photo access note:", grantErr?.message);
              });
            }

            const serverPath = mediaRes?.url || (actualMediaId ? `/v1/media/${actualMediaId}` : null);
            const serverMediaUrl = serverPath ? mediaService.getRawMediaUrl(serverPath) : null;
            const effectiveMediaUrl = serverMediaUrl || attachmentToSend.previewUrl;
            // Wire body is clean and NEVER contains large base64 data URLs
            const wireBody = serverPath
              ? `[${mediaTagKind}:${serverPath}]${textToSend ? ` ${textToSend}` : ""}`
              : (textToSend || "Photo");

            res = await chatService.sendMessage(
              activeConn.id,
              wireBody,
              currentReplyId,
              {
                clientId,
                senderId: myId,
                peerId,
                mediaId: actualMediaId,
                mediaUrl: effectiveMediaUrl,
                kind: mediaTagKind,
                fileName: attachmentToSend.name,
                fileSize: attachmentToSend.size,
                rawCaption: textToSend,
                attachmentProps: {
                  mediaId: actualMediaId,
                  mediaUrl: effectiveMediaUrl,
                  kind: mediaTagKind,
                  fileName: attachmentToSend.name,
                  fileSize: attachmentToSend.size,
                  rawCaption: textToSend,
                },
              }
            );
          }
        } else {
          res = await chatService.sendMessage(activeConn.id, textToSend, currentReplyId, {
            clientId,
            senderId: myId,
            peerId,
          });
        }

        if (res) {
          // Server mediaUrl takes priority, else fall back to local mediaUrl
          const serverMediaUrl = res.mediaUrl || (res.mediaId ? mediaService.getRawMediaUrl(res.mediaId) : null);

          const finalMsg = {
            ...newMsg,
            ...res,
            mediaUrl: serverMediaUrl || newMsg.mediaUrl,
            fileName: newMsg.fileName || res.fileName,
            fileSize: newMsg.fileSize || res.fileSize,
            kind: newMsg.kind || res.kind || mediaTagKind,
            isMine: true,
            mine: true,
          };

          setMessages((prev) =>
            prev.map((m) =>
              m.id === clientId || m.clientId === clientId ? finalMsg : m
            )
          );

          saveLocalChatMessage([activeConn.id, pairKey], {
            ...finalMsg,
            mediaUrl: finalMsg.mediaUrl,
          });

          const finalMediaUrl = attachmentToSend?.previewUrl || finalMsg.mediaUrl;
          if (finalMsg.id && finalMediaUrl) {
            try {
              localStorage.setItem(`jm_media_cache_${finalMsg.id}`, finalMediaUrl);
              if (clientId) localStorage.setItem(`jm_media_cache_${clientId}`, finalMediaUrl);
              const extraId = res.mediaId || (attachmentToSend?.mediaKind ? newMsg.mediaId : null);
              if (extraId) localStorage.setItem(`jm_media_cache_${extraId}`, finalMediaUrl);
              localStorage.setItem("jm_last_media_sent", finalMediaUrl);
            } catch {}
          }

          // Broadcast confirmed message with real mediaUrl to receiver tab
          try {
            const broadcastMsg = {
              ...finalMsg,
              mediaUrl: serverMediaUrl || finalMsg.mediaUrl,
              body: isMediaAttachment ? (textToSend || "Photo") : (finalMsg.body?.startsWith("data:") ? "Photo" : finalMsg.body),
            };
            const bc = new BroadcastChannel("jm_chat_messages_channel");
            const payload = {
              type: "NEW_MESSAGE",
              tabId: tabIdRef.current,
              connectionId: activeConn.id,
              message: broadcastMsg,
              senderId: myId,
              senderName: myName,
              recipientId: peerId,
              recipientName: peerName,
              timestamp: Date.now(),
            };
            bc.postMessage(payload);
            localStorage.setItem(
              "jm_last_chat_message",
              JSON.stringify({ ...payload, _salt: Math.random() })
            );
          } catch {}
        }
      } catch (err) {
        console.warn("Message background delivery note:", err.message);
      }
    })();
  };

  // 4. File / Gallery / Audio Picker Handlers
  const handleSelectGallery = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        type: "gallery",
        file,
        previewUrl: reader.result,
        mediaKind: isVideo ? "video" : "photo",
        name: file.name,
        size: formatBytes(file.size),
      });
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSelectDocument = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        type: "file",
        file,
        previewUrl: reader.result,
        mediaKind: "file",
        name: file.name,
        size: formatBytes(file.size),
      });
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSelectAudioFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        type: "audio",
        file,
        previewUrl: reader.result,
        mediaKind: "audio",
        name: file.name,
        size: formatBytes(file.size),
      });
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // 5. Emoji Insertion
  const handleEmojiClick = (emoji) => {
    setInputBody((prev) => prev + emoji);
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  // 6. Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          try {
            showToast("Sending voice note…");
            const tempId = `temp-voice-${Date.now()}`;
            const myId = state.me?.id || "jm-member-1";
            const tempVoiceMsg = {
              id: tempId,
              sender: myId,
              body: "🎙️ Voice note",
              kind: "voice",
              mediaUrl: base64Audio,
              createdAt: new Date().toISOString(),
              read: false,
            };
            setMessages((prev) => [...prev, tempVoiceMsg]);

            const mediaRes = await mediaService.uploadMedia(base64Audio, "voice", false);
            if (mediaRes?.id && activeConn?.id) {
              const voiceMsgRes = await chatService.sendVoiceNote(activeConn.id, mediaRes.id);
              if (voiceMsgRes) {
                setMessages((prev) => prev.map((m) => (m.id === tempId ? voiceMsgRes : m)));
              }
            }
            showToast("Voice note sent.");
          } catch (err) {
            showToast(err.message || "Could not send voice note.");
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      showToast("Microphone permission required for voice notes.");
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      showToast("Recording discarded.");
    }
  };

  // 7. Message Reactions
  const handleReaction = async (messageId, emoji) => {
    triggerEmojiShower(emoji, true, messageId);
    try {
      await chatService.addReaction(activeConn.id, messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m))
      );
      setOpenDropdownMsgId(null);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m))
      );
    }
  };

  // 8. Edit Message (Within 10 Minutes Rule)
  const isWithin10Minutes = (createdAt) => {
    if (!createdAt) return true;
    const msgTime = new Date(createdAt).getTime();
    const now = Date.now();
    return now - msgTime <= 10 * 60 * 1000;
  };

  const handleStartEdit = (msg) => {
    if (!isWithin10Minutes(msg.createdAt || msg.created_at)) {
      showToast("Messages can only be edited within 10 minutes of sending.");
      return;
    }
    setEditingMsgId(msg.id);
    setEditBody(msg.body);
    setOpenDropdownMsgId(null);
  };

  const handleSaveEdit = async (messageId) => {
    if (!editBody.trim() || !activeConn?.id) return;
    try {
      await chatService.editMessage(activeConn.id, messageId, editBody.trim());
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, body: editBody.trim(), edited: true } : m))
      );
      setEditingMsgId(null);
      showToast("Message edited.");
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, body: editBody.trim(), edited: true } : m))
      );
      setEditingMsgId(null);
      showToast("Message updated.");
    }
  };

  // 9. Delete Message (Modal with 'Delete for me' and 'Delete for everyone within 10 mins')
  const openDeleteModal = (msg) => {
    setOpenDropdownMsgId(null);
    const canDeleteForEveryone = isWithin10Minutes(msg.createdAt || msg.created_at);

    openModal(
      "Delete Message?",
      <div className="wa-delete-modal-content">
        <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: "8px" }}>
          Choose how you would like to delete this message:
        </p>

        <button
          type="button"
          className="wa-delete-option-btn danger"
          onClick={async () => {
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            closeModal();
            showToast("Message deleted for you.");
          }}
        >
          <span>🗑️ Delete for me</span>
          <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Removes from your view</span>
        </button>

        <button
          type="button"
          className={`wa-delete-option-btn ${canDeleteForEveryone ? "danger" : "disabled"}`}
          disabled={!canDeleteForEveryone}
          onClick={async () => {
            if (!canDeleteForEveryone) return;
            try {
              if (activeConn?.id) {
                await chatService.deleteMessage(activeConn.id, msg.id, true);
              }
            } catch (err) {}
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      isDeletedForEveryone: true,
                      body: "🚫 This message was deleted",
                      mediaUrl: null,
                      fileName: null,
                    }
                  : m
              )
            );
            closeModal();
            showToast("Message deleted for everyone.");
          }}
        >
          <span>🚫 Delete for everyone</span>
          <span style={{ fontSize: "0.76rem", color: canDeleteForEveryone ? "#f87171" : "var(--muted)" }}>
            {canDeleteForEveryone ? "Available (≤ 10 mins)" : "Expired (> 10 mins)"}
          </span>
        </button>

        <div className="buttonbar" style={{ marginTop: "12px", justifyContent: "flex-end" }}>
          <button type="button" className="button quiet small" onClick={closeModal}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // 10. Copy Message
  const handleCopyMessage = (text) => {
    navigator.clipboard?.writeText(text);
    showToast("Message copied to clipboard.");
    setOpenDropdownMsgId(null);
  };

  // 11. Audio Player Toggle
  const handleToggleAudio = (msgId, audioSrc) => {
    if (!audioSrc) return;
    if (playingAudioId === msgId) {
      if (audioElementsRef.current[msgId]) {
        audioElementsRef.current[msgId].pause();
      }
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      if (!audioElementsRef.current[msgId]) {
        const audio = new Audio(audioSrc);
        audio.onended = () => setPlayingAudioId(null);
        audioElementsRef.current[msgId] = audio;
      }
      audioElementsRef.current[msgId].play();
      setPlayingAudioId(msgId);
    }
  };

  // 12. Contact Info & Header Menu Actions (Opens Right Sidebar)
  const handleOpenContactInfo = () => {
    if (!activeConn?.peer) return;
    setShowContactPanel((prev) => !prev);
  };

  // 13. Request Private Photo Access
  const handleRequestPrivatePhoto = () => {
    openModal(
      "Request Private Photos",
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ color: "#d1c1d4", fontSize: "0.92rem", lineHeight: 1.5 }}>
          Send a private photo request to <strong>{activeConn.peer?.pseudonym || "this member"}</strong>?
          They will receive a notification to grant or decline access.
        </p>
        <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          <button type="button" className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
            onClick={async () => {
              try {
                if (activeConn?.id) {
                  await chatService.sendMessage(activeConn.id, {
                    body: "🔒 Requested private photo access",
                    kind: "text",
                  });
                }
              } catch (err) {}
              closeModal();
              showToast(`🔒 Access request sent to ${activeConn.peer?.pseudonym || "member"}!`);
            }}
          >
            Send Request
          </button>
        </div>
      </div>
    );
  };

  // 14. Block User
  const handleBlockUser = () => {
    openModal(
      "Block Member?",
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ color: "#d1c1d4", fontSize: "0.92rem", lineHeight: 1.5 }}>
          Are you sure you want to block <strong>{activeConn.peer?.pseudonym || "this member"}</strong>?
          They will no longer be able to send you messages or initiate calls.
        </p>
        <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          <button type="button" className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-all border border-red-500/20 min-w-[120px]"
            onClick={async () => {
              try {
                const targetId = activeConn.peer?.id || activeConn.id;
                await blockMember(targetId);
                closeModal();
                loadConnections();
              } catch (err) {
                showToast(err.message || "Failed to block member.");
              }
            }}
          >
            Block
          </button>
        </div>
      </div>
    );
  };

  // 15. Report User
  const handleReportUser = () => {
    let reportReason = "Inappropriate behavior";
    let reportContext = "";
    openModal(
      "Report Member",
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ color: "#d1c1d4", fontSize: "0.9rem" }}>
          Help us keep Juicy Match safe. Select the reason you want to report <strong>{activeConn.peer?.pseudonym || "this member"}</strong>:
        </p>

        <div>
          <label style={{ fontSize: "0.82rem", color: "#fda4af", fontWeight: 700, display: "block", marginBottom: "6px" }}>
            Reason for reporting
          </label>
          <select
            defaultValue="Inappropriate behavior"
            onChange={(e) => {
              reportReason = e.target.value;
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              background: "#1c0e28",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "0.9rem",
            }}
          >
            <option value="Inappropriate behavior">Inappropriate behavior</option>
            <option value="Harassment or bullying">Harassment or bullying</option>
            <option value="Spam, scams or commercial activity">Spam, scams or commercial activity</option>
            <option value="Fake profile or impersonation">Fake profile or impersonation</option>
            <option value="Safety or underage concern">Safety or underage concern</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.82rem", color: "#fda4af", fontWeight: 700, display: "block", marginBottom: "6px" }}>
            Additional details (optional)
          </label>
          <textarea
            rows={3}
            placeholder="Describe what happened so our moderation team can take prompt action…"
            onChange={(e) => {
              reportContext = e.target.value;
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              background: "#1c0e28",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "0.9rem",
              resize: "none",
            }}
          />
        </div>

        <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          <button type="button" className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-all border border-red-500/20 min-w-[120px]"
            onClick={async () => {
              try {
                await chatService.reportMember(
                  activeConn.peer?.id || activeConn.id,
                  `${reportReason}${reportContext ? `: ${reportContext}` : ""}`
                );
                closeModal();
                showToast("Report submitted. Thank you for helping keep Juicy safe.");
              } catch (err) {
                showToast(err.message || "Failed to submit report.");
              }
            }}
          >
            Submit Report
          </button>
        </div>
      </div>
    );
  };

  // 16. Clear Conversation
  const handleClearConversation = () => {
    openModal(
      "Clear Conversation?",
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ color: "#d1c1d4", fontSize: "0.92rem", lineHeight: 1.5 }}>
          Are you sure you want to clear all messages with <strong>{activeConn.peer?.pseudonym || "this member"}</strong>?
          This action will erase the message history in this chat.
        </p>
        <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          <button type="button" className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-all border border-red-500/20 min-w-[120px]"
            onClick={async () => {
              try {
                if (chatService.clearConversation) {
                  await chatService.clearConversation(activeConn.id);
                }
              } catch (err) {}
              setMessages([]);
              closeModal();
              showToast("Conversation cleared.");
            }}
          >
            Clear Messages
          </button>
        </div>
      </div>
    );
  };

  // 13. AI Conversation Starters (Backend Module 5.1)
  const handleAIStarters = async () => {
    try {
      showToast("Loading conversation starters from API…");
      const [aiRes, promptsRes] = await Promise.allSettled([
        aiService.getStarters(activeConn?.peer?.id || "peer"),
        chatService.getConversationPrompts(activeConn?.id),
      ]);
      const templates = aiRes.status === "fulfilled" && aiRes.value?.templates?.length ? aiRes.value.templates : [];
      const chapters = promptsRes.status === "fulfilled" && promptsRes.value?.chapters ? promptsRes.value.chapters : [];
      const chapterPrompts = chapters.flatMap((c) => c.prompts || []);
      const starters = [...templates, ...chapterPrompts];

      if (starters.length === 0) {
        showToast("No starters returned from backend.");
        return;
      }

      openModal(
        "✨ AI Conversation Starters",
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p className="small">Tap any starter to insert into your chat message composer:</p>
          {starters.map((starter, idx) => (
            <button
              key={idx}
              type="button"
              className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
              style={{ textAlign: "left", padding: "12px 14px", lineHeight: 1.5, fontSize: "0.88rem" }}
              onClick={() => {
                setInputBody(starter);
                closeModal();
              }}
            >
              “{starter}”
            </button>
          ))}
        </div>
      );
    } catch (err) {
      showToast("Could not load AI starters.");
    }
  };

  // 14. Smart AI Sentence Generator (Inserts into Input Box from Backend Module 5.1)
  const handleGenerateSmartReply = async () => {
    try {
      const promptsRes = await chatService.getConversationPrompts(activeConn?.id).catch(() => null);
      const chapters = promptsRes?.chapters || [];
      const prompts = chapters.flatMap((c) => c.prompts || []);
      if (prompts.length > 0) {
        const nextIndex = smartSuggestionIndexRef.current % prompts.length;
        smartSuggestionIndexRef.current += 1;
        setInputBody(prompts[nextIndex]);
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      } else {
        showToast("No suggestions from backend.");
      }
    } catch {
      showToast("Unable to fetch suggestions.");
    }
  };

  // 15. Call Initiations (LiveKit WebRTC & Demo Simulation)
  const handleInitiateCall = (medium = "audio") => {
    if (!activeConn?.id) return;
    startCall(activeConn.id, medium, activeConn.peer);
  };

  const handleCallEnded = (status) => {
    loadMessages();
  };

  // Mutual Consent Submit (Section 6.2)
  const handleConsentAccept = async () => {
    if (!activeConn?.id) return;
    try {
      await chatService.giveConsent(activeConn.id, true);
      showToast("Chat consent granted! Conversation is now active.");
      await loadConnections();
      await loadMessages();
    } catch (err) {
      showToast(err.message || "Failed to grant consent.");
    }
  };

  return (
    <div className="flex w-full h-full bg-night overflow-hidden relative font-sans">
      <input type="file" ref={galleryInputRef} onChange={handleSelectGallery} accept="image/*,video/*" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleSelectDocument} accept=".pdf,.doc,.docx,.txt,.zip,.xlsx,.csv,application/*" className="hidden" />
      <input type="file" ref={audioInputRef} onChange={handleSelectAudioFile} accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" className="hidden" />

      <div className={`flex-shrink-0 w-full md:w-[340px] lg:w-[380px] md:block ${selectedConnId ? "hidden" : "block"}`}>
        <ChatSidebar
          connections={connections}
          selectedConnId={selectedConnId}
          onSelectConnection={setSelectedConnId}
          onRefresh={loadConnections}
          onNavigateDiscover={() => navigate("discover")}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loadingConns={loadingConns}
        />
      </div>

      <main className={`flex-1 flex flex-col min-w-0 bg-night relative z-0 shadow-lg ${!selectedConnId ? "hidden md:flex" : "flex"}`}>
        {!activeConn ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top_right,_rgba(233,22,113,0.05),_transparent_50%),_var(--night)]">
            <div className="w-24 h-24 mb-6 rounded-full bg-surface-light border-2 border-dashed border-line flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-cream mb-2">Juicy Match Web</h3>
            <p className="text-sm text-muted text-center max-w-sm">
              Select a contact to view your encrypted conversation, send media, files, voice notes, and audio.
            </p>
          </div>
        ) : (
          <>
            <ChatHeader
              activeConn={activeConn}
              onBack={() => setSelectedConnId(null)}
              onAudioCall={() => handleInitiateCall("audio")}
              onVideoCall={() => handleInitiateCall("video")}
              onSearchToggle={() => {}}
              onInfoToggle={handleOpenContactInfo}
            />
            <MessageList
              messages={messages}
              meId={state.me?.id || "me"}
              peer={activeConn.peer}
              loading={loadingMsgs}
              isInitialLoad={isInitialLoadRef.current}
              onReply={setReplyTo}
              onReact={handleReaction}
              onEdit={handleStartEdit}
              onDelete={openDeleteModal}
              onViewImage={setLightboxImage}
              showDropdownMsgId={openDropdownMsgId}
              setShowDropdownMsgId={setOpenDropdownMsgId}
            />
            <MessageInput
              inputBody={inputBody}
              setInputBody={setInputBody}
              onSend={handleSend}
              sending={sending}
              showAttachMenu={showAttachMenu}
              setShowAttachMenu={setShowAttachMenu}
              showEmojiDrawer={showEmojiDrawer}
              setShowEmojiDrawer={setShowEmojiDrawer}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              editingMsgId={editingMsgId}
              setEditingMsgId={setEditingMsgId}
              handleFileChange={handleSelectGallery}
              fileInputRef={galleryInputRef}
              pendingAttachment={pendingAttachment}
              setPendingAttachment={setPendingAttachment}
              handleCancelReplyEdit={() => { setReplyTo(null); setEditingMsgId(null); setEditBody(""); }}
              handleEmojiSelect={handleEmojiClick}
              prompts={[]}
              onPromptClick={() => {}}
            />
            
            {floatingParticles.length > 0 && (
              <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
                {floatingParticles.map((p) => (
                  <span
                    key={p.id}
                    className="absolute bottom-0 text-3xl animate-float-up opacity-0"
                    style={{
                      left: `${p.left}%`,
                      fontSize: `${p.size}px`,
                      animationDelay: `${p.delay}s`,
                      animationDuration: `${p.duration}s`,
                      "--sway-x": `${p.sway}px`,
                      "--start-scale": p.scale,
                    }}
                  >
                    {p.emoji}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showContactPanel && activeConn?.peer && (
        <ContactDrawer
          peer={activeConn.peer}
          activeConn={activeConn}
          onClose={() => setShowContactPanel(false)}
          onBlock={handleBlockUser}
          onReport={handleReportUser}
          onClearChat={handleClearConversation}
        />
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] grid place-items-center p-5 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Enlarged media"
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
          />
        </div>
      )}
    </div>
  );
}
