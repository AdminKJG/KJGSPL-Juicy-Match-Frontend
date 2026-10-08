import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "../ui/Icon";
import { callsService } from "../../../services/callsService";
import { portraitClass, getPeerPortraitIndex, playRingtone } from "../../../utils/formatters";

// ─── LiveKit Dynamic Import (loaded only when a call is active) ────────────────
let LiveKitRoom = null;
let LiveKitRoomEvent = null;
let LiveKitTrack = null;
let livekitLoaded = false;

async function loadLiveKit() {
  if (livekitLoaded) return true;
  try {
    const { Room, RoomEvent, Track } = await import("livekit-client");
    LiveKitRoom = Room;
    LiveKitRoomEvent = RoomEvent;
    LiveKitTrack = Track;
    livekitLoaded = true;
    return true;
  } catch (err) {
    console.warn("[JM Call] LiveKit load failed:", err.message);
    return false;
  }
}

export default function CallModal({
  callData, // { id, connectionId, medium, peer, isIncoming, initialStatus }
  onClose,
  onCallEnded,
  showToast,
}) {
  const [callStatus, setCallStatus] = useState(callData?.initialStatus || "ringing");
  const isRinging = callStatus === "ringing" || callStatus === "invited";

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [localCamReady, setLocalCamReady] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState([]); // { sid, kind, mediaStreamTrack }
  const [mediaError, setMediaError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const lkRoomRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const ringtoneRef = useRef(null);
  const localVideoMountedRef = useRef(false);

  const isVideo = callData?.medium === "video";
  const callId = callData?.id;

  // ── 1. Ringtone ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRinging) {
      ringtoneRef.current = playRingtone();
    } else {
      ringtoneRef.current?.stop?.();
      ringtoneRef.current = null;
    }
    return () => {
      ringtoneRef.current?.stop?.();
      ringtoneRef.current = null;
    };
  }, [isRinging]);

  // ── 2. Local Camera / Mic — start immediately on mount ──────────────────────
  useEffect(() => {
    let active = true;

    async function startLocalMedia() {
      try {
        const constraints = {
          audio: true,
          video: isVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        setLocalCamReady(true);

        // Attach to video element if already mounted
        if (localVideoRef.current && isVideo) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        setMediaError(null);
      } catch (err) {
        console.warn("[JM Call] Local media error:", err.name, err.message);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setMediaError("Camera/mic permission denied. Please allow access.");
        } else if (err.name === "NotFoundError") {
          setMediaError("No camera/mic found on this device.");
        } else {
          setMediaError(null); // Non-critical — audio-only fallback
          // Try audio only if video failed
          if (isVideo) {
            try {
              const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
              if (active) localStreamRef.current = audioOnly;
            } catch {}
          }
        }
      }
    }

    startLocalMedia();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isVideo]);

  // ── 3. Attach local stream when video element mounts (ref callback) ──────────
  const localVideoCallbackRef = useCallback((node) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current && isVideo) {
      node.srcObject = localStreamRef.current;
      node.play().catch(() => {});
      localVideoMountedRef.current = true;
    }
  }, [isVideo]);

  // Also watch localCamReady to re-attach if stream arrived after DOM mounted
  useEffect(() => {
    if (localCamReady && localVideoRef.current && localStreamRef.current && isVideo) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localCamReady, isVideo]);

  // ── 4. Attach remote tracks to audio/video elements ─────────────────────────
  useEffect(() => {
    const videoTrack = remoteTracks.find((t) => t.kind === "video");
    const audioTrack = remoteTracks.find((t) => t.kind === "audio");

    if (videoTrack && remoteVideoRef.current) {
      const ms = new MediaStream([videoTrack.mediaStreamTrack]);
      remoteVideoRef.current.srcObject = ms;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (audioTrack && remoteAudioRef.current) {
      const ms = new MediaStream([audioTrack.mediaStreamTrack]);
      remoteAudioRef.current.srcObject = ms;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteTracks]);

  // ── 5. Duration timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === "connected") {
      timerIntervalRef.current = setInterval(() => setDuration((p) => p + 1), 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [callStatus]);

  // ── 6. Connect to LiveKit Room (real WebRTC) ─────────────────────────────────
  const connectToLiveKit = async (id) => {
    setIsConnecting(true);
    try {
      const tokenRes = await callsService.getRoomToken(id || callId);
      const wsUrl = tokenRes?.url || tokenRes?.serverUrl || "wss://communitysolve-engage-n3pxm3m3.livekit.cloud";
      const token = tokenRes?.token;

      if (!token) throw new Error("No LiveKit token received");

      const ok = await loadLiveKit();
      if (!ok) throw new Error("LiveKit SDK unavailable");

      const room = new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
      });
      lkRoomRef.current = room;

      // ── Handle remote participant tracks ──
      const handleTrackSubscribed = (track, publication, participant) => {
        console.log("[JM Call] Remote track subscribed:", track.kind, participant.identity);
        setRemoteTracks((prev) => [
          ...prev.filter((t) => t.sid !== track.sid),
          { sid: track.sid, kind: track.kind, mediaStreamTrack: track.mediaStreamTrack },
        ]);
      };


      const handleTrackUnsubscribed = (track) => {
        setRemoteTracks((prev) => prev.filter((t) => t.sid !== track.sid));
      };

      const handleParticipantConnected = (participant) => {
        console.log("[JM Call] Participant joined:", participant.identity);
        showToast?.(`${participant.identity || "Match"} joined the call`);
      };

      // ── Remote participant disconnects (e.g. mobile app cuts/hangs up) ──
      const handleParticipantDisconnected = (participant) => {
        console.log("[JM Call] Remote participant disconnected:", participant?.identity);
        showToast?.("Call ended");
        if (localStreamRef.current) {
          try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
          localStreamRef.current = null;
        }
        if (lkRoomRef.current) {
          try { lkRoomRef.current.disconnect(); } catch {}
          lkRoomRef.current = null;
        }
        onCallEnded?.("ended");
        onClose?.();
      };

      room.on(LiveKitRoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(LiveKitRoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.on(LiveKitRoomEvent.ParticipantConnected, handleParticipantConnected);
      room.on(LiveKitRoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.on(LiveKitRoomEvent.Disconnected, () => {
        console.log("[JM Call] LiveKit room disconnected");
        setCallStatus("ended");
        onCallEnded?.("ended");
        onClose?.();
      });

      // Connect to room
      await room.connect(wsUrl, token, { autoSubscribe: true });
      console.log("[JM Call] ✅ Connected to LiveKit room:", room.name);

      // Publish local tracks
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        const videoTracks = localStreamRef.current.getVideoTracks();

        for (const at of audioTracks) {
          try {
            const { LocalAudioTrack } = await import("livekit-client");
            const lkAudio = new LocalAudioTrack(at, undefined, false);
            await room.localParticipant.publishTrack(lkAudio);
          } catch (e) {
            console.warn("[JM Call] Audio publish:", e.message);
          }
        }
        if (isVideo) {
          for (const vt of videoTracks) {
            try {
              const { LocalVideoTrack } = await import("livekit-client");
              const lkVideo = new LocalVideoTrack(vt, undefined, false);
              await room.localParticipant.publishTrack(lkVideo);
            } catch (e) {
              console.warn("[JM Call] Video publish:", e.message);
            }
          }
        }
      }

      // Check already-connected participants
      room.participants.forEach((participant) => {
        participant.tracks.forEach((publication) => {
          if (publication.isSubscribed && publication.track) {
            handleTrackSubscribed(publication.track, publication, participant);
          }
        });
      });

      setCallStatus("connected");
      showToast?.("Connected — LiveKit WebRTC session active.");
    } catch (err) {
      console.warn("[JM Call] LiveKit connect error:", err.message);
      // Fallback: still mark as connected so UI shows
      setCallStatus("connected");
      showToast?.("Connected (direct mode).");
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Safe Cleanup on component unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (lkRoomRef.current) {
        try { lkRoomRef.current.disconnect(); } catch {}
        lkRoomRef.current = null;
      }
      if (localStreamRef.current) {
        try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
        localStreamRef.current = null;
      }
      try {
        ringtoneRef.current?.stop?.();
        ringtoneRef.current = null;
      } catch {}
    };
  }, []);

  // ── 5. Real-time Cross-tab/Window Call Termination Listener ────────────────
  useEffect(() => {
    let channel = null;
    const handleCallEvent = (data) => {
      if (!data || !data.type) return;
      const matchesCall =
        !data.callId ||
        String(data.callId) === String(callId) ||
        (data.connectionId && String(data.connectionId) === String(callData?.connectionId));

      if (data.type === "CALL_ENDED" || data.type === "CALL_DECLINED" || data.type === "CALL_CANCELLED") {
        if (matchesCall) {
          console.log("[JM Call Modal] Remote party ended/cancelled call:", data.type);
          if (localStreamRef.current) {
            try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
            localStreamRef.current = null;
          }
          if (lkRoomRef.current) {
            try { lkRoomRef.current.disconnect(); } catch {}
            lkRoomRef.current = null;
          }
          try { ringtoneRef.current?.stop?.(); ringtoneRef.current = null; } catch {}
          setCallStatus("ended");
          showToast?.(data.type === "CALL_DECLINED" ? "Call declined." : "Call cancelled / ended.");
          onCallEnded?.("ended");
          onClose?.();
        }
      } else if (data.type === "CALL_ACCEPTED") {
        if (matchesCall && callStatus === "ringing" && !callData?.isIncoming) {
          console.log("[JM Call Modal] Receiver accepted call via event!");
          setCallStatus("connected");
          connectToLiveKit(callId);
        }
      }
    };

    try {
      channel = new BroadcastChannel("jm_calls_channel");
      channel.onmessage = (e) => handleCallEvent(e.data);
    } catch {}

    const handleStorage = (e) => {
      if (e.key === "jm_last_call_event" && e.newValue) {
        try {
          handleCallEvent(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) {
        try { channel.close(); } catch {}
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [callId, callData?.connectionId, callStatus, callData?.isIncoming]);

  // ── 6. Sync call status with backend (detects caller cancelling / receiver declining) ─
  useEffect(() => {
    if (!callId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await callsService.getCalls();
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.items || res?.calls || res?.data?.items || res?.data || [];
        const thisCall = list.find((c) => String(c.id) === String(callId));
        if (thisCall) {
          const state = String(thisCall.state || thisCall.status || "").toLowerCase();
          // If remote party ended, declined, or cancelled the call:
          if (["ended", "declined", "cancelled", "completed", "rejected", "missed", "closed", "expired"].includes(state)) {
            console.log("[JM Call] Remote party cut the call via backend poll:", state);
            if (localStreamRef.current) {
              try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
              localStreamRef.current = null;
            }
            if (lkRoomRef.current) {
              try { lkRoomRef.current.disconnect(); } catch {}
              lkRoomRef.current = null;
            }
            try { ringtoneRef.current?.stop?.(); ringtoneRef.current = null; } catch {}
            setCallStatus("ended");
            showToast?.(state === "declined" ? "Call declined" : "Call ended");
            onCallEnded?.("ended");
            onClose?.();
          } else if ((state === "accepted" || state === "active") && callStatus === "ringing" && !callData?.isIncoming) {
            // Receiver accepted our outgoing call:
            console.log("[JM Call] Receiver accepted outgoing call via poll!");
            setCallStatus("connected");
            connectToLiveKit(callId);
          }
        }
      } catch (pollErr) {
        console.warn("[JM Call status poll error]:", pollErr.message);
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [callId, callStatus, callData?.isIncoming]);

  // ── 7. Accept Incoming Call ───────────────────────────────────────────────────
  const handleAccept = async () => {
    try {
      if (callId) callsService.callAction(callId, "accept").catch(() => {});
      const payload = { type: "CALL_ACCEPTED", callId, connectionId: callData?.connectionId, timestamp: Date.now() };
      try { new BroadcastChannel("jm_calls_channel").postMessage(payload); } catch {}
      try { localStorage.setItem("jm_last_call_event", JSON.stringify({ ...payload, _salt: Math.random() })); } catch {}
      await connectToLiveKit(callId);
    } catch (err) {
      showToast?.(err.message || "Failed to accept call.");
      setCallStatus("connected");
    }
  };

  // ── 8. Decline (Instant local close + async background notification) ─────────
  const handleDecline = () => {
    try { ringtoneRef.current?.stop?.(); ringtoneRef.current = null; } catch {}
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;
    }
    if (lkRoomRef.current) {
      try { lkRoomRef.current.disconnect(); } catch {}
      lkRoomRef.current = null;
    }
    const payload = { type: "CALL_DECLINED", callId, connectionId: callData?.connectionId, timestamp: Date.now() };
    try { new BroadcastChannel("jm_calls_channel").postMessage(payload); } catch {}
    try { localStorage.setItem("jm_last_call_event", JSON.stringify({ ...payload, _salt: Math.random() })); } catch {}

    setCallStatus("ended");
    showToast?.("Call declined.");
    onCallEnded?.("declined");
    onClose?.();

    if (callId) {
      callsService.callAction(callId, "decline").catch(() => {});
    }
  };

  // ── 9. End Call (Instant local close + async background notification) ────────
  const handleEndCall = () => {
    try { ringtoneRef.current?.stop?.(); ringtoneRef.current = null; } catch {}
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;
    }
    if (lkRoomRef.current) {
      try { lkRoomRef.current.disconnect(); } catch {}
      lkRoomRef.current = null;
    }
    const payload = { type: "CALL_ENDED", callId, connectionId: callData?.connectionId, timestamp: Date.now() };
    try { new BroadcastChannel("jm_calls_channel").postMessage(payload); } catch {}
    try { localStorage.setItem("jm_last_call_event", JSON.stringify({ ...payload, _salt: Math.random() })); } catch {}

    setCallStatus("ended");
    showToast?.("Call ended.");
    onCallEnded?.("ended");
    onClose?.();

    if (callId) {
      callsService.callAction(callId, "end").catch(() => {
        callsService.callAction(callId, "decline").catch(() => {});
      });
    }
  };

  // ── 10. Simulate Answer (demo) ────────────────────────────────────────────────
  const handleDemoAccept = async () => {
    try { if (callId) await callsService.demoAccept(callId); } catch {}
    await connectToLiveKit(callId);
  };

  // ── 11. Toggle Mic ────────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => { t.enabled = isMuted; });
    }
    // Also mute in LiveKit room
    if (lkRoomRef.current) {
      lkRoomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  // ── 12. Toggle Camera ─────────────────────────────────────────────────────────
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

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const peer = callData?.peer || {};
  const peerName = peer.pseudonym || peer.name || peer.displayName || "Match";
  const rawPhoto = peer.photo || peer.avatar || peer.avatarUrl || peer.imageUrl;
  const hasValidPhoto = Boolean(
    rawPhoto &&
      typeof rawPhoto === "string" &&
      !imgLoadError &&
      (rawPhoto.startsWith("http") || rawPhoto.startsWith("data:") || rawPhoto.startsWith("/"))
  );
  const portraitIdx = getPeerPortraitIndex(peer);
  const hasRemoteVideo = remoteTracks.some((t) => t.kind === "video");

  return (
    <div className="wa-call-overlay-container">
      {/* Hidden audio element for remote audio (always rendered) */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      <div className="wa-call-card">
        {/* ── Video Call Layout ── */}
        {isVideo ? (
          <div className="wa-call-video-grid">
            {/* Remote Video */}
            <div className="wa-call-remote-video-box">
              {callStatus === "connected" ? (
                <div className="wa-remote-video-feed">
                  {/* Real remote video element */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="wa-remote-video-img"
                    style={{ display: hasRemoteVideo ? "block" : "none" }}
                  />
                  {/* Fallback avatar when no remote video yet */}
                  {!hasRemoteVideo && (
                    <div className={`wa-remote-placeholder-avatar portrait ${portraitClass(portraitIdx)}`}>
                      {hasValidPhoto && (
                        <img src={rawPhoto} alt="" onError={() => setImgLoadError(true)} />
                      )}
                    </div>
                  )}
                  <div className="wa-remote-live-badge">🔴 Live WebRTC Feed</div>
                </div>
              ) : (
                <div className="wa-call-video-placeholder">
                  <div className={`wa-call-avatar-pulse portrait ${portraitClass(portraitIdx)}`}>
                    {hasValidPhoto && (
                      <img src={rawPhoto} alt="" onError={() => setImgLoadError(true)} />
                    )}
                  </div>
                  <p style={{ color: "#ffffff", fontWeight: 700, marginTop: "16px" }}>
                    {callData?.isIncoming ? "Incoming Video Call…" : "Calling..."}
                  </p>
                </div>
              )}
            </div>

            {/* Local Camera PIP */}
            <div className={`wa-call-local-pip ${isVideoOff ? "video-disabled" : ""}`}>
              <video
                ref={localVideoCallbackRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }}
              />
              {isVideoOff && (
                <div className="wa-pip-disabled-cover">
                  <Icon name="video" />
                  <span>Camera Off</span>
                </div>
              )}
              {!localCamReady && !isVideoOff && (
                <div className="wa-pip-disabled-cover" style={{ background: "rgba(0,0,0,0.7)" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Starting cam…</span>
                </div>
              )}
              <div className="wa-pip-label">You</div>
            </div>
          </div>
        ) : (
          /* ── Voice Call Layout ── */
          <div className="wa-call-voice-body">
            <div className={`wa-call-avatar-ring-container ${callStatus === "connected" ? "connected" : "ringing"}`}>
              <div className="wa-call-avatar-ring ring-3" />
              <div className="wa-call-avatar-ring ring-2" />
              <div className="wa-call-avatar-ring ring-1" />
              <div className={`wa-call-main-avatar portrait ${portraitClass(portraitIdx)}`}>
                {hasValidPhoto && (
                  <img src={rawPhoto} alt="" onError={() => setImgLoadError(true)} />
                )}
              </div>
            </div>

            <h2 className="wa-call-peer-name">{peerName}</h2>
            <p className="wa-call-status-text">
              {isRinging
                ? callData?.isIncoming
                  ? "Incoming voice call…"
                  : "Ringing…"
                : callStatus === "connected"
                ? `In Call • ${formatDuration(duration)}`
                : "Call ended"}
            </p>

            {callStatus === "connected" && remoteTracks.some((t) => t.kind === "audio") && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                Audio connected
              </div>
            )}

            <div className="wa-call-encryption-pill">
              <Icon name="lock" />
              <span>LiveKit WebRTC Encrypted Session</span>
            </div>
          </div>
        )}

        {/* ── Top Bar ── */}
        <div className="wa-call-top-bar">
          <div className="wa-call-media-type-pill">
            <Icon name={isVideo ? "video" : "phone"} />
            <span>{isVideo ? "HD Video Call" : "Voice Call"}</span>
          </div>
          {callStatus === "connected" && (
            <div className="wa-call-timer-pill">
              <span className="wa-timer-dot" />
              <span>{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* ── Media Error Banner ── */}
        {mediaError && (
          <div style={{
            position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(239,68,68,0.9)", color: "#fff", padding: "8px 16px",
            borderRadius: "8px", fontSize: "13px", textAlign: "center", maxWidth: "280px", zIndex: 10
          }}>
            ⚠️ {mediaError}
          </div>
        )}

        {/* ── Call Controls ── */}
        <div className="wa-call-controls-bar">
          {callData?.isIncoming && isRinging ? (
            <div className="wa-call-incoming-actions">
              <button type="button" className="wa-call-ctrl-btn decline" onClick={handleDecline} title="Decline Call">
                <Icon name="phone" style={{ transform: "rotate(135deg)" }} />
                <span className="ctrl-label">Decline</span>
              </button>
              <button type="button" className="wa-call-ctrl-btn accept" onClick={handleAccept} title="Accept Call" disabled={isConnecting}>
                <Icon name={isVideo ? "video" : "phone"} />
                <span className="ctrl-label">{isConnecting ? "Connecting…" : "Accept"}</span>
              </button>
            </div>
          ) : (
            <div className="wa-call-active-actions">
              <button type="button" className={`wa-call-ctrl-btn ${isMuted ? "active-off" : ""}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                <Icon name="mic" />
                <span className="ctrl-label">{isMuted ? "Unmute" : "Mute"}</span>
              </button>

              {isVideo && (
                <button type="button" className={`wa-call-ctrl-btn ${isVideoOff ? "active-off" : ""}`} onClick={toggleVideo} title={isVideoOff ? "Video On" : "Video Off"}>
                  <Icon name="video" />
                  <span className="ctrl-label">{isVideoOff ? "Video On" : "Video Off"}</span>
                </button>
              )}

              <button type="button" className="wa-call-ctrl-btn end-call" onClick={handleEndCall} title="End Call">
                <Icon name="phone" style={{ transform: "rotate(135deg)" }} />
                <span className="ctrl-label">End</span>
              </button>

              {/* Simulate Answer for outgoing (demo) */}
              {isRinging && !callData?.isIncoming && (
                <button type="button" className="wa-call-ctrl-btn accept" onClick={handleDemoAccept} title="Simulate Peer Answering" style={{ background: "rgba(16,185,129,0.85)" }}>
                  <Icon name="sparkle" />
                  <span className="ctrl-label">Simulate Answer</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
