import { useState } from "react";
import { chatService, saveLocalChatMessage } from "../../../../services/chatService";
import { mediaService } from "../../../../services/mediaService";
import { socketService } from "../../../../services/socketService";
import { getCurrentUserIdFromToken } from "../../../../services/api";

export function useSendMessage({
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
}) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (editingMsgId) {
      const currentEditingId = editingMsgId;
      const editedText = inputBody;
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
      connectionId: activeConn.id,
      connection_id: activeConn.id,
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
            } catch (upErr) {
              console.warn("Upload audio file note:", upErr?.message);
            }
            const actualMediaId = mediaRes?.mediaId || mediaRes?.id;
            if (actualMediaId) {
              try { localStorage.setItem(`jm_media_cache_${actualMediaId}`, attachmentToSend.previewUrl); } catch {}
              if (peerId) {
                mediaService.grantPhotoAccess(actualMediaId, peerId, "granted").catch(() => {});
              }
            }

            res = await chatService.sendVoiceNote(activeConn.id, actualMediaId, {
              clientId,
              senderId: myId,
              peerId,
              previewUrl: attachmentToSend.previewUrl,
            });
          } else {
            let mediaRes = null;
            const uploadKind = isVideoAttachment ? "video" : (isPhotoAttachment ? "photo" : "document");
            try {
              mediaRes = await mediaService.uploadMedia(
                attachmentToSend.previewUrl || attachmentToSend.file,
                uploadKind,
                false
              );
            } catch (upErr) {
              console.warn("Media upload note:", upErr?.message);
            }

            const actualMediaId = mediaRes?.mediaId || mediaRes?.id;
            const effectiveMediaUrl =
              mediaRes?.url ||
              mediaRes?.mediaUrl ||
              (actualMediaId ? mediaService.getRawMediaUrl(actualMediaId) : null) ||
              attachmentToSend.previewUrl;

            if (actualMediaId) {
              try {
                localStorage.setItem(`jm_media_cache_${actualMediaId}`, effectiveMediaUrl);
              } catch {}
              if (peerId) {
                mediaService.grantPhotoAccess(actualMediaId, peerId, "granted").catch(() => {});
              }
            }

            const wireBody = actualMediaId
              ? `[${mediaTagKind}:${actualMediaId}]`
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
            ...res,
            clientId,
            client_id: clientId,
            connectionId: activeConn.id,
            connection_id: activeConn.id,
            mediaUrl: serverMediaUrl || newMsg.mediaUrl,
            fileName: res.fileName || newMsg.fileName,
            fileSize: res.fileSize || newMsg.fileSize,
            kind: res.kind || newMsg.kind,
            replyToSnippet: res.replyToSnippet || newMsg.replyToSnippet,
            replyToId: res.replyToId || newMsg.replyToId,
            isMine: true,
            mine: true,
          };

          if (finalMsg.mediaUrl) {
            try {
              localStorage.setItem(`jm_media_cache_${finalMsg.id}`, finalMsg.mediaUrl);
              if (finalMsg.mediaId) localStorage.setItem(`jm_media_cache_${finalMsg.mediaId}`, finalMsg.mediaUrl);
            } catch {}
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === clientId || m.clientId === clientId
                ? finalMsg
                : m
            )
          );

          saveLocalChatMessage([activeConn.id, pairKey], finalMsg);

          const payload = {
            type: "MESSAGE_CONFIRMED",
            tabId: tabIdRef.current,
            connectionId: activeConn.id,
            clientId,
            serverMessage: finalMsg,
            senderId: myId,
            recipientId: peerId,
            timestamp: Date.now(),
          };

          try {
            const bc = new BroadcastChannel("jm_chat_messages_channel");
            bc.postMessage(payload);
          } catch {}

          try {
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

  return {
    sending,
    handleSend,
  };
}
