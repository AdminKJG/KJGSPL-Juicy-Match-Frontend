import React, { useState, useEffect, useRef } from "react";
import "../../../styles/chat.css";
import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ContactDrawer from "./ContactDrawer";
import EmojiShower from "./EmojiShower";
import AuthImage, { blobUrlCache } from "./AuthImage";
import {
  DeleteModalContent,
  BlockModalContent,
  ReportModalContent,
  RequestPhotoModalContent,
  ClearConversationModalContent,
  AIStartersModalContent,
} from "./modals/ChatModals";
import { useChatEffects } from "./hooks/useChatEffects";
import { useVoiceRecorder } from "./hooks/useVoiceRecorder";
import { useChatSync } from "./hooks/useChatSync";
import {
  getLastMessageSnippet,
  getPeerOnlineStatus,
  formatBytes,
  isWithinTimeLimit,
} from "./chatUtils";
import { useApp } from "../../../context/AppContext";
import { chatService, saveLocalChatMessage, getLocalChatStore } from "../../../services/chatService";
import { mediaService } from "../../../services/mediaService";
import { aiService } from "../../../services/aiService";
import { blockService } from "../../../services/blockService";
import { getCurrentUserIdFromToken } from "../../../services/api";
import { socketService } from "../../../services/socketService";

export { AuthImage };

