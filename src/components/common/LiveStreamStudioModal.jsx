import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import { livestreamService, endStreamBeacon, broadcastLiveEvent } from "../../services/livestreamService";
import { portraitClass, getPeerPortraitIndex } from "../../utils/formatters";

// ─── LiveKit Dynamic Loader ──────────────────────────────────────────────────
let LiveKitRoom = null;
let LiveKitRoomEvent = null;
let livekitLoaded = false;

async function loadLiveKit() {
  if (livekitLoaded) return true;
  try {
    const { Room, RoomEvent } = await import("livekit-client");
    LiveKitRoom = Room;
    LiveKitRoomEvent = RoomEvent;
    livekitLoaded = true;
    return true;
  } catch (err) {
    console.warn("[JM Live] LiveKit client load failed:", err.message);
    return false;
  }
}

export default function LiveStreamStudioModal({
  stream,          // Stream info: { id, title, hostId, hostName, hostPortrait, viewerCount, ... }
  role = "viewer", // "host" | "viewer"
  onClose,
  onStreamEnded,
  showToast,
}) {
  const isHost = role === "host";
  const streamId = stream?.id;

  // Stream state
  const [viewerCount, setViewerCount] = useState(stream?.viewerCount || (isHost ? 1 : 1));
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectingStatus, setConnectingStatus] = useState("Connecting to live stream…");
  const [streamEndedBanner, setStreamEndedBanner] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMutedByHost, setIsMutedByHost] = useState(false);
  const [moderationTarget, setModerationTarget] = useState(null);

  // Media refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const lkRoomRef = useRef(null);
  const sseRef = useRef(null);
  const chatScrollRef = useRef(null);
  const hasEndedRef = useRef(false);

  const triggerStreamEnded = useCallback((meta = {}) => {
    hasEndedRef.current = true;
    if (streamId) {
      livestreamService.markStreamEndedLocally(streamId, {
        hostName: stream?.hostName || stream?.pseudonym,
        title: stream?.title,
        endedAt: new Date().toISOString(),
        ...meta,
      });
      onStreamEnded?.(streamId);
    }
    setStreamEndedBanner(true);
  }, [streamId, stream, onStreamEnded]);

  // ── 1. Fetch initial chat history ──────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;
    livestreamService.getMessages(streamId, 40).then((msgs) => {
      if (Array.isArray(msgs)) {
        setMessages(msgs);
      }
    });
  }, [streamId]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── 2. Local Media Setup for Host ──────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    let active = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("[JM Live] Camera/Mic access error:", err.message);
        showToast?.("Camera/mic permission needed for live broadcast.");
      }
    }

    startCamera();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isHost, showToast]);

  // ── 3. Connect LiveKit & Publish/Subscribe ──────────────────────────────────
  useEffect(() => {
    if (!streamId) return;
    let active = true;

    async function initLiveKit() {
      try {
        setConnectingStatus("Connecting to live broadcast…");
        let tokenRes = null;
        try {
          tokenRes = await livestreamService.getStreamToken(streamId);
        } catch (tokenErr) {
          console.warn("[JM Live] LiveKit token note (using broadcast studio room):", tokenErr.message);
        }

        if (tokenRes?.status === "ended" || tokenRes?.ended === true) {
          triggerStreamEnded();
          return;
        }

        const wsUrl = tokenRes?.url || tokenRes?.serverUrl;
        const token = tokenRes?.token;

        if (wsUrl && token) {
          const ok = await loadLiveKit();
          if (ok) {
            setConnectingStatus("Joining media broadcast…");
            const room = new LiveKitRoom({
              adaptiveStream: true,
              dynacast: true,
            });
            lkRoomRef.current = room;

            // Remote tracks handler (viewer watching host)
            room.on(LiveKitRoomEvent.TrackSubscribed, (track) => {
              console.log("[JM Live] Subscribed to track:", track.kind);
              if (track.kind === "video" && remoteVideoRef.current) {
                const ms = new MediaStream([track.mediaStreamTrack]);
                remoteVideoRef.current.srcObject = ms;
                remoteVideoRef.current.play().catch(() => {});
              } else if (track.kind === "audio" && remoteAudioRef.current) {
                const ms = new MediaStream([track.mediaStreamTrack]);
                remoteAudioRef.current.srcObject = ms;
                remoteAudioRef.current.play().catch(() => {});
              }
            });

            room.on(LiveKitRoomEvent.Disconnected, () => {
              console.log("[JM Live] Room disconnected");
              if (!isHost && !hasEndedRef.current) {
                triggerStreamEnded();
              }
            });

            // Connect room
            await room.connect(wsUrl, token, { autoSubscribe: true });
            if (!active) { room.disconnect(); return; }

            console.log("[JM Live] ✅ Connected to LiveKit room:", room.name);
            setIsConnected(true);

            // If host, publish local audio & video tracks
            if (isHost && localStreamRef.current) {
              const { LocalAudioTrack, LocalVideoTrack } = await import("livekit-client");
              for (const at of localStreamRef.current.getAudioTracks()) {
                try {
                  const lkAt = new LocalAudioTrack(at, undefined, false);
                  await room.localParticipant.publishTrack(lkAt);
                } catch (e) { console.warn("[JM Live] Audio pub:", e.message); }
              }
              for (const vt of localStreamRef.current.getVideoTracks()) {
                try {
                  const lkVt = new LocalVideoTrack(vt, undefined, false);
                  await room.localParticipant.publishTrack(lkVt);
                } catch (e) { console.warn("[JM Live] Video pub:", e.message); }
              }
            }

            // For viewers: check existing published tracks in room
            if (!isHost) {
              room.participants.forEach((p) => {
                p.tracks.forEach((pub) => {
                  if (pub.isSubscribed && pub.track) {
                    if (pub.track.kind === "video" && remoteVideoRef.current) {
                      remoteVideoRef.current.srcObject = new MediaStream([pub.track.mediaStreamTrack]);
                      remoteVideoRef.current.play().catch(() => {});
                    } else if (pub.track.kind === "audio" && remoteAudioRef.current) {
                      remoteAudioRef.current.srcObject = new MediaStream([pub.track.mediaStreamTrack]);
                      remoteAudioRef.current.play().catch(() => {});
                    }
                  }
                });
              });
            }
          } else {
            setIsConnected(true);
          }
        } else {
          setIsConnected(true);
        }
      } catch (err) {
        console.warn("[JM Live] Connection fallback:", err.message);
        setIsConnected(true);
      }
    }

    initLiveKit();

    return () => {
      active = false;
      if (lkRoomRef.current) {
        try { lkRoomRef.current.disconnect(); } catch {}
        lkRoomRef.current = null;
      }
    };
  }, [streamId, isHost]);

  // ── 4. Connect SSE Stream (Real-Time Events) ───────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    let active = true;
    livestreamService.connectEvents(
      streamId,
      (event) => {
        if (!active) return;
        console.log("[JM Live SSE] Received event:", event);

        // Viewer count update (ready, livestream.viewers, livestream.viewer_count)
        if (
          event.type === "ready" ||
          event.type === "livestream.viewers" ||
          event.type === "livestream.viewer_count" ||
          event.viewerCount !== undefined
        ) {
          if (typeof event.viewerCount === "number") {
            setViewerCount(event.viewerCount);
          }
        }

        // New chat message
        if (event.type === "livestream.message" || (event.body && !event.type?.startsWith("livestream."))) {
          const newMsg = {
            id: event.id || `msg-${Date.now()}`,
            sender: event.sender,
            pseudonym: event.pseudonym || "Viewer",
            body: event.body || event.text || event.message,
            createdAt: event.createdAt || new Date().toISOString(),
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }

        // Stream ended by host
        if (event.type === "livestream.end") {
          console.log("[JM Live SSE] Stream ended by host");
          triggerStreamEnded();
        }

        // Viewer muted
        if (event.type === "livestream.muted") {
          showToast?.(`Viewer ${event.viewer || ""} was muted by host.`);
        }

        // Viewer banned
        if (event.type === "livestream.banned") {
          showToast?.(`Viewer ${event.viewer || ""} was banned from the stream.`);
        }
      },
      () => {
        // Fallback polling for chat messages if SSE connection has issues
        console.log("[JM Live] SSE reconnecting or fallback polling active");
      }
    ).then((es) => {
      if (active) sseRef.current = es;
      else es?.close();
    });

    // Fallback polling interval every 4s for messages
    const pollInterval = setInterval(async () => {
      if (!active || hasEndedRef.current) return;
      try {
        const latest = await livestreamService.getMessages(streamId, 25);
        if (Array.isArray(latest) && latest.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = latest.filter((m) => !existingIds.has(m.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      } catch {}
    }, 4000);

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {}
        sseRef.current = null;
      }
    };
  }, [streamId, showToast]);

  // ── Lifecycle & Sync: Unload & Host Cleanup ────────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    // 1. If host: terminate broadcast on page close / refresh / navigate
    if (isHost) {
      const handleUnload = () => {
        endStreamBeacon(streamId);
      };
      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("pagehide", handleUnload);

      return () => {
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("pagehide", handleUnload);
        if (!hasEndedRef.current) {
          livestreamService.endStream(streamId, {
            hostName: stream?.hostName || stream?.pseudonym,
            title: stream?.title,
          }).catch(() => {});
        }
      };
    }

    // 2. If viewer: listen for live stream end broadcasts
    if (!isHost) {
      let channel = null;
      try {
        channel = new BroadcastChannel("jm_live_channel");
        channel.onmessage = (e) => {
          if (e.data?.type === "HOST_ENDED_LIVE" && e.data?.streamId === streamId) {
            triggerStreamEnded();
          }
        };
      } catch {}

      const handleStorage = (e) => {
        if (e.key === "jm_last_live_event" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data?.type === "HOST_ENDED_LIVE" && data?.streamId === streamId) {
              triggerStreamEnded();
            }
          } catch {}
        }
      };
      window.addEventListener("storage", handleStorage);

      return () => {
        if (channel) channel.close();
        window.removeEventListener("storage", handleStorage);
      };
    }
  }, [streamId, isHost, stream, triggerStreamEnded]);

  // ── 5. End Stream (Host) ───────────────────────────────────────────────────
  const handleEndStream = async () => {
    triggerStreamEnded();
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (lkRoomRef.current) {
        try { lkRoomRef.current.disconnect(); } catch {}
        lkRoomRef.current = null;
      }
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {}
        sseRef.current = null;
      }
      showToast?.("Live broadcast ended.");
      onClose?.();
      await livestreamService.endStream(streamId, {
        hostName: stream?.hostName || stream?.pseudonym,
        title: stream?.title,
      }).catch(() => {});
    } catch {
      onClose?.();
    }
  };

  // ── 6. Leave Stream (Viewer) ───────────────────────────────────────────────
  const handleLeaveStream = async () => {
    hasEndedRef.current = true;
    try {
      if (lkRoomRef.current) {
        try { lkRoomRef.current.disconnect(); } catch {}
        lkRoomRef.current = null;
      }
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {}
        sseRef.current = null;
      }
      onClose?.();
      await livestreamService.leaveStream(streamId).catch(() => {});
    } catch {
      onClose?.();
    }
  };

  // ── 7. Send Chat Message ───────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setChatInput("");

    // Optimistic UI message
    const tempMsg = {
      id: `local-${Date.now()}`,
      sender: "me",
      pseudonym: isHost ? (stream?.hostName || "Host") : "You",
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await livestreamService.sendMessage(streamId, text);
    } catch (err) {
      console.warn("[JM Live] Failed to send message:", err.message);
    } finally {
      setIsSending(false);
    }
  };

  // ── 8. Floating Reaction Emojis ────────────────────────────────────────────
  const handleSendReaction = (emoji) => {
    // Spawn floating emoji animation
    const id = Date.now() + Math.random();
    const leftPercent = 65 + Math.random() * 25; // Random horizontal spread
    setFloatingEmojis((prev) => [...prev, { id, emoji, left: leftPercent }]);

    // Remove from array after animation completes
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2400);

    // Send as chat message reaction
    livestreamService.sendMessage(streamId, emoji).catch(() => {});
  };

  // ── 9. Toggle Mic & Video (Host controls) ──────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => { t.enabled = isMuted; });
    }
    if (lkRoomRef.current) {
      lkRoomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => { t.enabled = isVideoOff; });
    }
    if (lkRoomRef.current) {
      lkRoomRef.current.localParticipant.setCameraEnabled(isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  // ── 10. Report Stream ──────────────────────────────────────────────────────
  const handleReport = async (reason) => {
    setShowReportModal(false);
    try {
      await livestreamService.reportStream(streamId, reason);
      showToast?.("Report submitted. Thank you for keeping JuicyMatch safe.");
    } catch {
      showToast?.("Report submitted.");
    }
  };

  const hostName = stream?.hostName || stream?.pseudonym || "Host";
  const streamTitle = stream?.title || "Live Broadcast";
  const portraitIdx = stream?.hostPortrait ?? 0;

  return (
    <div className="wa-live-overlay-container">
      {/* Hidden remote audio element for viewer */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Main Broadcast Studio Card */}
      <div className="wa-live-studio-card">
        {/* ── Top Bar Overlay ── */}
        <div className="wa-live-top-bar">
          <div className="wa-live-host-meta">
            <div className={`wa-live-host-avatar portrait ${portraitClass(portraitIdx)}`}>
              {stream?.hostPhoto ? (
                <img src={stream.hostPhoto} alt="" />
              ) : (
                <span>{hostName[0]?.toUpperCase() || "H"}</span>
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="wa-live-host-name">{hostName}</span>
                {isHost && <span className="wa-live-host-badge">HOST</span>}
              </div>
              <div className="wa-live-stream-title">{streamTitle}</div>
            </div>
          </div>

          <div className="wa-live-top-actions">
            <div className="wa-live-badge-wrap">
              <span className="live-pulsing-dot" />
              <span className="wa-live-badge-text">LIVE</span>
            </div>

            <div className="wa-live-viewers-pill" title="Current Viewers">
              <Icon name="user" />
              <span>{viewerCount}</span>
            </div>

            {/* Viewer Report Button */}
            {!isHost && (
              <button
                type="button"
                className="wa-live-icon-btn"
                onClick={() => setShowReportModal(true)}
                title="Report broadcast"
              >
                <Icon name="shield" />
              </button>
            )}

            {/* Close / Leave Button */}
            <button
              type="button"
              className="wa-live-close-btn"
              onClick={isHost ? handleEndStream : handleLeaveStream}
              title={isHost ? "End Broadcast" : "Exit Stream"}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Main Video Canvas ── */}
        <div className="wa-live-video-canvas">
          {isHost ? (
            /* Host View: Local Camera Feed */
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="wa-live-feed-video"
              />
              {isVideoOff && (
                <div className="wa-live-video-off-cover">
                  <Icon name="video" />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          ) : (
            /* Viewer View: Remote Broadcast Video */
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="wa-live-feed-video"
              />
              {!isConnected && (
                <div className="wa-live-video-connecting-cover">
                  <div className="wa-live-spinner" />
                  <p>{connectingStatus}</p>
                </div>
              )}
            </div>
          )}

          {/* Floating animated reaction bubbles */}
          <div className="wa-live-floating-emojis-container">
            {floatingEmojis.map((item) => (
              <div
                key={item.id}
                className="wa-live-float-emoji"
                style={{ left: `${item.left}%` }}
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* Stream Ended Overlay Banner */}
          {streamEndedBanner && (
            <div className="wa-live-ended-overlay">
              <div className="wa-live-ended-card">
                <span style={{ fontSize: "2.4rem", marginBottom: "8px" }}>🎬</span>
                <h3>Broadcast Ended</h3>
                <p>The host has ended this live stream session.</p>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    triggerStreamEnded();
                    onClose?.();
                  }}
                  style={{ marginTop: "16px", minHeight: "40px", padding: "0 24px" }}
                >
                  Return to Explore
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Controls & Chat Overlay ── */}
        <div className="wa-live-bottom-container">
          {/* Real-Time Chat Message Stream */}
          <div className="wa-live-chat-box" ref={chatScrollRef}>
            <div className="wa-live-chat-welcome">
              ✨ Welcome to the live room! Say hi and share some love.
            </div>
            {messages.map((m) => (
              <div key={m.id} className="wa-live-chat-row">
                <span
                  className="wa-live-chat-sender"
                  style={isHost && m.sender && m.sender !== "me" ? { cursor: "pointer", textDecoration: "underline" } : {}}
                  onClick={() => {
                    if (isHost && m.sender && m.sender !== "me") {
                      setModerationTarget({ id: m.sender, pseudonym: m.pseudonym || "Viewer" });
                    }
                  }}
                  title={isHost && m.sender && m.sender !== "me" ? "Click to mute/ban viewer" : ""}
                >
                  {m.pseudonym || (m.sender === "me" ? "You" : "Viewer")}:
                </span>{" "}
                <span className="wa-live-chat-body">{m.body || m.text}</span>
              </div>
            ))}
          </div>

          {/* Quick Reaction Pills */}
          <div className="wa-live-reactions-row">
            {["❤️", "🔥", "👏", "✨", "😍", "🎉"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="wa-live-reaction-btn"
                onClick={() => handleSendReaction(emoji)}
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input & Broadcast Actions */}
          <div className="wa-live-action-bar">
            <form className="wa-live-chat-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder={isMutedByHost ? "You are muted in this stream" : "Say something to everyone…"}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isMutedByHost}
                className="wa-live-chat-input"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSending || isMutedByHost}
                className="wa-live-send-btn"
              >
                <Icon name="arrow-right" />
              </button>
            </form>

            {/* Host Controls */}
            {isHost && (
              <div className="wa-live-host-controls">
                <button
                  type="button"
                  className={`wa-live-tool-btn ${isMuted ? "off" : ""}`}
                  onClick={toggleMute}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  <Icon name="mic" />
                </button>
                <button
                  type="button"
                  className={`wa-live-tool-btn ${isVideoOff ? "off" : ""}`}
                  onClick={toggleVideo}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  <Icon name="video" />
                </button>
                <button
                  type="button"
                  className="wa-live-end-btn"
                  onClick={handleEndStream}
                >
                  End Stream
                </button>
              </div>
            )}

            {/* Viewer Leave Button */}
            {!isHost && (
              <button
                type="button"
                className="wa-live-leave-btn"
                onClick={handleLeaveStream}
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Report Dialog ── */}
      {showReportModal && (
        <div className="wa-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="wa-report-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", color: "#fff" }}>Report Broadcast</h3>
            <p style={{ color: "#aaa", fontSize: "0.88rem", marginBottom: "16px" }}>
              Please select a reason for reporting this stream:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Harassment or Bullying", reason: "harassment" },
                { label: "Impersonation", reason: "impersonation" },
                { label: "Inappropriate / Unwanted Media", reason: "unwanted-media" },
                { label: "Other Violation", reason: "other" },
              ].map((opt) => (
                <button
                  key={opt.reason}
                  type="button"
                  className="button quiet"
                  style={{ textAlign: "left", justifyContent: "flex-start", padding: "10px 14px" }}
                  onClick={() => handleReport(opt.reason)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button quiet"
              style={{ marginTop: "16px", width: "100%" }}
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Viewer Moderation Dialog (Host Only) ── */}
      {moderationTarget && (
        <div className="wa-modal-backdrop" onClick={() => setModerationTarget(null)}>
          <div className="wa-report-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", color: "#fff" }}>Moderate Viewer</h3>
            <p style={{ color: "#aaa", fontSize: "0.88rem", marginBottom: "16px" }}>
              Take moderation action on <strong>{moderationTarget.pseudonym}</strong>:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="button quiet"
                style={{ textAlign: "left", justifyContent: "flex-start", padding: "10px 14px", color: "#f59e0b" }}
                onClick={async () => {
                  try {
                    await livestreamService.muteViewer(streamId, moderationTarget.id, true);
                    showToast?.(`${moderationTarget.pseudonym} has been muted.`);
                    setModerationTarget(null);
                  } catch (err) {
                    showToast?.(err.message || "Failed to mute viewer.");
                  }
                }}
              >
                🔇 Mute in Chat
              </button>
              <button
                type="button"
                className="button danger"
                style={{ textAlign: "left", justifyContent: "flex-start", padding: "10px 14px" }}
                onClick={async () => {
                  try {
                    await livestreamService.banViewer(streamId, moderationTarget.id);
                    showToast?.(`${moderationTarget.pseudonym} has been banned from the stream.`);
                    setModerationTarget(null);
                  } catch (err) {
                    showToast?.(err.message || "Failed to ban viewer.");
                  }
                }}
              >
                🚫 Ban from Stream
              </button>
            </div>
            <button
              type="button"
              className="button quiet"
              style={{ marginTop: "16px", width: "100%" }}
              onClick={() => setModerationTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
