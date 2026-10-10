import React, { useState, useEffect, useRef } from "react";
import "../../../styles/chat.css";
import ChatSidebar from "./ChatSidebar";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ContactDrawer from "./ContactDrawer";
import EmojiShower from "./EmojiShower";
import MutualConsentBanner from "./MutualConsentBanner";
import AuthImage from "./AuthImage";
import { useChatEffects } from "./hooks/useChatEffects";
import { useVoiceRecorder } from "./hooks/useVoiceRecorder";
import { useChatSync } from "./hooks/useChatSync";
import { useBotSync } from "./hooks/useBotSync";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatActions } from "./hooks/useChatActions.jsx";
import { useSendMessage } from "./hooks/useSendMessage";
import { getLastMessageSnippet, formatBytes } from "./chatUtils";
import { useApp } from "../../../context/AppContext";
import Loader from "../../common/Loader";
import { chatService } from "../../../services/chatService";
import { blockService } from "../../../services/blockService";
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
    giveChatConsent,
  } = useApp();

  // Tab & Tracking References
  const tabIdRef = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const seenMsgIdsRef = useRef(new Set());
  const prevMsgReactionsRef = useRef({});
  const isInitialLoadRef = useRef(true);
  const mySentClientIdsRef = useRef(new Set());
  const typingTimeoutRef = useRef(null);

  // Hidden File & Composer Inputs
  const galleryInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // Conversations / Contacts State
  const [connections, setConnections] = useState([]);
  const [selectedConnId, setSelectedConnId] = useState(propConnectionId || null);
  const [loadingConns, setLoadingConns] = useState(
    !(state.connections && state.connections.length > 0)
  );
  const isLoadingConnsRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Composer & Menu State
  const [inputBody, setInputBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [openDropdownMsgId, setOpenDropdownMsgId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // Find currently active connection
  const activeConn =
    connections.find((c) => c.id === selectedConnId || c.connectionId === selectedConnId) ||
    state.connections?.find((c) => c.id === selectedConnId || c.connectionId === selectedConnId) ||
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

  // Client ID tracker for sent messages
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

  // Telegram-style Floating Emoji Shower Effects
  const { floatingParticles, triggerEmojiShower } = useChatEffects({
    triggerSound,
    activeConnId: activeConn?.id,
  });

  // Dedicated Chat Messages Hook
  const {
    messages,
    setMessages,
    loadingMsgs,
    loadMessages,
  } = useChatMessages({
    activeConn,
    state,
    tabIdRef,
    setConnections,
    isInitialLoadRef,
    seenMsgIdsRef,
    prevMsgReactionsRef,
    setIsPeerTyping,
  });

  // Dedicated Chat Actions Hook (Audio, Reactions, Edits, Deletion, Modals)
  const {
    playingAudioId,
    editingMsgId,
    setEditingMsgId,
    showContactPanel,
    setShowContactPanel,
    handleToggleAudio,
    handleReaction,
    handleStartEdit,
    handleSaveEdit,
    openDeleteModal,
    handleOpenContactInfo,
    handleBlockUser,
    handleReportUser,
    handleClearConversation,
    handleVoiceRecordingComplete,
  } = useChatActions({
    activeConn,
    state,
    tabIdRef,
    messages,
    setMessages,
    openModal,
    closeModal,
    showToast,
    blockMember,
    loadConnections: () => loadConnections(),
    triggerEmojiShower,
    markAsMySentMessage,
    setInputBody,
    setReplyTo,
    setPendingAttachment,
    setOpenDropdownMsgId,
  });

  // Dedicated Send Message Hook
  const { sending, handleSend } = useSendMessage({
    activeConn,
    state,
    tabIdRef,
    setMessages,
    setConnections,
    triggerSound,
    markAsMySentMessage,
    inputBody,
    setInputBody,
    replyTo,
    setReplyTo,
    pendingAttachment,
    setPendingAttachment,
    setShowAttachMenu,
    setShowEmojiDrawer,
    typingTimeoutRef,
    editingMsgId,
    setEditingMsgId,
    handleSaveEdit,
  });

  // Voice recording hook
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

  // Multi-tab, Socket.io & Receiver real-time synchronisation (human peers)
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

  // Bot-peer socket event integration (bot_typing + bot_message aliases)
  useBotSync({
    activeConn,
    setMessages,
    setConnections,
    onPeerTypingChange: setIsPeerTyping,
  });

  // 1. Fetch Conversations / Connections List (normalizes both id and connectionId)
  const loadConnections = async (isBackground = false) => {
    if (isLoadingConnsRef.current) return;
    isLoadingConnsRef.current = true;
    if (!isBackground) setLoadingConns(true);
    try {
      const res = await chatService.getConnections();
      const list = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
      const normalizedList = list.map((c) => {
        const validId = c.id || c.connectionId || c.connection_id;
        return {
          ...c,
          id: validId,
          connectionId: validId,
        };
      });

      const blocked = blockService.getBlockedMemberIds();
      const cleanList = normalizedList.filter(
        (c) =>
          !blocked.includes(String(c.peer?.id)) &&
          !blocked.includes(String(c.id)) &&
          c.status !== "blocked"
      );

      const fallbackConns = (state.connections && state.connections.length > 0 ? state.connections : []).map((c) => {
        const validId = c.id || c.connectionId || c.connection_id;
        return { ...c, id: validId, connectionId: validId };
      });
      const finalConnections = cleanList.length > 0 ? cleanList : fallbackConns;

      setConnections((prev) => {
        if (isBackground && prev.length > 0) {
          return finalConnections.map((fc) => {
            const existing = prev.find((p) => p.id === fc.id);
            return existing ? { ...fc, unreadCount: existing.unreadCount ?? fc.unreadCount } : fc;
          });
        }
        return finalConnections;
      });

      if (!isBackground && finalConnections.length > 0 && (!selectedConnId || !finalConnections.some((c) => c.id === selectedConnId))) {
        setSelectedConnId(finalConnections[0].id);
      } else if (!isBackground && finalConnections.length === 0) {
        setSelectedConnId(null);
      }
    } catch (err) {
      console.warn("Connections error:", err.message);
      if (!isBackground) {
        const fallbackConns = (state.connections && state.connections.length > 0 ? state.connections : []).map((c) => {
          const validId = c.id || c.connectionId || c.connection_id;
          return { ...c, id: validId, connectionId: validId };
        });
        setConnections(fallbackConns);
        if (fallbackConns.length > 0 && !selectedConnId) {
          setSelectedConnId(fallbackConns[0].id);
        }
      }
    } finally {
      isLoadingConnsRef.current = false;
      if (!isBackground) {
        setLoadingConns(false);
      }
    }
  };

  useEffect(() => {
    socketService.connect();
    loadConnections(false);

    const connsTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (socketService.isConnected) return;
      loadConnections(true);
    }, 60000);

    return () => clearInterval(connsTimer);
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

  // Mutual chat consent acceptance
  const handleAcceptConsent = async () => {
    if (!activeConn?.id) return;
    try {
      await giveChatConsent(activeConn.id);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === activeConn.id || c.connectionId === activeConn.id
            ? { ...c, state: "active", myConsent: true, peerConsent: true }
            : c
        )
      );
      loadMessages();
    } catch (err) {
      console.warn("Consent activation error:", err);
    }
  };

  // Calling Handlers
  const handleInitiateCall = (medium = "audio") => {
    if (!activeConn?.id) return;
    startCall(activeConn.id, medium, activeConn.peer);
  };

  // File Picker Handlers
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
            connections={filteredConnections}
            selectedConnId={selectedConnId}
            onSelectConn={setSelectedConnId}
            onSelectConnection={setSelectedConnId}
            onRefresh={loadConnections}
            onNavigateDiscover={() => navigate("discover")}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loading={loadingConns}
            loadingConns={loadingConns}
          />
        </div>

        <main className={`flex-1 flex flex-col min-w-0 bg-[#0e0714] relative z-0 shadow-lg ${!selectedConnId ? "hidden md:flex" : "flex"}`}>
          {!activeConn ? (
            loadingConns && connections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top_right,_rgba(233,22,113,0.06),_transparent_60%)]">
                <Loader text="Loading your conversations…" size="medium" />
              </div>
            ) : (
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
            )
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
                isPeerTyping={isPeerTyping}
              />

              {/* Mutual Consent Required Notification Banner */}
              {activeConn && (activeConn.state === "pending" || activeConn.myConsent === false) && (
                <MutualConsentBanner
                  peerName={activeConn.peer?.pseudonym || activeConn.peer?.name || "your match"}
                  onAccept={handleAcceptConsent}
                />
              )}

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