export default function ChatView({ connectionId: propConnectionId }) {
  const {
    state,
    navigate,
    openModal,
    closeModal,
    showToast,
    triggerSound,
    startCall,
    blockMember,
  } = useApp();

  // Tab & Tracking References
  const tabIdRef = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const seenMsgIdsRef = useRef(new Set());
  const prevMsgReactionsRef = useRef({});
  const isInitialLoadRef = useRef(true);
  const mySentClientIdsRef = useRef(new Set());
  const currentAudioElRef = useRef(null);

  // Hidden File & Composer Inputs
  const galleryInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const textInputRef = useRef(null);

  // Conversations / Contacts State
  const [connections, setConnections] = useState([]);
  const [selectedConnId, setSelectedConnId] = useState(propConnectionId || null);
  const [loadingConns, setLoadingConns] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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
  const [pendingAttachment, setPendingAttachment] = useState(null);

  // Attachment & Popup Menus
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [openDropdownMsgId, setOpenDropdownMsgId] = useState(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Telegram-style Floating Emoji Shower Effects
  const { floatingParticles, triggerEmojiShower } = useChatEffects({
    triggerSound,
    activeConnId: activeConn?.id,
  });

  // Initialize client IDs memory
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

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Multi-tab, Socket.io & Receiver real-time synchronization
  useChatSync({
    tabId: tabIdRef.current,
    activeConn,
    state,
    connections,
    setMessages,
    setConnections,
    triggerSound,
    triggerEmojiShower,
    onPeerTypingChange: setIsPeerTyping,
  });

  // 1. Fetch Conversations / Connections List
  const loadConnections = async () => {
    setLoadingConns(true);
    try {
      const res = await chatService.getConnections();
      const list = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
      const blocked = blockService.getBlockedMemberIds();
      const cleanList = list.filter(
        (c) =>
          !blocked.includes(String(c.peer?.id)) &&
          !blocked.includes(String(c.id)) &&
          c.status !== "blocked"
      );
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

  // Listen for block events across tabs/windows
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

  // 2. Fetch Messages for Active Connection
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

        const unsyncedLocal = prev.filter(
          (p) => !serverIds.has(p.id) && (!p.clientId || !serverClientIds.has(p.clientId))
        );

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

      setConnections((prev) =>
        prev.map((c) => (c.id === activeConn.id ? { ...c, unreadCount: 0 } : c))
      );

      const unread = combined.filter((m) => m.sender !== state.me?.id && !m.read);
      if (unread.length > 0) {
        const lastId = unread[unread.length - 1].id;
        chatService.markAsRead(activeConn.id, lastId).catch(() => {});
        setMessages((prev) =>
          prev.map((m) => (m.sender !== state.me?.id ? { ...m, read: true, isRead: true, status: "read" } : m))
        );

        try {
          const bc = new BroadcastChannel("jm_chat_messages_channel");
          const readPayload = {
            type: "MESSAGES_READ",
            tabId: tabIdRef.current,
            connectionId: activeConn.id,
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
  };

  useEffect(() => {
    if (activeConn?.id) {
      setConnections((prev) =>
        prev.map((c) => (c.id === activeConn.id ? { ...c, unreadCount: 0 } : c))
      );
      isInitialLoadRef.current = true;
      seenMsgIdsRef.current = new Set();
      prevMsgReactionsRef.current = {};
      setIsPeerTyping(false);
      loadMessages(false);
      setReplyTo(null);
      setPendingAttachment(null);
      setEditingMsgId(null);
      setOpenDropdownMsgId(null);
      setShowAttachMenu(false);
      setShowEmojiDrawer(false);

      // Join real-time socket room & mark messages as read
      socketService.joinConnection(activeConn.id);
      socketService.markAsRead(activeConn.id);
    }

    return () => {
      if (activeConn?.id) {
        socketService.leaveConnection(activeConn.id);
      }
    };
  }, [activeConn?.id]);

  // Re-sync messages when returning to the tab (Zero-polling architecture)
  useEffect(() => {
    if (!activeConn?.id) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadMessages(true);
        socketService.markAsRead(activeConn.id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeConn?.id]);

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".wa-attachment-popup") && !e.target.closest(".wa-attach-trigger")) {
        setShowAttachMenu(false);
      }
      if (!e.target.closest(".wa-emoji-drawer") && !e.target.closest(".wa-emoji-trigger")) {
        setShowEmojiDrawer(false);
      }
      if (!e.target.closest(".wa-dropdown-menu") && !e.target.closest(".wa-dropdown-trigger") && !e.target.closest(".jm-msg-hover-actions")) {
        setOpenDropdownMsgId(null);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  // 3. Send Message Handler
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!activeConn?.id) return;

    if (editingMsgId) {
      const currentEditingId = editingMsgId;
      const editedText = inputBody.trim();
      if (!editedText) return;
      setInputBody("");
      setEditingMsgId(null);
      await handleSaveEdit(currentEditingId, editedText);
      return;
    }

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

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (activeConn?.id) {
      try { socketService.stopTyping(activeConn.id); } catch {}
    }

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

    const optBody = isMediaAttachment
      ? (textToSend || "Photo")
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

    const pairKey = peerId ? [myId, peerId].sort().join("::") : null;
    saveLocalChatMessage([activeConn.id, pairKey], newMsg);

    if (attachmentToSend?.previewUrl) {
      try {
        localStorage.setItem(`jm_media_cache_${clientId}`, attachmentToSend.previewUrl);
        localStorage.setItem("jm_last_media_sent", attachmentToSend.previewUrl);
      } catch {}
    }

    setConnections((prev) =>
      prev.map((c) =>
        c.id === activeConn.id
          ? { ...c, lastMessage: newMsg, lastActive: new Date().toISOString() }
          : c
      )
    );

    const chatBroadcastPayload = {
      type: "NEW_MESSAGE",
      tabId: tabIdRef.current,
      connectionId: activeConn.id,
      message: {
        ...newMsg,
        mediaUrl: newMsg.mediaUrl,
        body: isMediaAttachment ? (textToSend || "Photo") : newMsg.body,
      },
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

    // Async background sending
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

            if (actualMediaId && peerId) {
              mediaService.grantPhotoAccess(actualMediaId, peerId, "granted").catch(() => {});
            }

            const serverPath = mediaRes?.url || (actualMediaId ? `/v1/media/${actualMediaId}` : null);
            const serverMediaUrl = serverPath ? mediaService.getRawMediaUrl(serverPath) : null;
            const effectiveMediaUrl = serverMediaUrl || attachmentToSend.previewUrl;
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
          try {
            socketService.sendMessage(activeConn.id, textToSend, clientId, currentReplyId).catch(() => {});
          } catch {}
          res = await chatService.sendMessage(activeConn.id, textToSend, currentReplyId, {
            clientId,
            senderId: myId,
            peerId,
          });
        }

        if (res) {
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
            prev.map((m) => (m.id === clientId || m.clientId === clientId ? finalMsg : m))
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

  const handleEmojiClick = (emoji) => {
    setInputBody((prev) => prev + emoji);
  };

  // 5. Voice Recording Hook
  const handleVoiceRecordingComplete = async (base64Audio) => {
    try {
      showToast("Sending voice note…");
      const clientId = `client-voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      markAsMySentMessage(clientId);
      const myId = state.me?.id || "jm-member-1";
      const peerId = activeConn.peer?.id;

      const tempVoiceMsg = {
        id: clientId,
        clientId,
        sender: myId,
        body: "🎙️ Voice note",
        kind: "voice",
        mediaUrl: base64Audio,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => [...prev, tempVoiceMsg]);

      try {
        localStorage.setItem(`jm_media_cache_${clientId}`, base64Audio);
        saveLocalChatMessage([activeConn.id, peerId ? [myId, peerId].sort().join("::") : null], tempVoiceMsg);
      } catch {}

      try {
        const bc = new BroadcastChannel("jm_chat_messages_channel");
        const payload = {
          type: "NEW_MESSAGE",
          tabId: tabIdRef.current,
          connectionId: activeConn.id,
          message: tempVoiceMsg,
          senderId: myId,
          recipientId: peerId,
          timestamp: Date.now(),
        };
        bc.postMessage(payload);
        localStorage.setItem(
          "jm_last_chat_message",
          JSON.stringify({ ...payload, _salt: Math.random() })
        );
      } catch {}

      let mediaRes = null;
      try {
        mediaRes = await mediaService.uploadMedia(base64Audio, "voice");
      } catch (upErr) {
        console.warn("Voice upload note:", upErr?.message);
      }
      const actualMediaId = mediaRes?.mediaId || mediaRes?.id;

      if (actualMediaId) {
        try {
          localStorage.setItem(`jm_media_cache_${actualMediaId}`, base64Audio);
        } catch {}
        if (peerId) {
          mediaService.grantPhotoAccess(actualMediaId, peerId, "granted").catch(() => {});
        }
      }

      if (activeConn?.id) {
        const voiceMsgRes = await chatService.sendVoiceNote(activeConn.id, actualMediaId, {
          clientId,
          senderId: myId,
          peerId,
          previewUrl: base64Audio,
        });
        if (voiceMsgRes) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === clientId || m.clientId === clientId
                ? { ...voiceMsgRes, mediaUrl: base64Audio }
                : m
            )
          );
        }
      }
      showToast("Voice note sent.");
    } catch (err) {
      showToast(err.message || "Could not send voice note.");
    }
  };

  const {
    isRecording,
    recordingSeconds,
    startRecording,
    stopAndSendRecording,
    cancelRecording,
  } = useVoiceRecorder({
    onRecordingComplete: handleVoiceRecordingComplete,
    showToast,
  });

  // 6. Audio Player Handler
  const handleToggleAudio = async (msgId, rawUrl) => {
    if (playingAudioId === msgId) {
      if (currentAudioElRef.current) {
        try { currentAudioElRef.current.pause(); } catch {}
        currentAudioElRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioElRef.current) {
      try { currentAudioElRef.current.pause(); } catch {}
      currentAudioElRef.current = null;
    }

    const targetMsg = messages.find((m) => m.id === msgId || m.clientId === msgId);
    let audioUrl = rawUrl || targetMsg?.mediaUrl || targetMsg?.media_url;

    if (!audioUrl && targetMsg) {
      const voiceTagMatch = typeof targetMsg.body === "string" && targetMsg.body.match(/\[(voice|audio):([\s\S]+?)\]/i);
      const uuidMatch = typeof targetMsg.body === "string" && targetMsg.body.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      const mediaRef = targetMsg.mediaId || targetMsg.media_id || (voiceTagMatch ? voiceTagMatch[2]?.trim() : null) || (uuidMatch ? uuidMatch[1] : null);
      if (mediaRef) {
        audioUrl = mediaService.getRawMediaUrl(mediaRef);
      }
    }

    if (!audioUrl && msgId) {
      audioUrl = (await mediaService.fetchMediaBlobUrl(msgId)) || mediaService.getRawMediaUrl(msgId);
    }

    if (!audioUrl) {
      showToast("Audio note source is unavailable.");
      return;
    }

    try {
      let finalPlayUrl = audioUrl;
      if (!audioUrl.startsWith("data:") && !audioUrl.startsWith("blob:") && !audioUrl.startsWith("http")) {
        const fetchedBlob = await mediaService.fetchMediaBlobUrl(audioUrl);
        if (fetchedBlob) {
          finalPlayUrl = fetchedBlob;
        } else if (audioUrl.length > 100) {
          finalPlayUrl = `data:audio/webm;base64,${audioUrl}`;
        }
      } else if (audioUrl.startsWith("http")) {
        const fetchedBlob = await mediaService.fetchMediaBlobUrl(audioUrl);
        if (fetchedBlob) finalPlayUrl = fetchedBlob;
      }

      if (currentAudioElRef.current) {
        try { currentAudioElRef.current.pause(); } catch {}
      }

      const audio = new Audio();
      audio.src = finalPlayUrl;
      currentAudioElRef.current = audio;
      setPlayingAudioId(msgId);

      audio.onended = () => {
        setPlayingAudioId(null);
        currentAudioElRef.current = null;
      };
      audio.onerror = (e) => {
        console.warn("Audio playback error:", e);
        setPlayingAudioId(null);
        currentAudioElRef.current = null;
        showToast("Cannot play voice note (unsupported or expired media source).");
      };
      await audio.play();
    } catch (err) {
      console.warn("Audio play note:", err.message);
      setPlayingAudioId(null);
      showToast(err.message || "Audio playback could not start.");
    }
  };

  // 7. Message Reactions
  const handleReaction = async (messageId, emoji) => {
    if (!messageId || !activeConn?.id) return;
    triggerEmojiShower(emoji, true, messageId);

    const tokenUid = (typeof getCurrentUserIdFromToken === "function" ? getCurrentUserIdFromToken() : "") || "";
    const myUserId = state.me?.id || state.me?.account?.id || tokenUid || "me";

    const targetMsg = messages.find((m) => m.id === messageId || m.clientId === messageId);
    let currentReactions = { ...(targetMsg?.reactions || (targetMsg?.reaction ? { [targetMsg.reaction]: 1 } : {})) };
    const myPrevEmoji = currentReactions[myUserId] || targetMsg?.reaction;
    const isRemoving = myPrevEmoji === emoji;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId && m.clientId !== messageId) return m;
        let nextReactions = { ...(m.reactions || (m.reaction ? { [myUserId]: m.reaction } : {})) };
        if (isRemoving) {
          delete nextReactions[myUserId];
          delete nextReactions[emoji];
          return {
            ...m,
            reaction: null,
            reactionCount: Math.max(0, (m.reactionCount || 1) - 1),
            reactions: Object.keys(nextReactions).length > 0 ? nextReactions : null,
          };
        } else {
          nextReactions[myUserId] = emoji;
          return {
            ...m,
            reaction: emoji,
            reactionCount: (m.reactionCount || 0) + 1,
            reactions: nextReactions,
          };
        }
      })
    );
    setOpenDropdownMsgId(null);

    try {
      const bc = new BroadcastChannel("jm_chat_messages_channel");
      bc.postMessage({
        type: "MESSAGE_REACTION",
        tabId: tabIdRef.current,
        connectionId: activeConn.id,
        messageId,
        emoji: isRemoving ? null : emoji,
        userId: myUserId,
      });
    } catch {}

    try {
      socketService.reactMessage(activeConn.id, messageId, isRemoving ? null : emoji);
    } catch {}

    try {
      await chatService.addReaction(activeConn.id, messageId, isRemoving ? null : emoji);
    } catch (err) {
      console.warn("Reaction API note:", err.message);
    }
  };

  // 8. Edit Message
  const handleStartEdit = (msg) => {
    if (!msg) return;
    if (!isWithinTimeLimit(msg.createdAt || msg.created_at, 15)) {
      showToast("Messages can only be edited within 15 minutes of sending.");
      return;
    }
    setEditingMsgId(msg.id || msg.clientId);
    setInputBody(msg.body || "");
    setReplyTo(null);
    setPendingAttachment(null);
    setOpenDropdownMsgId(null);
  };

  const handleSaveEdit = async (messageId, newText) => {
    const textToSave = (newText || inputBody || "").trim();
    if (!textToSave || !activeConn?.id) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId || m.clientId === messageId
          ? { ...m, body: textToSave, edited: true, isEdited: true }
          : m
      )
    );
    setEditingMsgId(null);
    setInputBody("");
    showToast("Message edited.");

    try {
      socketService.editMessage(activeConn.id, messageId, textToSave).catch(() => {});
    } catch {}

    try {
      await chatService.editMessage(activeConn.id, messageId, textToSave);
    } catch (err) {
      console.warn("Edit API note:", err.message);
    }
  };

  // 9. Delete Message Modal
  const openDeleteModal = (msg) => {
    setOpenDropdownMsgId(null);
    const canDeleteForEveryone = isWithinTimeLimit(msg.createdAt || msg.created_at, 15);

    openModal(
      "Delete Message?",
      <DeleteModalContent
        msg={msg}
        canDeleteForEveryone={canDeleteForEveryone}
        onDeleteForMe={() => {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          closeModal();
          showToast("Message deleted for you.");
        }}
        onDeleteForEveryone={async () => {
          if (!canDeleteForEveryone) return;
          try {
            if (activeConn?.id) {
              socketService.deleteMessage(activeConn.id, msg.id, "everyone").catch(() => {});
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
        onClose={closeModal}
      />
    );
  };

  // 10. Modals & Actions
  const handleOpenContactInfo = () => {
    if (!activeConn?.peer) return;
    setShowContactPanel((prev) => !prev);
  };

  const handleRequestPrivatePhoto = () => {
    openModal(
      "Request Private Photos",
      <RequestPhotoModalContent
        peerName={activeConn.peer?.pseudonym}
        onConfirm={async () => {
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
        onClose={closeModal}
      />
    );
  };

  const handleBlockUser = () => {
    openModal(
      "Block Member?",
      <BlockModalContent
        peerName={activeConn.peer?.pseudonym}
        onConfirm={async () => {
          try {
            const targetId = activeConn.peer?.id || activeConn.id;
            await blockMember(targetId);
            closeModal();
            loadConnections();
          } catch (err) {
            showToast(err.message || "Failed to block member.");
          }
        }}
        onClose={closeModal}
      />
    );
  };

  const handleReportUser = () => {
    openModal(
      "Report Member",
      <ReportModalContent
        peerName={activeConn.peer?.pseudonym}
        onSubmit={async (details) => {
          try {
            await chatService.reportMember(
              activeConn.peer?.id || activeConn.id,
              details
            );
            closeModal();
            showToast("Report submitted. Thank you for helping keep Juicy safe.");
          } catch (err) {
            showToast(err.message || "Failed to submit report.");
          }
        }}
        onClose={closeModal}
      />
    );
  };

  const handleClearConversation = () => {
    openModal(
      "Clear Conversation?",
      <ClearConversationModalContent
        peerName={activeConn.peer?.pseudonym}
        onConfirm={async () => {
          try {
            if (chatService.clearConversation) {
              await chatService.clearConversation(activeConn.id);
            }
          } catch (err) {}
          setMessages([]);
          closeModal();
          showToast("Conversation cleared.");
        }}
        onClose={closeModal}
      />
    );
  };

  const handleInitiateCall = (medium = "audio") => {
    if (!activeConn?.id) return;
    startCall(activeConn.id, medium, activeConn.peer);
  };

  const handleInputChange = (newText) => {
    setInputBody(newText);
    if (activeConn?.id) {
      if (typeof newText === "string" && newText.trim().length > 0) {
        try { socketService.startTyping(activeConn.id); } catch {}
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          if (activeConn?.id) {
            try { socketService.stopTyping(activeConn.id); } catch {}
          }
        }, 2500);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        try { socketService.stopTyping(activeConn.id); } catch {}
      }
    }
  };

  return (
    <div className="w-full h-full bg-[#0c0612] flex items-center justify-center p-0 md:p-3 lg:p-5 overflow-hidden">
      <div className="w-full h-full max-w-[1240px] bg-[#14091a] border-0 md:border md:border-white/10 md:rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.55)] flex overflow-hidden relative font-sans">
        <input type="file" ref={galleryInputRef} onChange={handleSelectGallery} accept="image/*,video/*" className="hidden" />
        <input type="file" ref={fileInputRef} onChange={handleSelectDocument} accept=".pdf,.doc,.docx,.txt,.zip,.xlsx,.csv,application/*" className="hidden" />
        <input type="file" ref={audioInputRef} onChange={handleSelectAudioFile} accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" className="hidden" />

        <div className={`flex-shrink-0 w-full md:w-[260px] lg:w-[280px] md:block ${selectedConnId ? "hidden" : "block"}`}>
          <ChatSidebar
            connections={connections}
            selectedConnId={selectedConnId}
            onSelectConn={setSelectedConnId}
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

        <main className={`flex-1 flex flex-col min-w-0 bg-[#0e0714] relative z-0 shadow-lg ${!selectedConnId ? "hidden md:flex" : "flex"}`}>
          {!activeConn ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top_right,_rgba(233,22,113,0.06),_transparent_60%)]">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Juicy Match Chats</h3>
              <p className="text-xs text-white/60 text-center max-w-xs leading-relaxed mb-4">
                Select a conversation from the list to start chatting, share photos, or initiate voice & video calls.
              </p>
              <button
                type="button"
                onClick={() => navigate("discover")}
                className="px-4 py-2 rounded-full bg-[#e91671] hover:bg-[#ff2082] text-white text-xs font-semibold transition-all shadow-[0_4px_16px_rgba(233,22,113,0.4)]"
              >
                Discover New Matches
              </button>
            </div>
          ) : (
            <>
              <ChatHeader
                activeConn={activeConn}
                isPeerTyping={isPeerTyping}
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
                onToggleAudio={handleToggleAudio}
                playingAudioId={playingAudioId}
              />
              <MessageInput
                inputBody={inputBody}
                setInputBody={handleInputChange}
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
                handleCancelReplyEdit={() => { setReplyTo(null); setEditingMsgId(null); setInputBody(""); }}
                handleEmojiSelect={handleEmojiClick}
                prompts={[]}
                onPromptClick={() => {}}
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                onStartRecording={startRecording}
                onStopRecording={stopAndSendRecording}
                onCancelRecording={cancelRecording}
              />
              <EmojiShower floatingParticles={floatingParticles} />
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
    </div>
  );
}
