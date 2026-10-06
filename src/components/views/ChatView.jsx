import React, { useState, useEffect, useRef } from "react";
import "../../styles/chat.css";
import Icon from "../common/Icon";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { chatService, saveLocalChatMessage, getLocalChatStore } from "../../services/chatService";
import { callsService } from "../../services/callsService";
import { mediaService } from "../../services/mediaService";
import { aiService } from "../../services/aiService";
import { blockService } from "../../services/blockService";
import { getCurrentUserIdFromToken } from "../../services/api";
import {
  formatDate,
  formatMessageTime,
  formatConversationTime,
  portraitClass,
  getPeerPortraitIndex,
  getEmojiMessageInfo,
} from "../../utils/formatters";

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

      const unread = combined.filter((m) => m.sender !== state.me?.id && !m.read);
      if (unread.length > 0) {
        const lastId = unread[unread.length - 1].id;
        chatService.markAsRead(activeConn.id, lastId).catch(() => {});
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
                unreadCount: isForThisActiveChat ? (c.unreadCount || 0) : (c.unreadCount || 0) + 1,
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
                  unreadCount: isForThisActiveChat ? (c.unreadCount || 0) : (c.unreadCount || 0) + 1,
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
          <button type="button" className="button quiet" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
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
          <button type="button" className="button quiet" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="button danger"
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
          <button type="button" className="button quiet" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="button danger"
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
          <button type="button" className="button quiet" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="button danger"
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
              className="button quiet"
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
    <div className="wa-chat-container">
      {/* Hidden inputs for Attachment Types */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleSelectGallery}
        accept="image/*,video/*"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectDocument}
        accept=".pdf,.doc,.docx,.txt,.zip,.xlsx,.csv,application/*"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleSelectAudioFile}
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        style={{ display: "none" }}
      />

      {/* =========================================================
          LEFT SIDEBAR: Contacts & Conversation List (WhatsApp/Telegram Style)
      ========================================================= */}
      <aside className={`wa-sidebar ${selectedConnId ? "hide-mobile" : ""}`}>
        {/* Sidebar Header */}
        <div className="wa-sidebar-header">
          <div className="wa-sidebar-title">
            <span>Chats</span>
            <span className="wa-chat-badge">{connections.length}</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="wa-header-btn"
              onClick={loadConnections}
              title="Refresh chats"
            >
              <Icon name="refresh" />
            </button>
            <button
              type="button"
              className="wa-header-btn"
              onClick={() => navigate("discover")}
              title="Find new matches"
            >
              <Icon name="discover" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="wa-sidebar-search-box">
          <div className="wa-search-input-wrapper">
            <span className="wa-search-icon">
              <Icon name="search" />
            </span>
            <input
              type="text"
              className="wa-search-input"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="wa-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="wa-filter-tabs">
          <button
            type="button"
            className={`wa-filter-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`wa-filter-tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </button>
          <button
            type="button"
            className={`wa-filter-tab ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active Sparks
          </button>
        </div>

        {/* Conversation List */}
        <div className="wa-conv-list">
          {loadingConns ? (
            <Loader text="Loading conversations…" size="small" />
          ) : filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => {
              const isSelected = conn.id === selectedConnId;
              const peerName = conn.peer?.pseudonym || "Match";
              const lastMsg = getLastMessageSnippet(conn.lastMessage);
              const initials = peerName.slice(0, 2).toUpperCase();

              return (
                <div
                  key={conn.id}
                  className={`wa-conv-item ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedConnId(conn.id)}
                >
                  <div className="wa-avatar-wrap">
                    <div className={`wa-avatar-circle portrait ${portraitClass(getPeerPortraitIndex(conn.peer || conn))}`}>
                      {Boolean(conn.peer?.photo && typeof conn.peer.photo === "string" && (conn.peer.photo.startsWith("http") || conn.peer.photo.startsWith("data:"))) && (
                        <img
                          src={conn.peer.photo}
                          alt={peerName}
                        />
                      )}
                    </div>
                    <span className="wa-online-dot"></span>
                  </div>

                  <div className="wa-conv-content">
                    <div className="wa-conv-row-top">
                      <span className="wa-conv-name">{peerName}</span>
                      <span className="wa-conv-time">
                        {conn.lastActive ? formatConversationTime(conn.lastActive) : "Now"}
                      </span>
                    </div>
                    <div className="wa-conv-row-bottom">
                      <span className="wa-conv-snippet">
                        {conn.peer?.isBot ? "🤖 " : ""}
                        {lastMsg}
                      </span>
                      {conn.unreadCount > 0 && (
                        <span className="wa-unread-badge">{conn.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
              <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>💬</p>
              <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>No conversations found</p>
              <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                {searchQuery ? "Try a different search query" : "Match with members in Discovery"}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================
          RIGHT MAIN PANEL: Active Chat Thread (WhatsApp / Telegram Style)
      ========================================================= */}
      <main className={`wa-main-chat ${!selectedConnId ? "hide-mobile" : ""} ${showContactPanel ? "has-contact-panel" : ""}`}>
        {!activeConn ? (
          /* Empty / Welcome State */
          <div className="wa-welcome-pane">
            <div className="wa-welcome-icon-box">💬</div>
            <h3>Juicy Match Web</h3>
            <p>
              Select a contact to view your encrypted conversation, send gallery media, files, voice notes, and audio.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Top Header */}
            <header className="wa-chat-header">
              <div
                className="wa-chat-header-user"
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowContactPanel(true);
                }}
                title="View contact info"
              >
                <button
                  type="button"
                  className="wa-header-back-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnId(null);
                  }}
                  title="Back to chats"
                >
                  ←
                </button>

                <div className="wa-avatar-wrap" style={{ width: "42px", height: "42px" }}>
                  <div
                    className={`wa-avatar-circle portrait ${portraitClass(getPeerPortraitIndex(activeConn.peer || activeConn))}`}
                    style={{ width: "42px", height: "42px" }}
                  >
                    {Boolean(activeConn.peer?.photo && typeof activeConn.peer.photo === "string" && (activeConn.peer.photo.startsWith("http") || activeConn.peer.photo.startsWith("data:"))) && (
                      <img
                        src={activeConn.peer.photo}
                        alt={activeConn.peer?.pseudonym || activeConn.pseudonym || "Match"}
                      />
                    )}
                  </div>
                </div>

                <div className="wa-header-info">
                  <span className="wa-header-name">
                    {activeConn.peer?.pseudonym || "Conversation"}
                    {activeConn.peer?.zone && (
                      <span className="pill" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                        📍 {activeConn.peer.zone}
                      </span>
                    )}
                  </span>
                  <span className="wa-header-status">
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#10b981",
                        display: "inline-block",
                      }}
                    ></span>
                    Online
                  </span>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="wa-chat-header-actions">
                <button
                  type="button"
                  className="wa-header-btn"
                  onClick={() => handleInitiateCall("audio")}
                  title="Voice Call"
                >
                  <Icon name="phone" />
                </button>
                <button
                  type="button"
                  className="wa-header-btn"
                  onClick={() => handleInitiateCall("video")}
                  title="Video Call"
                >
                  <Icon name="video" />
                </button>
                {/* 3-Dot Menu Dropdown (Replaces old shield button) */}
                <div className="wa-header-menu-container">
                  <button
                    type="button"
                    className={`wa-header-btn wa-header-menu-trigger ${showHeaderMenu ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHeaderMenu((prev) => !prev);
                    }}
                    title="More options (⋮)"
                  >
                    <Icon name="dots" />
                  </button>

                  {showHeaderMenu && (
                    <div className="wa-header-menu-dropdown">
                      {/* 1. Contact info */}
                      <button
                        type="button"
                        className="wa-header-menu-item"
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleOpenContactInfo();
                        }}
                      >
                        <Icon name="info" />
                        <span>Contact info</span>
                      </button>


                      {/* 4. Request private photo access */}
                      <button
                        type="button"
                        className="wa-header-menu-item"
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleRequestPrivatePhoto();
                        }}
                      >
                        <Icon name="lock" />
                        <span>Request private photo access</span>
                      </button>

                      <div className="wa-header-menu-divider" />

                      {/* 3. Block */}
                      <button
                        type="button"
                        className="wa-header-menu-item danger"
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleBlockUser();
                        }}
                      >
                        <Icon name="ban" />
                        <span>Block</span>
                      </button>

                      {/* 4. Report */}
                      <button
                        type="button"
                        className="wa-header-menu-item danger"
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleReportUser();
                        }}
                      >
                        <Icon name="flag" />
                        <span>Report</span>
                      </button>

                      {/* 5. Clear conversation */}
                      <button
                        type="button"
                        className="wa-header-menu-item danger"
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleClearConversation();
                        }}
                      >
                        <Icon name="trash" />
                        <span>Clear conversation</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Chat Messages Canvas */}
            <div ref={logRef} onScroll={handleScrollLog} className="wa-messages-canvas">
              {/* Mutual Consent Prompt (Section 6.2) */}
              {activeConn.state !== "active" && !activeConn.myConsent && (
                <div
                  style={{
                    background: "rgba(225, 29, 72, 0.15)",
                    border: "1px solid rgba(225, 29, 72, 0.35)",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    margin: "0 0 16px",
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  }}
                >
                  <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
                    Mutual Chat Consent Required
                  </p>
                  <p style={{ fontSize: "0.82rem", color: "#e2d9e4", marginBottom: "12px", lineHeight: 1.4 }}>
                    Both members must submit consent before full messaging and live calls are unlocked.
                  </p>
                  <button
                    type="button"
                    className="button primary small"
                    onClick={handleConsentAccept}
                    style={{ margin: "0 auto" }}
                  >
                    Open the Conversation <Icon name="chat" />
                  </button>
                </div>
              )}

              <div className="wa-date-divider">Today</div>

              {loadingMsgs && messages.length === 0 ? (
                <Loader text="Loading conversation…" size="small" />
              ) : messages.length > 0 ? (
                messages.map((m) => {
                  const rawBody = typeof m.body === "string" ? m.body : (typeof m.body === "object" ? m.body?.body || "" : String(m.body || ""));
                  const isCallEvent = m.kind === "call" || rawBody.startsWith("Video call") || rawBody.startsWith("Audio call") || rawBody.startsWith("Voice call");

                  const tokenUserId = (typeof getCurrentUserIdFromToken === "function" ? getCurrentUserIdFromToken() : "") || "";

                  const peerId = String(
                    activeConn?.peer?.id ||
                    activeConn?.peer?.accountId ||
                    activeConn?.peer_id ||
                    activeConn?.peerId ||
                    activeConn?.targetId ||
                    activeConn?.target ||
                    ""
                  ).trim().toLowerCase();

                  const peerName = String(
                    activeConn?.peer?.pseudonym ||
                    activeConn?.peer?.name ||
                    activeConn?.peerName ||
                    ""
                  ).trim().toLowerCase();

                  const myId = String(
                    state.me?.id ||
                    state.me?.account?.id ||
                    state.me?.accountId ||
                    state.me?.user?.id ||
                    tokenUserId ||
                    ""
                  ).trim().toLowerCase();

                  const myPseudonym = String(
                    state.me?.profile?.pseudonym ||
                    state.me?.account?.profile?.pseudonym ||
                    state.me?.pseudonym ||
                    ""
                  ).trim().toLowerCase();

                  const msgSenderRaw =
                    (typeof m.sender === "object" && m.sender !== null
                      ? m.sender.id || m.sender.pseudonym || m.sender.name
                      : m.sender) ||
                    m.senderId ||
                    m.sender_id ||
                    m.userId ||
                    m.from ||
                    "";

                  const msgSender = String(msgSenderRaw || "").trim().toLowerCase();

                  const msgSenderName = String(
                    (typeof m.sender === "object" && m.sender !== null
                      ? m.sender.pseudonym || m.sender.name
                      : "") ||
                    m.senderName ||
                    m.sender_name ||
                    ""
                  ).trim().toLowerCase();

                  // 1. Explicit tab sender tracking
                  const sentByThisTab = Boolean(
                    (m.clientId && mySentClientIdsRef.current.has(m.clientId)) ||
                    (m.id && mySentClientIdsRef.current.has(m.id))
                  );

                  // 2. Explicit incoming / peer tracking
                  const isReceivedFromPeer = Boolean(
                    m.isReceived === true ||
                    m.isTheirs === true ||
                    m.is_theirs === true
                  );

                  // 3. Exact matching against Peer vs Me
                  const isSenderPeer = Boolean(
                    (peerId && msgSender && msgSender === peerId) ||
                    (peerName && msgSenderName && msgSenderName === peerName) ||
                    (peerName && msgSender && msgSender === peerName)
                  );

                  const isSenderMe = Boolean(
                    (myId && msgSender && msgSender === myId) ||
                    (tokenUserId && msgSender && msgSender === tokenUserId.toLowerCase()) ||
                    (myPseudonym && msgSenderName && msgSenderName === myPseudonym) ||
                    (myPseudonym && msgSender && msgSender === myPseudonym) ||
                    msgSender === "me" ||
                    msgSender === "self" ||
                    msgSender === "myself"
                  );

                  // 4. Determine bubble alignment
                  let isMine = false;
                  if (sentByThisTab) {
                    isMine = true;
                  } else if (isReceivedFromPeer) {
                    isMine = false;
                  } else if (isSenderPeer) {
                    isMine = false;
                  } else if (isSenderMe) {
                    isMine = true;
                  } else if (m.isMine === true || m.mine === true) {
                    isMine = !isSenderPeer;
                  } else {
                    // In 1-on-1 direct conversation:
                    // If sender does not match peerId, then it's mine!
                    isMine = peerId ? (msgSender !== peerId) : true;
                  }

                  if (isCallEvent) {
                    const isVideo = rawBody.toLowerCase().includes("video");
                    const isCancelledOrMissed = rawBody.toLowerCase().includes("cancel") || rawBody.toLowerCase().includes("miss");
                    const isCallMine = isMine;
                    const cleanCallText = rawBody.replace(/^[📞📹🎥🎙️📱☎️\s]+/, "");

                    return (
                      <div key={m.id} className={`wa-system-event-row ${isCallMine ? "mine" : "theirs"}`}>
                        <div className={`wa-system-event-pill ${isCallMine ? "mine" : "theirs"}`}>
                          <span className={`wa-call-icon ${isCancelledOrMissed ? "missed" : "success"}`}>
                            <Icon name={isVideo ? "video" : "phone"} />
                          </span>
                          <span>{cleanCallText}</span>
                          <span className="wa-event-time">{formatMessageTime(m.createdAt || m.created_at)}</span>
                        </div>
                      </div>
                    );
                  }

                  const isEditing = editingMsgId === m.id;
                  const isDeleted = m.isDeletedForEveryone;
                  const dropdownOpen = openDropdownMsgId === m.id;
                  const isReacting = openReactionMsgId === m.id;
                  const isFullReacting = openFullReactionMsgId === m.id;
                  const canEditOrDeleteEveryone = isWithin10Minutes(m.createdAt || m.created_at);

                  // Extract effective media URL and clean display caption
                  let rawMediaSource = m.mediaUrl || m.media_url || (m.mediaId ? m.mediaId : (m.media_id ? m.media_id : null));
                  let effectiveKind = m.kind || "text";
                  let displayBody = rawBody;

                  // Handle server-side photo messages: {kind: "photo", mediaId: "media-xxx", body: "Photo"}
                  if (!rawMediaSource && (m.mediaId || m.media_id)) {
                    rawMediaSource = m.mediaId || m.media_id;
                    if (effectiveKind === "text") effectiveKind = "photo";
                  }

                  // Wire tag pattern: [photo:URL] or [video:URL]
                  const mediaTagMatch = typeof rawBody === "string" ? rawBody.match(/\[(photo|image|video|media):([\s\S]+?)\]/i) : null;
                  if (mediaTagMatch) {
                    const tagType = mediaTagMatch[1].toLowerCase();
                    const tagUrl = mediaTagMatch[2].trim();
                    rawMediaSource = rawMediaSource || tagUrl;
                    if (!effectiveKind || effectiveKind === "text") {
                      effectiveKind = tagType === "video" ? "video" : "photo";
                    }
                    displayBody = rawBody.replace(mediaTagMatch[0], "").trim();
                  }

                  // Direct base64 image body detection (sender-side local preview or received)
                  if (typeof rawBody === "string") {
                    if (rawBody.startsWith("data:image/")) {
                      rawMediaSource = rawMediaSource || rawBody;
                      effectiveKind = "photo";
                      displayBody = "";
                    } else if (rawBody.startsWith("[photo:") && !rawMediaSource) {
                      const stripped = rawBody.replace(/^\[photo:/i, "").replace(/\]$/, "").trim();
                      rawMediaSource = rawMediaSource || stripped;
                      effectiveKind = "photo";
                      displayBody = "";
                    }
                  }

                  // Extract UUID from anywhere in source or body
                  const effectiveClientId = m.clientId || m.client_id;
                  const uuidInSource = (rawMediaSource || rawBody || m.mediaId || m.media_id || "").match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                  const parsedUuid = uuidInSource ? uuidInSource[1] : null;

                  // If rawMediaSource is not already a direct data/blob URL, check local caches strictly for THIS message
                  if (!rawMediaSource || (!rawMediaSource.startsWith("data:") && !rawMediaSource.startsWith("blob:"))) {
                    try {
                      const cachedDirect =
                        (parsedUuid ? localStorage.getItem(`jm_media_cache_${parsedUuid}`) : null) ||
                        (effectiveClientId ? localStorage.getItem(`jm_media_cache_${effectiveClientId}`) : null) ||
                        (m.id ? localStorage.getItem(`jm_media_cache_${m.id}`) : null) ||
                        (m.mediaId ? localStorage.getItem(`jm_media_cache_${m.mediaId}`) : null) ||
                        (m.media_id ? localStorage.getItem(`jm_media_cache_${m.media_id}`) : null);

                      if (cachedDirect && (cachedDirect.startsWith("data:") || cachedDirect.startsWith("blob:"))) {
                        rawMediaSource = cachedDirect;
                        effectiveKind = "photo";
                      }
                    } catch {}
                  }

                  const effectiveMediaUrl = rawMediaSource ? mediaService.getRawMediaUrl(rawMediaSource) : null;

                  const hasMedia =
                    effectiveKind === "photo" ||
                    effectiveKind === "video" ||
                    (Boolean(effectiveMediaUrl) &&
                      !m.fileName?.endsWith(".pdf") &&
                      effectiveKind !== "voice" &&
                      effectiveKind !== "file" &&
                      effectiveKind !== "audio");

                  const isPureMedia =
                    hasMedia &&
                    (!displayBody ||
                      displayBody === m.fileName ||
                      displayBody.toLowerCase() === "photo" ||
                      displayBody.toLowerCase() === "image" ||
                      displayBody.toLowerCase() === "video" ||
                      displayBody.toLowerCase() === "");

                  const emojiInfo =
                    !hasMedia && m.kind !== "voice" && m.kind !== "file" && !m.replyToSnippet
                      ? getEmojiMessageInfo(displayBody)
                      : { isEmojiOnly: false, count: 0 };
                  const isSingleEmoji = emojiInfo.isEmojiOnly && emojiInfo.count === 1;
                  const isFewEmoji = emojiInfo.isEmojiOnly && (emojiInfo.count === 2 || emojiInfo.count === 3);

                  return (
                    <div
                      key={m.id}
                      data-msg-id={m.id}
                      className={`wa-message-row ${isMine ? "mine" : "theirs"}`}
                    >
                      <div className={`wa-message-bubble-wrapper ${isMine ? "mine" : "theirs"}`}>
                        {/* If MINE: Actions appear on the LEFT outside the bubble */}
                        {isMine && !isDeleted && (
                          <div className={`wa-msg-outside-actions ${dropdownOpen || isReacting || isFullReacting ? "active" : ""}`}>
                            {/* 3. Outer: Reply Button (Flipped icon for right side message) */}
                            <button
                              type="button"
                              className="wa-outside-icon-btn wa-reply-btn"
                              onClick={() => setReplyTo(m)}
                              title="Reply"
                            >
                              <Icon name="reply" className="flip-x" />
                            </button>
                            {/* 2. Middle: Emoji React Button */}
                            <button
                              type="button"
                              className={`wa-outside-icon-btn wa-react-trigger ${isReacting || isFullReacting ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenReactionMsgId(isReacting ? null : m.id);
                                setOpenFullReactionMsgId(null);
                                setOpenDropdownMsgId(null);
                              }}
                              title="React with emoji"
                            >
                              <Icon name="react" />
                            </button>
                            {/* 1. Nearest to message: 3-Dot Dropdown Button */}
                            <button
                              type="button"
                              className={`wa-outside-icon-btn wa-dropdown-trigger ${dropdownOpen ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownMsgId(dropdownOpen ? null : m.id);
                                setOpenReactionMsgId(null);
                                setOpenFullReactionMsgId(null);
                              }}
                              title="More options (⋮)"
                            >
                              <Icon name="dots" />
                            </button>
                          </div>
                        )}

                        {/* Quick Reaction Popup (Opens on clicking 😊) */}
                        {isReacting && !isDeleted && (
                          <div className={`wa-quick-react-popup ${isMine ? "mine" : "theirs"}`}>
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="wa-quick-react-btn"
                                onClick={() => {
                                  handleReaction(m.id, emoji);
                                  setOpenReactionMsgId(null);
                                }}
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="wa-quick-react-btn wa-react-more-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFullReactionMsgId(m.id);
                                setOpenReactionMsgId(null);
                              }}
                              title="See more emojis (➕)"
                            >
                              ➕
                            </button>
                          </div>
                        )}

                        {/* Full Emoji Reaction Drawer (Opens on clicking ➕) */}
                        {isFullReacting && !isDeleted && (
                          <div className={`wa-full-react-drawer ${isMine ? "mine" : "theirs"}`}>
                            <div className="wa-emoji-categories">
                              {EMOJI_CATEGORIES.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  className={`wa-emoji-cat-btn ${activeReactCat === cat.id ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReactCat(cat.id);
                                  }}
                                  title={cat.label}
                                >
                                  {cat.icon}
                                </button>
                              ))}
                            </div>
                            <div className="wa-emoji-grid">
                              {EMOJI_CATEGORIES.find((c) => c.id === activeReactCat)?.emojis.map((emoji, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className="wa-emoji-item"
                                  onClick={() => {
                                    handleReaction(m.id, emoji);
                                    setOpenFullReactionMsgId(null);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3-Dot Dropdown Menu */}
                        {dropdownOpen && !isDeleted && (
                          <div className="wa-dropdown-menu">
                            {/* 1. Copy Text */}
                            {m.body && m.kind !== "voice" && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={() => handleCopyMessage(m.body)}
                              >
                                <Icon name="copy" />
                                <span>Copy text</span>
                              </button>
                            )}

                            {/* 2. Edit Message (ONLY if within 10 mins) */}
                            {isMine && canEditOrDeleteEveryone && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={() => handleStartEdit(m)}
                              >
                                <Icon name="edit" />
                                <span>Edit message</span>
                              </button>
                            )}

                            {/* 3. Delete Message */}
                            <button
                              type="button"
                              className="wa-dropdown-item danger"
                              onClick={() => openDeleteModal(m)}
                            >
                              <Icon name="trash" />
                              <span>Delete message…</span>
                            </button>
                          </div>
                        )}

                        {/* Bubble Body (Clean bubble without 3-dot inside) */}
                        <div
                          className={`wa-message-bubble ${isDeleted ? "is-deleted" : ""} ${
                            hasMedia ? "has-media" : ""
                          } ${isPureMedia ? "pure-media" : ""} ${
                            isSingleEmoji ? "is-emoji-only emoji-single" : ""
                          } ${isFewEmoji ? "is-emoji-only emoji-few" : ""}`}
                        >
                              {/* Inline Edit Form */}
                              {isEditing ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    style={{
                                      width: "100%",
                                      background: "rgba(0,0,0,0.3)",
                                      border: "1px solid var(--pink)",
                                      color: "#ffffff",
                                      borderRadius: "8px",
                                      padding: "8px",
                                      fontSize: "0.9rem",
                                    }}
                                    rows={2}
                                    autoFocus
                                  />
                                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                    <button
                                      type="button"
                                      className="button small primary"
                                      onClick={() => handleSaveEdit(m.id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="button small quiet"
                                      onClick={() => setEditingMsgId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Quoted Message */}
                                  {m.replyToSnippet && (
                                    <div className="wa-bubble-quote">
                                      <div className="wa-bubble-quote-sender">Replying</div>
                                      <div className="wa-bubble-quote-text">
                                        {typeof m.replyToSnippet === "string"
                                          ? m.replyToSnippet
                                          : typeof m.replyToSnippet === "object"
                                          ? m.replyToSnippet?.body || "Message"
                                          : String(m.replyToSnippet)}
                                      </div>
                                    </div>
                                  )}

                                  {/* 1. Gallery Attachment (Photo / Video) */}
                                  {hasMedia && (
                                    <div className="wa-bubble-media">
                                      {effectiveKind === "video" || m.kind === "video" ? (
                                        <video controls src={effectiveMediaUrl} />
                                      ) : (
                                        <AuthImage
                                          src={effectiveMediaUrl}
                                          alt="Shared photo"
                                          onClick={() => setLightboxImage(effectiveMediaUrl)}
                                        />
                                      )}
                                      {/* WhatsApp style overlay metadata for pure media */}
                                      {isPureMedia && (
                                        <div className="wa-bubble-meta media-overlay">
                                          {m.edited && <span className="wa-edited-badge">(edited)</span>}
                                          <span>{formatMessageTime(m.createdAt || m.created_at)}</span>
                                          {isMine && (
                                            <span
                                              className={`wa-ticks ${m.read ? "read" : "sent"}`}
                                              title={m.read ? "Read (Double Tick)" : "Sent (Single Tick)"}
                                            >
                                              {m.read ? "✓✓" : "✓"}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 2. Document / File Attachment */}
                                  {m.kind === "file" ||
                                  (m.fileName &&
                                    (m.fileName.endsWith(".pdf") ||
                                      m.fileName.endsWith(".doc") ||
                                      m.fileName.endsWith(".docx") ||
                                      m.fileName.endsWith(".zip") ||
                                      m.fileName.endsWith(".xlsx"))) ? (
                                    <div
                                      className="wa-bubble-doc"
                                      onClick={() => {
                                        if (effectiveMediaUrl) {
                                          const win = window.open();
                                          win.document.write(
                                            `<iframe src="${effectiveMediaUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                                          );
                                        } else {
                                          showToast("Opening document…");
                                        }
                                      }}
                                    >
                                      <div className="wa-doc-icon-box">📄</div>
                                      <div className="wa-doc-details">
                                        <div className="wa-doc-name">{m.fileName || displayBody || "Document.pdf"}</div>
                                        <div className="wa-doc-size">{m.fileSize || "PDF Document"}</div>
                                      </div>
                                      <button type="button" className="wa-doc-dl-btn" title="Download file">
                                        ⬇
                                      </button>
                                    </div>
                                  ) : null}

                                  {/* 3. Audio / Voice Note */}
                                  {m.kind === "voice" || m.kind === "audio" ? (
                                    <div className="wa-bubble-audio">
                                      <button
                                        type="button"
                                        className="wa-audio-play-btn"
                                        onClick={() =>
                                          handleToggleAudio(m.id, effectiveMediaUrl || `/api/media/${m.mediaId}`)
                                        }
                                      >
                                        {playingAudioId === m.id ? "⏸" : "▶"}
                                      </button>
                                      <div className="wa-audio-track">
                                        <div className="wa-waveform-bars">
                                          {[8, 14, 20, 12, 18, 24, 16, 22, 10, 16, 20, 14, 18, 12].map(
                                            (height, i) => (
                                              <span
                                                key={i}
                                                className={`wa-bar ${
                                                  playingAudioId === m.id && i < 7 ? "played" : ""
                                                }`}
                                                style={{ height: `${height}px` }}
                                              ></span>
                                            )
                                          )}
                                        </div>
                                        <div className="wa-audio-time-row">
                                          <span>🎙️ Voice Note</span>
                                          <span>0:15</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* Text / Emoji Message Content (Only if NOT pure media) */}
                                  {displayBody && m.kind !== "voice" && !isPureMedia && (
                                    isSingleEmoji ? (
                                      <div
                                        className="wa-emoji-single-content"
                                        title={displayBody}
                                        onClick={(e) => handleEmojiClickOnBubble(m, displayBody, e)}
                                      >
                                        {displayBody}
                                      </div>
                                    ) : isFewEmoji ? (
                                      <div
                                        className="wa-emoji-few-content"
                                        title={displayBody}
                                        onClick={(e) => handleEmojiClickOnBubble(m, displayBody, e)}
                                      >
                                        {displayBody}
                                      </div>
                                    ) : (
                                      <div
                                        className={hasMedia ? "wa-bubble-caption" : ""}
                                        style={{ whiteSpace: "pre-wrap", cursor: (displayBody.includes("❤️") || displayBody.includes("🌹") || displayBody.includes("💋")) ? "pointer" : "default" }}
                                        onClick={() => {
                                          if (displayBody.includes("❤️") || displayBody.includes("🌹") || displayBody.includes("💋") || displayBody.includes("😘")) {
                                            triggerEmojiShower("❤️");
                                          }
                                        }}
                                      >
                                        {displayBody}
                                      </div>
                                    )
                                  )}

                              {/* Metadata (Time, Edited tag, Read ticks) - Only if NOT pure media */}
                              {!isPureMedia && (
                                <div className="wa-bubble-meta">
                                  {m.edited && <span className="wa-edited-badge">(edited)</span>}
                                  <span>{formatMessageTime(m.createdAt || m.created_at)}</span>
                                  {isMine && (
                                    <span
                                      className={`wa-ticks ${m.read ? "read" : "sent"}`}
                                      title={m.read ? "Read (Double Tick)" : "Sent (Single Tick)"}
                                    >
                                      {m.read ? "✓✓" : "✓"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          {/* Emoji Reaction Badge on Bubble Corner */}
                          {m.reaction && (
                            <div
                              className="wa-reactions-badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(m.id, m.reaction);
                              }}
                              title="Remove reaction"
                            >
                              <span>{m.reaction}</span>
                              {Number(m.reactionCount) > 1 && (
                                <span style={{ fontSize: "0.72rem", color: "#e2d9e4", marginLeft: "3px", fontWeight: 600 }}>
                                  {m.reactionCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* If THEIRS: Actions appear on the RIGHT outside the bubble */}
                        {!isMine && !isDeleted && (
                          <div className={`wa-msg-outside-actions ${dropdownOpen || isReacting || isFullReacting ? "active" : ""}`}>
                            {/* 1. Nearest to message: 3-Dot Dropdown Button */}
                            <button
                              type="button"
                              className={`wa-outside-icon-btn wa-dropdown-trigger ${dropdownOpen ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownMsgId(dropdownOpen ? null : m.id);
                                setOpenReactionMsgId(null);
                                setOpenFullReactionMsgId(null);
                              }}
                              title="More options (⋮)"
                            >
                              <Icon name="dots" />
                            </button>
                            {/* 2. Middle: Emoji React Button */}
                            <button
                              type="button"
                              className={`wa-outside-icon-btn wa-react-trigger ${isReacting || isFullReacting ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenReactionMsgId(isReacting ? null : m.id);
                                setOpenFullReactionMsgId(null);
                                setOpenDropdownMsgId(null);
                              }}
                              title="React with emoji"
                            >
                              <Icon name="react" />
                            </button>
                            {/* 3. Outer: Reply Button */}
                            <button
                              type="button"
                              className="wa-outside-icon-btn wa-reply-btn"
                              onClick={() => setReplyTo(m)}
                              title="Reply"
                            >
                              <Icon name="reply" />
                            </button>
                          </div>
                        )}

                        {/* Quick Reaction Popup for Incoming Messages (Opens on clicking 😊) */}
                        {!isMine && isReacting && !isDeleted && (
                          <div className="wa-quick-react-popup theirs">
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="wa-quick-react-btn"
                                onClick={() => {
                                  handleReaction(m.id, emoji);
                                  setOpenReactionMsgId(null);
                                }}
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="wa-quick-react-btn wa-react-more-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFullReactionMsgId(m.id);
                                setOpenReactionMsgId(null);
                              }}
                              title="See more emojis (➕)"
                            >
                              ➕
                            </button>
                          </div>
                        )}

                        {/* Full Emoji Reaction Drawer for Incoming Messages (Opens on clicking ➕) */}
                        {!isMine && isFullReacting && !isDeleted && (
                          <div className="wa-full-react-drawer theirs">
                            <div className="wa-emoji-categories">
                              {EMOJI_CATEGORIES.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  className={`wa-emoji-cat-btn ${activeReactCat === cat.id ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReactCat(cat.id);
                                  }}
                                  title={cat.label}
                                >
                                  {cat.icon}
                                </button>
                              ))}
                            </div>
                            <div className="wa-emoji-grid">
                              {EMOJI_CATEGORIES.find((c) => c.id === activeReactCat)?.emojis.map((emoji, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className="wa-emoji-item"
                                  onClick={() => {
                                    handleReaction(m.id, emoji);
                                    setOpenFullReactionMsgId(null);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="wa-empty-starter-container">
                  <div className={`wa-welcome-avatar-circle portrait ${portraitClass(getPeerPortraitIndex(activeConn.peer))}`}>
                    {(activeConn.peer?.photo || activeConn.peer?.avatar || activeConn.peer?.avatarUrl || activeConn.peer?.imageUrl) ? (
                      <img
                        src={activeConn.peer?.photo || activeConn.peer?.avatar || activeConn.peer?.avatarUrl || activeConn.peer?.imageUrl}
                        alt={activeConn.peer?.pseudonym || "Match"}
                      />
                    ) : null}
                  </div>
                  <h3 style={{ color: "#ffffff", fontSize: "1.25rem", margin: "10px 0 4px", fontWeight: 800 }}>
                    Say hello to {activeConn.peer?.pseudonym || "your match"}!
                  </h3>
                  <p style={{ color: "#a390a6", fontSize: "0.86rem", marginBottom: "0", maxWidth: "380px" }}>
                    Send a message or voice note to start the conversation.
                  </p>
                </div>
              )}
            </div>

            {/* =========================================================
                BOTTOM COMPOSER: + Attachment Menu, Emoji Drawer, Mic, Send
            ========================================================= */}
            <div className="wa-composer-wrapper">
              {/* Quoted Reply Banner */}
              {replyTo && (
                <div className="wa-composer-reply-bar">
                  <div className="reply-text">
                    <strong>
                      Replying to {replyTo.sender === state.me?.id || replyTo.isMine || (activeConn.peer?.id && replyTo.sender !== activeConn.peer?.id) ? "yourself" : (activeConn.peer?.pseudonym || "Match")}:{" "}
                    </strong>
                    <span>"{replyTo.body.slice(0, 45)}…"</span>
                  </div>
                  <button
                    type="button"
                    className="close-btn"
                    onClick={() => setReplyTo(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Compact WhatsApp-style Pending Attachment Thumbnail */}
              {pendingAttachment && (
                <div className="wa-attachment-compact-preview">
                  {pendingAttachment.type === "gallery" ? (
                    <div className="wa-compact-media-card">
                      {pendingAttachment.mediaKind === "video" ? (
                        <video src={pendingAttachment.previewUrl} className="wa-compact-media-thumb" />
                      ) : (
                        <img src={pendingAttachment.previewUrl} alt="Preview" className="wa-compact-media-thumb" />
                      )}
                      <button
                        type="button"
                        className="wa-compact-close-btn"
                        onClick={() => setPendingAttachment(null)}
                        title="Remove attachment (✕)"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="wa-compact-doc-card">
                      <span style={{ fontSize: "1.1rem" }}>
                        {pendingAttachment.type === "audio" ? "🎵" : "📄"}
                      </span>
                      <span className="wa-compact-doc-name">{pendingAttachment.name}</span>
                      <button
                        type="button"
                        className="wa-compact-close-btn"
                        onClick={() => setPendingAttachment(null)}
                        title="Remove attachment (✕)"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* + (Attachment) 3-Category Floating Popup Menu */}
              {showAttachMenu && (
                <div className="wa-attachment-popup">
                  {/* Category 1: Gallery (Photo & Video) */}
                  <button
                    type="button"
                    className="wa-attach-option"
                    onClick={() => {
                      galleryInputRef.current?.click();
                    }}
                  >
                    <div className="wa-attach-icon-circle gallery">
                      <Icon name="image" />
                    </div>
                    <div className="wa-attach-text-group">
                      <div className="wa-attach-title">Gallery</div>
                      <div className="wa-attach-desc">Photos & Videos</div>
                    </div>
                  </button>

                  {/* Category 2: File (PDF & Documents) */}
                  <button
                    type="button"
                    className="wa-attach-option"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    <div className="wa-attach-icon-circle file">
                      <Icon name="file" />
                    </div>
                    <div className="wa-attach-text-group">
                      <div className="wa-attach-title">Document</div>
                      <div className="wa-attach-desc">PDFs & Files</div>
                    </div>
                  </button>

                  {/* Category 3: Audio Upload */}
                  <button
                    type="button"
                    className="wa-attach-option"
                    onClick={() => {
                      audioInputRef.current?.click();
                    }}
                  >
                    <div className="wa-attach-icon-circle audio">
                      <Icon name="music" />
                    </div>
                    <div className="wa-attach-text-group">
                      <div className="wa-attach-title">Audio</div>
                      <div className="wa-attach-desc">MP3, Voice & Music</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Emoji Drawer Popup */}
              {showEmojiDrawer && (
                <div className="wa-emoji-drawer">
                  <div className="wa-emoji-categories">
                    {EMOJI_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`wa-emoji-cat-btn ${activeEmojiCat === cat.id ? "active" : ""}`}
                        onClick={() => setActiveEmojiCat(cat.id)}
                        title={cat.label}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  <div className="wa-emoji-grid">
                    {EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCat)?.emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="wa-emoji-item"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Voice Recording Bar OR Standard Composer Form */}
              {isRecording ? (
                <div className="wa-voice-recording-bar">
                  <div className="wa-record-timer-group">
                    <span className="wa-record-dot"></span>
                    <span className="wa-record-time">
                      Recording: 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </span>
                  </div>
                  <div className="wa-record-actions">
                    <button
                      type="button"
                      className="wa-record-discard-btn"
                      onClick={cancelRecording}
                    >
                      🗑️ Cancel
                    </button>
                    <button
                      type="button"
                      className="wa-record-send-btn"
                      onClick={stopAndSendRecording}
                    >
                      ➤ Send Voice
                    </button>
                  </div>
                </div>
              ) : (
                <form className="wa-composer-form" onSubmit={handleSend}>
                  {/* + Attachment Button (Clean bare icon, no heavy circle border) */}
                  <button
                    type="button"
                    className={`wa-attach-bare-btn wa-attach-trigger ${showAttachMenu ? "active" : ""}`}
                    onClick={() => {
                      setShowAttachMenu((prev) => !prev);
                      setShowEmojiDrawer(false);
                    }}
                    title="Add attachments (Gallery, File, Audio)"
                  >
                    <Icon name="plus" />
                  </button>

                  {/* Emoji Picker Button (Outside message box) */}
                  <button
                    type="button"
                    className={`wa-emoji-bare-btn wa-emoji-trigger ${showEmojiDrawer ? "active" : ""}`}
                    onClick={() => {
                      setShowEmojiDrawer((prev) => !prev);
                      setShowAttachMenu(false);
                    }}
                    title="Insert emoji"
                  >
                    😊
                  </button>

                  {/* Main Message Text Input (Pill Box) */}
                  <textarea
                    ref={textInputRef}
                    className="wa-composer-input"
                    placeholder="Type a message…"
                    value={inputBody}
                    onChange={(e) => setInputBody(e.target.value)}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />

                  {/* Mic Voice Record Button */}
                  <button
                    type="button"
                    className="wa-composer-icon-btn"
                    onClick={startRecording}
                    title="Record voice note"
                  >
                    <Icon name="mic" />
                  </button>

                  {/* Smart AI Sentence Generator Button */}
                  <button
                    type="button"
                    className="wa-composer-icon-btn wa-spark-btn"
                    onClick={handleGenerateSmartReply}
                    title="Generate smart AI sentence in message box (⚡)"
                    style={{ fontSize: "1.1rem" }}
                  >
                    ⚡
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="wa-send-btn"
                    disabled={!inputBody.trim() && !pendingAttachment}
                    title="Send message"
                  >
                    <Icon name="send" />
                  </button>
                </form>
              )}
            </div>

            {/* Telegram-style Full-Chat Floating Emoji Shower Particles Overlay */}
            {floatingParticles.length > 0 && (
              <div className="wa-particles-overlay">
                {floatingParticles.map((p) => (
                  <span
                    key={p.id}
                    className="wa-floating-particle"
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

      {/* =========================================================
          RIGHT SIDEBAR: Contact Info Section (WhatsApp Web Style)
      ========================================================= */}
      {showContactPanel && activeConn?.peer && (
        <aside className="wa-contact-sidebar">
          <div className="wa-contact-sidebar-header">
            <div className="wa-contact-sidebar-title">
              <Icon name="info" />
              <span>Contact info</span>
            </div>
            <button
              type="button"
              className="wa-contact-sidebar-close-btn"
              onClick={() => setShowContactPanel(false)}
              title="Close contact info (✕)"
            >
              ✕
            </button>
          </div>

          <div className="wa-contact-sidebar-body">
            <ContactInfoModalContent
              peer={activeConn.peer}
              messages={messages}
              onOpenPhoto={(url) => setLightboxImage(url)}
              onOpenDoc={(url) => {
                if (url) {
                  const win = window.open();
                  win.document.write(
                    `<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                  );
                } else {
                  showToast("Opening document…");
                }
              }}
              onPlayAudio={(msgId, audioSrc) => {
                handleToggleAudio(msgId, audioSrc);
              }}
              onRequestPhoto={() => handleRequestPrivatePhoto()}
              onBlock={() => handleBlockUser()}
              onReport={() => handleReportUser()}
              onClose={() => setShowContactPanel(false)}
            />
          </div>
        </aside>
      )}

      {/* Lightbox Modal for Gallery Images */}
      {lightboxImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Enlarged media"
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.8)" }}
          />
        </div>
      )}
    </div>
  );
}

function ContactInfoModalContent({
  peer,
  messages,
  onOpenPhoto,
  onOpenDoc,
  onPlayAudio,
  onRequestPhoto,
  onBlock,
  onReport,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState("media"); // 'media' | 'docs' | 'audio'

  const resolveMediaUrl = (m) => {
    if (m.mediaUrl) return m.mediaUrl;
    if (typeof m.body === "string") {
      const match = m.body.match(/\[(photo|image|video|media):([^\]]+)\]/i);
      if (match) return match[2].trim();
      if (m.body.startsWith("data:image/")) return m.body;
    }
    if (m.mediaId) return `/api/media/${m.mediaId}`;
    try {
      const cached = localStorage.getItem(`jm_media_cache_${m.id}`) ||
        (m.clientId ? localStorage.getItem(`jm_media_cache_${m.clientId}`) : null) ||
        (m.mediaId ? localStorage.getItem(`jm_media_cache_${m.mediaId}`) : null);
      if (cached) return cached;
    } catch {}
    return null;
  };

  const mediaItems = messages.filter(
    (m) =>
      (m.kind === "photo" || m.kind === "video" || m.mediaUrl || Boolean(resolveMediaUrl(m))) &&
      !m.fileName?.endsWith(".pdf") &&
      m.kind !== "voice" &&
      m.kind !== "audio"
  );
  const docItems = messages.filter(
    (m) =>
      m.kind === "file" ||
      (m.fileName &&
        (m.fileName.endsWith(".pdf") ||
          m.fileName.endsWith(".doc") ||
          m.fileName.endsWith(".docx") ||
          m.fileName.endsWith(".zip") ||
          m.fileName.endsWith(".xlsx")))
  );
  const audioItems = messages.filter(
    (m) => m.kind === "voice" || m.kind === "audio" || (m.mediaId && m.kind !== "photo" && m.kind !== "video")
  );

  const avatarSrc = peer?.photo || peer?.avatar || peer?.avatarUrl || peer?.imageUrl;

  return (
    <div className="wa-contact-info-modal">
      {/* 1. Hero Card */}
      <div className="wa-contact-hero-card">
        <div className="wa-contact-avatar-container">
          <div className="wa-contact-avatar-glow-ring"></div>
          <div className={`wa-contact-avatar-circle portrait ${portraitClass(getPeerPortraitIndex(peer))}`}>
            {avatarSrc ? (
              <img src={avatarSrc} alt={peer?.pseudonym || "Contact"} className="wa-contact-avatar-img" />
            ) : null}
          </div>
          <div className="wa-contact-online-status" title="Active on Juicy Match">
            <span className="wa-contact-online-dot"></span>
          </div>
        </div>

        <h3 className="wa-contact-name">{peer?.pseudonym || peer?.name || "Match Member"}</h3>
        
        <div className="wa-contact-tags-row">
          {peer?.age && <span className="wa-contact-tag">{peer.age} yrs</span>}
          {(peer?.city || peer?.location) && (
            <span className="wa-contact-tag">📍 {peer.city || peer.location}</span>
          )}
          {peer?.occupation && (
            <span className="wa-contact-tag">💼 {peer.occupation}</span>
          )}
        </div>

        <div className="wa-contact-score-pill">
          <span className="wa-sparkle-icon">✨</span>
          <span>{peer?.compatibility || 94}% Compatibility Match</span>
        </div>
      </div>

      {/* 2. About / Bio */}
      <div className="wa-contact-section">
        <div className="wa-contact-section-title">
          <span>About & Desire</span>
        </div>
        <p style={{ fontSize: "0.88rem", color: "#e2d9e4", lineHeight: 1.5, margin: 0 }}>
          {peer?.bio || peer?.desire || peer?.statement || "Looking for genuine connection and authentic chemistry."}
        </p>
      </div>

      {/* 3. Media, Links and Docs Section */}
      <div className="wa-contact-section">
        <div className="wa-contact-section-title">
          <span>Media, links and docs</span>
        </div>

        {/* Tab Buttons */}
        <div className="wa-contact-media-tabs">
          <button
            type="button"
            className={`wa-contact-tab-btn ${activeTab === "media" ? "active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            Photos & Videos ({mediaItems.length})
          </button>
          <button
            type="button"
            className={`wa-contact-tab-btn ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            Docs ({docItems.length})
          </button>
          <button
            type="button"
            className={`wa-contact-tab-btn ${activeTab === "audio" ? "active" : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            Audio ({audioItems.length})
          </button>
        </div>

        {/* Tab 1: Photos & Videos */}
        {activeTab === "media" && (
          <div className="wa-contact-media-grid">
            {mediaItems.length > 0 ? (
              mediaItems.map((m) => {
                const url = resolveMediaUrl(m);
                const isVideo = m.kind === "video" || (typeof m.body === "string" && m.body.includes("[video:"));
                return (
                  <div
                    key={m.id}
                    className="wa-contact-media-thumb"
                    onClick={() => onOpenPhoto(url)}
                    title="Click to view full size"
                  >
                    {isVideo ? (
                      <video src={url} />
                    ) : (
                      <img src={url} alt="Media" loading="lazy" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="wa-contact-empty-media">No photos or videos shared yet</div>
            )}
          </div>
        )}

        {/* Tab 2: Documents */}
        {activeTab === "docs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {docItems.length > 0 ? (
              docItems.map((m) => (
                <div
                  key={m.id}
                  className="wa-bubble-doc"
                  style={{ background: "#241233", cursor: "pointer" }}
                  onClick={() => onOpenDoc(m.mediaUrl)}
                >
                  <div className="wa-doc-icon-box">📄</div>
                  <div className="wa-doc-details">
                    <div className="wa-doc-name">{m.fileName || m.body || "Document.pdf"}</div>
                    <div className="wa-doc-size">{m.fileSize || "PDF Document"}</div>
                  </div>
                  <button type="button" className="wa-doc-dl-btn" title="Open file">
                    ⬇
                  </button>
                </div>
              ))
            ) : (
              <div className="wa-contact-empty-media">No documents shared yet</div>
            )}
          </div>
        )}

        {/* Tab 3: Audio */}
        {activeTab === "audio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {audioItems.length > 0 ? (
              audioItems.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#241233",
                    padding: "10px 14px",
                    borderRadius: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="wa-audio-play-btn"
                    onClick={() => onPlayAudio(m.id, m.mediaUrl || `/api/media/${m.mediaId}`)}
                  >
                    ▶
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: 600 }}>🎙️ Voice Message</div>
                    <div style={{ fontSize: "0.74rem", color: "#a390a6" }}>
                      {formatMessageTime(m.createdAt || m.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="wa-contact-empty-media">No voice notes shared yet</div>
            )}
          </div>
        )}
      </div>

      {/* 4. Quick Actions */}
      <div style={{ display: "grid", gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          className="button quiet"
          style={{ justifyContent: "flex-start", padding: "10px 14px" }}
          onClick={() => {
            onClose();
            onRequestPhoto();
          }}
        >
          <Icon name="lock" /> Request private photo access
        </button>
        <button
          type="button"
          className="button quiet danger"
          style={{ justifyContent: "flex-start", padding: "10px 14px" }}
          onClick={() => {
            onClose();
            onBlock();
          }}
        >
          <Icon name="ban" /> Block {peer?.pseudonym || "contact"}
        </button>
        <button
          type="button"
          className="button quiet danger"
          style={{ justifyContent: "flex-start", padding: "10px 14px" }}
          onClick={() => {
            onClose();
            onReport();
          }}
        >
          <Icon name="flag" /> Report {peer?.pseudonym || "contact"}
        </button>
      </div>
    </div>
  );
}
