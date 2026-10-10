import React, { useState, useRef } from "react";
import { chatService, saveLocalChatMessage } from "../../../../services/chatService";
import { mediaService } from "../../../../services/mediaService";
import { socketService } from "../../../../services/socketService";
import { getCurrentUserIdFromToken } from "../../../../services/api";
import { isWithinTimeLimit } from "../chatUtils";
import {
  DeleteModalContent,
  BlockModalContent,
  ReportModalContent,
  ClearConversationModalContent,
  RequestPhotoModalContent,
} from "../modals/ChatModals";

export function useChatActions({
  activeConn,
  state,
  tabIdRef,
  messages,
  setMessages,
  openModal,
  closeModal,
  showToast,
  blockMember,
  loadConnections,
  triggerEmojiShower,
  markAsMySentMessage,
  setInputBody,
  setReplyTo,
  setPendingAttachment,
  setOpenDropdownMsgId,
}) {
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const currentAudioElRef = useRef(null);

  // 1. Audio Player Handler
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

  // 2. Message Reactions
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
    setOpenDropdownMsgId?.(null);

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

  // 3. Edit Message
  const handleStartEdit = (msg) => {
    if (!msg) return;
    if (!isWithinTimeLimit(msg.createdAt || msg.created_at, 15)) {
      showToast("Messages can only be edited within 15 minutes of sending.");
      return;
    }
    setEditingMsgId(msg.id || msg.clientId);
    setInputBody(msg.body || "");
    setReplyTo?.(null);
    setPendingAttachment?.(null);
    setOpenDropdownMsgId?.(null);
  };

  const handleSaveEdit = async (messageId, newText) => {
    const textToSave = (newText || "").trim();
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

  // 4. Delete Message Modal
  const openDeleteModal = (msg) => {
    setOpenDropdownMsgId?.(null);
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

  // 5. Drawer & Moderation Handlers
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

  // 6. Voice Recording Complete Handler
  const handleVoiceRecordingComplete = async (base64Audio) => {
    try {
      showToast("Sending voice note…");
      const clientId = `client-voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      markAsMySentMessage(clientId);
      const tokenUserId = (typeof getCurrentUserIdFromToken === "function" ? getCurrentUserIdFromToken() : "") || "";
      const myId = state.me?.id || state.me?.account?.id || tokenUserId || "";
      const peerId = activeConn.peer?.id;

      const tempVoiceMsg = {
        id: clientId,
        clientId,
        connectionId: activeConn.id,
        connection_id: activeConn.id,
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

  return {
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
    handleRequestPrivatePhoto,
    handleBlockUser,
    handleReportUser,
    handleClearConversation,
    handleVoiceRecordingComplete,
  };
}
