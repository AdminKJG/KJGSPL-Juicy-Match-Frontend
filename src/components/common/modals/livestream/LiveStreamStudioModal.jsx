import React, { useState, useEffect, useRef, useCallback } from "react";
import ViewerCountHeader from "./ViewerCountHeader";
import LiveVideoCanvas from "./LiveVideoCanvas";
import LiveChatOverlay from "./LiveChatOverlay";
import LiveControlsBar from "./LiveControlsBar";
import HostModerationDrawer from "./HostModerationDrawer";
import ReportStreamModal from "./ReportStreamModal";
import { livestreamService, endStreamBeacon } from "../../../../services/livestreamService";
import { socketService } from "../../../../services/socketService";
import { useApp } from "../../../../context/AppContext";

// ── LiveKit Dynamic WebRTC Loader ───────────────────────────────────────────
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
    console.warn("[JM Live] LiveKit client dynamic import note:", err.message);
    return false;
  }
}

export default function LiveStreamStudioModal({
  stream,          // { id, title, hostId, hostName, hostPortrait, viewerCount, peakViewers, ... }
  role = "viewer", // "host" | "viewer"
  onClose,
  onStreamEnded,
  showToast,
}) {
  const { state } = useApp?.() || {};
  const myId = state?.me?.id || state?.me?.account?.id || state?.me?.accountId;
  const myName = (
    state?.me?.profile?.pseudonym ||
    state?.me?.account?.pseudonym ||
    state?.me?.name ||
    state?.me?.pseudonym ||
    ""
  ).trim().toLowerCase();

  const determineIsHost = useCallback(() => {
    if (role === "host" || stream?.role === "host" || stream?.isHost === true) return true;
    const hostId = stream?.hostId || stream?.creator || stream?.userId || stream?.creatorId;
    if (hostId && myId && String(hostId) === String(myId)) return true;
    const hostName = (stream?.hostName || stream?.pseudonym || stream?.creatorName || "").trim().toLowerCase();
    if (hostName && myName && hostName === myName) return true;
    return false;
  }, [role, stream, myId, myName]);

  const [isHost, setIsHost] = useState(determineIsHost);

  useEffect(() => {
    if (determineIsHost()) {
      setIsHost(true);
    }
  }, [determineIsHost]);

  const streamId = stream?.id || stream?.streamId;

  // Stable refs for props & callbacks to prevent effect re-trigger cascades
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onStreamEndedRef = useRef(onStreamEnded);
  onStreamEndedRef.current = onStreamEnded;

  const streamRef = useRef(stream);
  streamRef.current = stream;

  // Sizing mode: 'compact' (440px) | 'theater' (980px) | 'fullscreen' (100vw/100vh)
  const [sizeMode, setSizeMode] = useState("compact");
  const [isMinimized, setIsMinimized] = useState(false);

  // Stream state
  const [viewerCount, setViewerCount] = useState(stream?.viewerCount || (isHost ? 1 : 1));
  const [peakViewers, setPeakViewers] = useState(stream?.peakViewers || (isHost ? 1 : 1));
  const [viewersList, setViewersList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectingStatus, setConnectingStatus] = useState("Connecting to live broadcast…");
  const [streamEndedBanner, setStreamEndedBanner] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMutedByHost, setIsMutedByHost] = useState(false);
  const [moderationTarget, setModerationTarget] = useState(null);
  const [remoteTrack, setRemoteTrack] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Media refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const lkRoomRef = useRef(null);
  const sseRef = useRef(null);
  const hasEndedRef = useRef(false);

  // Update peak viewers whenever viewer count rises
  const updateViewerCount = useCallback((count) => {
    if (typeof count === "number" && !isNaN(count)) {
      setViewerCount(count);
      setPeakViewers((prev) => Math.max(prev, count));
    }
  }, []);
  const updateViewerCountRef = useRef(updateViewerCount);
  updateViewerCountRef.current = updateViewerCount;

  // Trigger stream end lifecycle
  const triggerStreamEnded = useCallback((meta = {}) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    if (streamId) {
      livestreamService.markStreamEndedLocally(streamId, {
        hostName: streamRef.current?.hostName || streamRef.current?.pseudonym,
        title: streamRef.current?.title,
        endedAt: new Date().toISOString(),
        ...meta,
      });
      onStreamEndedRef.current?.(streamId);
    }
    setStreamEndedBanner(true);
  }, [streamId]);
  const triggerStreamEndedRef = useRef(triggerStreamEnded);
  triggerStreamEndedRef.current = triggerStreamEnded;

  // ── 1. Spawn floating reaction heart particle ─────────────────────────────
  const spawnLocalHeart = useCallback((emoji = "❤️") => {
    const id = Date.now() + Math.random();
    const left = 55 + Math.random() * 38; // Spread towards bottom right
    const size = 24 + Math.floor(Math.random() * 16);
    const duration = 2.2 + Math.random() * 1.0;
    const rotate = (Math.random() - 0.5) * 30;

    setFloatingHearts((prev) => [...prev, { id, emoji, left, size, duration, rotate }]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, duration * 1000 + 200);
  }, []);
  const spawnLocalHeartRef = useRef(spawnLocalHeart);
  spawnLocalHeartRef.current = spawnLocalHeart;

  const handleUnlockAudio = useCallback(() => {
    if (lkRoomRef.current) {
      lkRoomRef.current
        .startAudio()
        .then(() => setAudioBlocked(false))
        .catch(() => {});
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current
        .play()
        .then(() => setAudioBlocked(false))
        .catch(() => {});
    }
  }, []);

  // ── 2. Fetch initial chat history ─────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;
    livestreamService.getMessages(streamId, null, 50).then((msgs) => {
      if (Array.isArray(msgs) && msgs.length > 0) {
        setMessages(msgs);
      }
    });
  }, [streamId]);

  // ── 3. Host Camera & Microphone Setup (Strictly Stable Lifecycle) ───────────
  useEffect(() => {
    if (!isHost) return;
    let active = true;

    async function startHostMedia() {
      try {
        let mediaStream = null;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: true,
          });
        } catch {
          // Fallback to basic constraint
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        }

        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = mediaStream;
        setLocalStream(mediaStream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
          localVideoRef.current.play().catch(() => {});
        }

        // If LiveKit room is already connected, publish newly acquired tracks
        if (lkRoomRef.current && lkRoomRef.current.localParticipant) {
          try {
            await lkRoomRef.current.localParticipant.setMicrophoneEnabled(true);
            await lkRoomRef.current.localParticipant.setCameraEnabled(true);
          } catch (e) {
            console.warn("[JM Live] LiveKit publish note:", e.message);
          }
        }
      } catch (err) {
        console.warn("[JM Live] Camera/Mic access warning:", err.message);
        showToastRef.current?.("Camera permission requested. Please ensure your browser allows camera access.");
      }
    }

    startHostMedia();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isHost]);

  // ── 4. LiveKit SFU Connection & WebRTC Data Channel ────────────────────────
  useEffect(() => {
    if (!streamId) return;
    let active = true;

    async function initLiveKitRoom() {
      try {
        setConnectingStatus("Connecting to live broadcast SFU…");
        let tokenRes = null;
        try {
          tokenRes = await livestreamService.getLivestreamToken(streamId);
        } catch (tErr) {
          console.warn("[JM Live] Token fetch note:", tErr.message);
        }

        // Only mark ended if backend explicitly returns state: "ended"
        if (tokenRes?.state === "ended" && tokenRes?.active === false) {
          triggerStreamEndedRef.current();
          return;
        }

        console.log("[JM Live] 🎟️ Full token response from backend for stream:", streamId, tokenRes);

        // Auto-elevate to host if backend token role is host
        if (
          tokenRes?.role === "host" ||
          tokenRes?.isHost === true ||
          tokenRes?.canPublish === true ||
          tokenRes?.data?.role === "host" ||
          tokenRes?.data?.isHost === true
        ) {
          setIsHost(true);
        }

        const wsUrl =
          tokenRes?.url ||
          tokenRes?.serverUrl ||
          tokenRes?.wsUrl ||
          tokenRes?.livekitUrl ||
          tokenRes?.data?.url ||
          tokenRes?.data?.serverUrl ||
          tokenRes?.data?.wsUrl ||
          tokenRes?.data?.livekitUrl ||
          tokenRes?.result?.url ||
          (typeof window !== "undefined" ? window.__LIVEKIT_URL__ : null);

        const token =
          tokenRes?.token ||
          tokenRes?.data?.token ||
          tokenRes?.accessToken ||
          tokenRes?.jwt ||
          tokenRes?.result?.token;

        console.log("[JM Live] Extracted LiveKit connection parameters -> wsUrl:", wsUrl, "token exists:", Boolean(token));

        if (tokenRes?.viewerCount || tokenRes?.data?.viewerCount) {
          updateViewerCountRef.current(tokenRes.viewerCount || tokenRes.data.viewerCount);
        }

        if (wsUrl && token) {
          const loaded = await loadLiveKit();
          if (loaded && LiveKitRoom) {
            setConnectingStatus("Joining media broadcast…");
            const room = new LiveKitRoom({
              adaptiveStream: false,
              dynacast: false,
              stopLocalTrackOnUnpublish: true,
            });
            lkRoomRef.current = room;

            // Track Subscriptions (Viewer subscribes to Host via native attach)
            room.on(LiveKitRoomEvent.AudioPlaybackStatusChanged, () => {
              if (!room.canPlaybackAudio) {
                setAudioBlocked(true);
                room.startAudio().then(() => setAudioBlocked(false)).catch(() => {});
              } else {
                setAudioBlocked(false);
              }
            });

            room.on(LiveKitRoomEvent.TrackSubscribed, (track, publication, participant) => {
              console.log("[JM Live] 🎬 Subscribed to track kind:", track.kind, "from participant:", participant?.identity);
              if (track.kind === "video") {
                setRemoteTrack(track);
                setIsConnected(true);
                setConnectingStatus("Live broadcast active");
                if (remoteVideoRef.current) {
                  try {
                    track.attach(remoteVideoRef.current);
                    remoteVideoRef.current.play().catch(() => {});
                  } catch (e) {
                    console.warn("[JM Live] Attach remote video error:", e);
                  }
                }
              } else if (track.kind === "audio") {
                if (remoteAudioRef.current) {
                  try {
                    track.attach(remoteAudioRef.current);
                    remoteAudioRef.current.play().catch(() => {});
                  } catch {}
                } else {
                  const el = track.attach();
                  el.id = "jm-livestream-remote-audio";
                  el.style.position = "fixed";
                  el.style.top = "-9999px";
                  el.style.opacity = "0.01";
                  document.body.appendChild(el);
                  el.play().catch(() => {});
                }
              }
            });

            room.on(LiveKitRoomEvent.TrackUnsubscribed, (track) => {
              try {
                track.detach();
                if (track.kind === "video") {
                  setRemoteTrack(null);
                }
                const fallback = document.getElementById("jm-livestream-remote-audio");
                if (fallback) fallback.remove();
              } catch {}
            });

            room.on(LiveKitRoomEvent.TrackUnmuted, (pub) => {
              if (pub?.track?.kind === "video") {
                setRemoteTrack(pub.track);
                if (remoteVideoRef.current) {
                  try {
                    pub.track.attach(remoteVideoRef.current);
                    remoteVideoRef.current.play().catch(() => {});
                  } catch {}
                }
              }
            });

            room.on(LiveKitRoomEvent.TrackStreamStateChanged, (pub, streamState) => {
              if (pub?.track?.kind === "video" && streamState === "active") {
                setRemoteTrack(pub.track);
                if (remoteVideoRef.current) {
                  try {
                    pub.track.attach(remoteVideoRef.current);
                    remoteVideoRef.current.play().catch(() => {});
                  } catch {}
                }
              }
            });

            // Zero-Latency Data Channel Listener (Chat, Reactions, Viewer Joins)
            room.on(LiveKitRoomEvent.DataReceived, (payload, participant) => {
              try {
                const str = new TextDecoder().decode(payload);
                const data = JSON.parse(str);
                console.log("[JM Live DataChannel] Received:", data);

                if (data.type === "chat") {
                  const newChat = {
                    id: data.id || `dc-${Date.now()}`,
                    sender: data.senderId || participant?.identity,
                    pseudonym: data.senderName || "Viewer",
                    body: data.text || data.body,
                    createdAt: data.timestamp || new Date().toISOString(),
                  };
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === newChat.id)) return prev;
                    return [...prev, newChat];
                  });
                } else if (data.type === "heart" || data.type === "reaction" || data.type === "heart_reaction") {
                  spawnLocalHeartRef.current(data.emoji || "❤️");
                } else if (data.type === "viewer_joined") {
                  const joinerName = data.senderName || participant?.name || "A viewer";
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: data.id || `join-${Date.now()}`,
                      isSystem: true,
                      body: `🌟 ${joinerName} joined the live broadcast`,
                      createdAt: data.timestamp || new Date().toISOString(),
                    },
                  ]);
                  setViewersList((prev) => {
                    const cleanId = data.senderId || participant?.identity || joinerName;
                    if (prev.some((v) => v.id === cleanId)) return prev;
                    return [...prev, { id: cleanId, name: joinerName }];
                  });
                  if (isHost) {
                    showToastRef.current?.(`👋 ${joinerName} joined your live broadcast!`);
                  }
                }
              } catch (err) {
                console.warn("[JM Live DataChannel] Decode err:", err.message);
              }
            });

            // Participant Connected / Disconnected (Dynamic Viewer count & roster)
            room.on(LiveKitRoomEvent.ParticipantConnected, (participant) => {
              const pName = participant.name || participant.identity || "Viewer";
              const count = room.remoteParticipants.size + (isHost ? 1 : 1);
              updateViewerCountRef.current(count);
              setViewersList((prev) => {
                if (prev.some((v) => v.id === participant.identity)) return prev;
                return [...prev, { id: participant.identity, name: pName }];
              });
              setMessages((prev) => [
                ...prev,
                {
                  id: `conn-${Date.now()}`,
                  isSystem: true,
                  body: `🌟 ${pName} joined the live room`,
                  createdAt: new Date().toISOString(),
                },
              ]);

              // Check if newly connected participant immediately published tracks
              participant.trackPublications.forEach((pub) => {
                if (pub.track && pub.track.kind === "video") {
                  setRemoteTrack(pub.track);
                  if (remoteVideoRef.current) {
                    try {
                      pub.track.attach(remoteVideoRef.current);
                      remoteVideoRef.current.play().catch(() => {});
                    } catch {}
                  }
                }
              });
            });

            room.on(LiveKitRoomEvent.ParticipantDisconnected, (participant) => {
              const count = Math.max(1, room.remoteParticipants.size + (isHost ? 1 : 1));
              updateViewerCountRef.current(count);
              setViewersList((prev) => prev.filter((v) => v.id !== participant.identity));
            });

            // Room Disconnected
            room.on(LiveKitRoomEvent.Disconnected, () => {
              console.log("[JM Live] LiveKit room disconnected");
              setIsConnected(false);
            });

            // Connect room with safety timeout
            try {
              console.log(`[JM Live] Connecting to LiveKit SFU: ${wsUrl}...`);
              await Promise.race([
                room.connect(wsUrl, token, { autoSubscribe: true }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("Media SFU connection timed out after 8s")), 8000)
                ),
              ]);
              console.log("[JM Live] ✅ Connected successfully to LiveKit room:", room.name);
              setIsConnected(true);
              setConnectingStatus("Connected · Waiting for host video feed…");

              // Immediately scan existing remote participants for already-published video & audio tracks
              if (room.remoteParticipants && room.remoteParticipants.size > 0) {
                console.log(`[JM Live] Scanning ${room.remoteParticipants.size} existing remote participants in room...`);
                room.remoteParticipants.forEach((p) => {
                  p.trackPublications.forEach((pub) => {
                    if (pub.track) {
                      console.log("[JM Live] Found existing track in room:", pub.track.kind);
                      if (pub.track.kind === "video") {
                        setRemoteTrack(pub.track);
                        setConnectingStatus("Live broadcast active");
                        if (remoteVideoRef.current) {
                          try {
                            pub.track.attach(remoteVideoRef.current);
                            remoteVideoRef.current.play().catch(() => {});
                          } catch {}
                        }
                      } else if (pub.track.kind === "audio") {
                        if (remoteAudioRef.current) {
                          try {
                            pub.track.attach(remoteAudioRef.current);
                            remoteAudioRef.current.play().catch(() => {});
                          } catch {}
                        }
                      }
                    }
                  });
                });
              }
            } catch (cErr) {
              console.error("❌ [JM Live] LiveKit room connect error:", cErr.message, cErr);
              setIsConnected(true);
              setConnectingStatus(`Connecting media feed: ${cErr.message || "Waiting for stream"}`);
            }

            // Announce viewer joined to the room via WebRTC DataChannel
            try {
              const myName = isHost
                ? (streamRef.current?.hostName || streamRef.current?.pseudonym || "Host")
                : "Match";
              const joinPayload = JSON.stringify({
                type: "viewer_joined",
                id: `join-${Date.now()}`,
                senderId: room.localParticipant.identity,
                senderName: myName,
                timestamp: new Date().toISOString(),
              });
              await room.localParticipant.publishData(new TextEncoder().encode(joinPayload), {
                reliable: true,
              });
            } catch {}

            // Host publishes local audio & video tracks
            if (isHost) {
              try {
                // Try official LiveKit native enable first
                let publishedNatively = false;
                try {
                  await room.localParticipant.setMicrophoneEnabled(!isMuted);
                  await room.localParticipant.setCameraEnabled(!isVideoOff);
                  publishedNatively = true;
                  console.log("[JM Live] ✅ Host native camera & mic enabled in room");
                } catch (nativeErr) {
                  console.warn("[JM Live] Native setCamera/Mic note:", nativeErr.message);
                }

                // If fallback required and localStream exists, publish track instances
                if (!publishedNatively && localStreamRef.current) {
                  const { LocalAudioTrack, LocalVideoTrack } = await import("livekit-client");
                  for (const at of localStreamRef.current.getAudioTracks()) {
                    try {
                      const lkAt = new LocalAudioTrack(at, undefined, false);
                      await room.localParticipant.publishTrack(lkAt);
                    } catch (e) {}
                  }
                  for (const vt of localStreamRef.current.getVideoTracks()) {
                    try {
                      const lkVt = new LocalVideoTrack(vt, undefined, false);
                      await room.localParticipant.publishTrack(lkVt);
                    } catch (e) {}
                  }
                }
              } catch (pubErr) {
                console.warn("[JM Live] Publish note:", pubErr.message);
              }
            }

            // For Viewers: immediately attach already-published remote tracks
            if (!isHost) {
              room.remoteParticipants.forEach((p) => {
                p.trackPublications.forEach((pub) => {
                  if (pub.isSubscribed && pub.track) {
                    if (pub.track.kind === "video") {
                      setRemoteTrack(pub.track);
                      setIsConnected(true);
                      if (remoteVideoRef.current) {
                        try {
                          pub.track.attach(remoteVideoRef.current);
                          remoteVideoRef.current.play().catch(() => {});
                        } catch {}
                      }
                    } else if (pub.track.kind === "audio" && remoteAudioRef.current) {
                      try {
                        pub.track.attach(remoteAudioRef.current);
                        remoteAudioRef.current.play().catch(() => {});
                      } catch {}
                    }
                  } else if (!pub.isSubscribed && pub.trackSid) {
                    try {
                      pub.setSubscribed(true);
                    } catch {}
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
        console.warn("[JM Live] Connection setup note:", err.message);
        setIsConnected(true);
      }
    }

    initLiveKitRoom();

    return () => {
      active = false;
      if (lkRoomRef.current) {
        try {
          lkRoomRef.current.disconnect();
        } catch {}
        lkRoomRef.current = null;
      }
    };
  }, [streamId, isHost]);

  // ── 5. Server-Sent Events (SSE) Real-Time Synchronization ─────────────────
  useEffect(() => {
    if (!streamId) return;
    let active = true;

    livestreamService
      .connectEvents(
        streamId,
        (event) => {
          if (!active) return;
          console.log("[JM Live SSE] Event:", event);

          // Viewer count update
          if (
            event.type === "ready" ||
            event.type === "livestream.viewers" ||
            event.type === "livestream.viewer_count" ||
            event.viewerCount !== undefined
          ) {
            if (typeof event.viewerCount === "number") {
              updateViewerCountRef.current(event.viewerCount);
            }
          }

          // New chat message
          if (event.type === "livestream.message" || (event.body && !event.type?.startsWith("livestream."))) {
            const newMsg = {
              id: event.id || `sse-${Date.now()}`,
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

          // Moderation: Viewer muted
          if (event.type === "livestream.moderation" || event.type === "livestream.muted") {
            if (event.viewer && !isHost) {
              setIsMutedByHost(Boolean(event.muted));
              showToastRef.current?.(event.muted ? "You have been muted in this stream." : "You have been unmuted.");
            }
          }

          // Moderation: Viewer banned
          if (event.type === "livestream.banned") {
            if (event.viewer && !isHost) {
              showToastRef.current?.("You have been removed from this live room.");
              onCloseRef.current?.();
            }
          }

          // Stream ended
          if (event.type === "livestream.ended" || event.type === "livestream.end") {
            triggerStreamEndedRef.current();
          }
        },
        (err) => {
          console.log("[JM Live SSE] SSE note / fallback polling active:", err?.message);
        }
      )
      .then((es) => {
        if (active) sseRef.current = es;
        else es?.close();
      });

    // ── Real-Time Socket.io Livestream Room & Event Listeners ──────────────
    socketService.joinLivestream(streamId);

    const unLiveMsg = socketService.on("livestream:message_received", (data) => {
      if (data && (data.streamId === streamId || !data.streamId)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    });

    const unLiveCount = socketService.on("livestream:viewer_count", (data) => {
      if (data && (data.streamId === streamId || !data.streamId) && typeof data.viewerCount === "number") {
        setViewerCount(data.viewerCount);
      }
    });

    const unLiveEnd = socketService.on("livestream:ended", (data) => {
      if (data && (data.streamId === streamId || !data.streamId)) {
        triggerStreamEndedRef.current();
      }
    });

    const unLiveBan = socketService.on("livestream:banned", (data) => {
      if (data && (data.streamId === streamId || !data.streamId) && !isHost) {
        showToastRef.current?.("You have been removed from this live room.");
        onCloseRef.current?.();
      }
    });

    // Low frequency fallback check only when websocket is offline
    const pollInterval = setInterval(async () => {
      if (!active || hasEndedRef.current || socketService.isConnected) return;
      try {
        const latest = await livestreamService.getMessages(streamId, null, 20);
        if (Array.isArray(latest) && latest.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = latest.filter((m) => !existingIds.has(m.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      } catch {}
    }, 20000);

    return () => {
      active = false;
      socketService.leaveLivestream(streamId);
      unLiveMsg();
      unLiveCount();
      unLiveEnd();
      unLiveBan();
      clearInterval(pollInterval);
      if (sseRef.current) {
        try {
          sseRef.current.close();
        } catch {}
        sseRef.current = null;
      }
    };
  }, [streamId, isHost]);

  // ── 6. Lifecycle & Unload Sync ────────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    if (isHost) {
      const handleUnload = () => {
        endStreamBeacon(streamId);
      };
      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("pagehide", handleUnload);

      return () => {
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("pagehide", handleUnload);
      };
    } else {
      let channel = null;
      try {
        channel = new BroadcastChannel("jm_live_channel");
        channel.onmessage = (e) => {
          if (e.data?.type === "HOST_ENDED_LIVE" && e.data?.streamId === streamId) {
            triggerStreamEndedRef.current();
          }
        };
      } catch {}

      return () => {
        if (channel) channel.close();
      };
    }
  }, [streamId, isHost]);

  // ── 7. End Broadcast (Host) ────────────────────────────────────────────────
  const handleEndStream = async () => {
    triggerStreamEnded();
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (lkRoomRef.current) {
        try {
          lkRoomRef.current.disconnect();
        } catch {}
        lkRoomRef.current = null;
      }
      if (sseRef.current) {
        try {
          sseRef.current.close();
        } catch {}
        sseRef.current = null;
      }
      showToastRef.current?.("Live broadcast ended.");
      onCloseRef.current?.();
      onStreamEndedRef.current?.(streamId);
      await livestreamService.endStream(streamId, {
        hostName: streamRef.current?.hostName || streamRef.current?.pseudonym,
        title: streamRef.current?.title,
      });
    } catch {
      onCloseRef.current?.();
      onStreamEndedRef.current?.(streamId);
    }
  };

  // ── 8. Leave Stream (Viewer) ───────────────────────────────────────────────
  const handleLeaveStream = async () => {
    hasEndedRef.current = true;
    try {
      if (lkRoomRef.current) {
        try {
          lkRoomRef.current.disconnect();
        } catch {}
        lkRoomRef.current = null;
      }
      if (sseRef.current) {
        try {
          sseRef.current.close();
        } catch {}
        sseRef.current = null;
      }
      onCloseRef.current?.();
      await livestreamService.leaveStream(streamId).catch(() => {});
    } catch {
      onCloseRef.current?.();
    }
  };

  // ── 9. Send Chat Message ───────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || isSending || isMutedByHost) return;

    setIsSending(true);
    setChatInput("");

    const tempId = `msg-${Date.now()}`;
    const myName = isHost ? (streamRef.current?.hostName || streamRef.current?.pseudonym || "Host") : "You";

    // Optimistic UI
    const tempMsg = {
      id: tempId,
      sender: "me",
      isMe: true,
      pseudonym: myName,
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    // 1. Broadcast instantly to LiveKit WebRTC Data Channel
    if (lkRoomRef.current && lkRoomRef.current.localParticipant) {
      try {
        const payload = JSON.stringify({
          type: "chat",
          id: tempId,
          senderId: lkRoomRef.current.localParticipant.identity,
          senderName: myName,
          text,
          timestamp: new Date().toISOString(),
        });
        await lkRoomRef.current.localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      } catch (dcErr) {
        console.warn("[JM Live DataChannel] Chat pub warn:", dcErr.message);
      }
    }

    // 2. Persist to REST API
    try {
      await livestreamService.sendMessage(streamId, text, tempId);
    } catch (err) {
      console.warn("[JM Live] Chat send error:", err.message);
    } finally {
      setIsSending(false);
    }
  };

  // ── 10. Send Reaction / Heart ──────────────────────────────────────────────
  const handleSendReaction = (emoji = "❤️") => {
    // 1. Local animation
    spawnLocalHeart(emoji);

    // 2. WebRTC Data Channel instant broadcast to all peers
    if (lkRoomRef.current && lkRoomRef.current.localParticipant) {
      try {
        const payload = JSON.stringify({ type: "heart_reaction", emoji });
        lkRoomRef.current.localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: false,
        });
      } catch {}
    }

    // 3. API message push
    livestreamService.sendMessage(streamId, emoji).catch(() => {});
  };

  // ── 11. Host Audio / Video Toggles ─────────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = isMuted;
      });
    }
    if (lkRoomRef.current && lkRoomRef.current.localParticipant) {
      lkRoomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = isVideoOff;
      });
    }
    if (lkRoomRef.current && lkRoomRef.current.localParticipant) {
      lkRoomRef.current.localParticipant.setCameraEnabled(isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  // ── 12. Host Moderation Actions ────────────────────────────────────────────
  const handleMuteViewer = async (target) => {
    try {
      await livestreamService.muteViewer(streamId, target.id, true);
      showToastRef.current?.(`${target.pseudonym || "Viewer"} has been muted.`);
      setModerationTarget(null);
    } catch (err) {
      showToastRef.current?.(err.message || "Failed to mute viewer.");
    }
  };

  const handleBanViewer = async (target) => {
    try {
      await livestreamService.banViewer(streamId, target.id);
      showToastRef.current?.(`${target.pseudonym || "Viewer"} has been banned.`);
      setModerationTarget(null);
    } catch (err) {
      showToastRef.current?.(err.message || "Failed to ban viewer.");
    }
  };

  // ── 13. Viewer Report Action ───────────────────────────────────────────────
  const handleReport = async (reason) => {
    setShowReportModal(false);
    try {
      await livestreamService.reportStream(streamId, reason);
      showToastRef.current?.("Report submitted. Thank you for keeping JuicyMatch safe.");
    } catch {
      showToastRef.current?.("Report submitted.");
    }
  };

  // ── 14. Window Sizing Toggles ──────────────────────────────────────────────
  const toggleSize = () => {
    setSizeMode((prev) => (prev === "theater" ? "compact" : "theater"));
  };

  const toggleFullscreen = () => {
    if (sizeMode === "fullscreen") {
      setSizeMode("theater");
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      setSizeMode("fullscreen");
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  };

  const isFullscreen = sizeMode === "fullscreen";
  const isTheater = sizeMode === "theater";

  // ── Floating Picture-in-Picture (PiP) Minimized Widget ──
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] w-[320px] sm:w-[360px] h-[210px] rounded-2xl border border-white/20 bg-[#120718] overflow-hidden flex flex-col group">
        {/* Floating Mini Header */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-2.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-[2px]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase shadow-sm shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>LIVE</span>
            </div>
            <span className="text-xs font-bold text-white truncate max-w-[110px]">
              {stream?.hostName || stream?.pseudonym || "Host"}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-black/40 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
              <span>👁</span>
              <span>{viewerCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Maximize Button */}
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title="Expand live broadcast"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
            {/* End / Exit Button */}
            {isHost ? (
              <button
                type="button"
                onClick={handleEndStream}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-[10px] font-extrabold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                title="End Broadcast"
              >
                End Live
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLeaveStream}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-red-500/40 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Exit Stream"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Video Canvas in PiP */}
        <div className="w-full h-full cursor-pointer relative" onClick={() => setIsMinimized(false)}>
          <LiveVideoCanvas
            isHost={isHost}
            isVideoOff={isVideoOff}
            isConnected={isConnected}
            connectingStatus={connectingStatus}
            streamEndedBanner={streamEndedBanner}
            stream={stream}
            localStream={localStream}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            remoteAudioRef={remoteAudioRef}
            remoteTrack={remoteTrack}
            audioBlocked={audioBlocked}
            onUnlockAudio={handleUnlockAudio}
            onReturnToExplore={() => {
              triggerStreamEnded();
              onCloseRef.current?.();
            }}
          />
        </div>

        {/* Floating Mini Overlay Footer on Hover */}
        <div className="absolute bottom-2 inset-x-2 z-30 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-white/80 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm">
            Click to expand
          </span>
          <span className="text-[10px] text-pink font-semibold bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm">
            🍓 Juicy Match
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all ${
        isFullscreen ? "p-0" : "p-3 sm:p-5"
      }`}
    >
      {/* ── Studio Frame Container ── */}
      <div
        className={`w-full bg-[#110716] overflow-hidden relative border border-white/10 flex flex-col transition-all duration-300 ${
          isFullscreen
            ? "w-screen h-screen rounded-none max-w-none max-h-none border-0"
            : isTheater
            ? "max-w-[960px] h-[88vh] max-h-[800px] rounded-2xl"
            : "max-w-[420px] h-[85vh] max-h-[660px] rounded-2xl"
        }`}
      >
        {/* Top Header Bar */}
        <ViewerCountHeader
          stream={stream}
          isHost={isHost}
          viewerCount={viewerCount}
          peakViewers={peakViewers}
          sizeMode={sizeMode}
          viewersList={viewersList}
          onToggleSize={toggleSize}
          onToggleFullscreen={toggleFullscreen}
          onMinimize={() => setIsMinimized(true)}
          onOpenReport={() => setShowReportModal(true)}
          onModerateUser={(target) => setModerationTarget(target)}
          onClose={isHost ? handleEndStream : handleLeaveStream}
        />

        {/* Video Canvas & Floating Reactions */}
        <div className="relative flex-1 w-full h-full min-0 flex flex-col">
          <LiveVideoCanvas
            isHost={isHost}
            isVideoOff={isVideoOff}
            isConnected={isConnected}
            connectingStatus={connectingStatus}
            streamEndedBanner={streamEndedBanner}
            stream={stream}
            floatingHearts={floatingHearts}
            localStream={localStream}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            remoteAudioRef={remoteAudioRef}
            remoteTrack={remoteTrack}
            audioBlocked={audioBlocked}
            onUnlockAudio={handleUnlockAudio}
            onReturnToExplore={() => {
              triggerStreamEnded();
              onCloseRef.current?.();
            }}
          />

          {/* Real-Time Live Chat Stream Overlay */}
          <LiveChatOverlay
            messages={messages}
            isHost={isHost}
            onModerateUser={(target) => setModerationTarget(target)}
          />
        </div>

        {/* Bottom Bar: Reactions, Chat Input, and Host Controls */}
        <LiveControlsBar
          isHost={isHost}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSendMessage={handleSendMessage}
          onSendReaction={handleSendReaction}
          isSending={isSending}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isMutedByHost={isMutedByHost}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndStream={handleEndStream}
          onLeaveStream={handleLeaveStream}
        />
      </div>

      {/* ── Report Dialog ── */}
      {showReportModal && (
        <ReportStreamModal
          onReport={handleReport}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* ── Host Moderation Bottom Sheet / Modal ── */}
      {moderationTarget && (
        <HostModerationDrawer
          target={moderationTarget}
          onMute={handleMuteViewer}
          onBan={handleBanViewer}
          onClose={() => setModerationTarget(null)}
        />
      )}
    </div>
  );
}
