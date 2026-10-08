import React, { useEffect, useRef, useState, useCallback } from "react";
import { Track, RoomEvent } from "livekit-client";
import { useApp } from "../../context/AppContext";

export default function ActiveCall({ callState, sizeMode = "compact", onClose }) {
  const { state } = useApp();
  const {
    call,
    room,
    isVideo,
    isSimulated,
    mic,
    camera,
    callSeconds,
    formatTime,
    toggleMic,
    toggleCamera,
    performAction,
  } = callState;

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [remoteTrack, setRemoteTrack] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [localTrack, setLocalTrack] = useState(null);
  const remoteAudioRef = useRef(null);
  const simAnimRef = useRef(null);

  const peer = call?.peer || {};
  const peerName = peer.pseudonym || peer.name || "Member";
  const avatarUrl = peer.avatar || peer.photo || "/assets/logo.jpg";
  const myName = state?.me?.profile?.pseudonym || state?.me?.pseudonym || "You";
  const myAvatar = state?.me?.profile?.photo || state?.me?.avatar || null;
  const isExpanded = sizeMode === "theater" || sizeMode === "fullscreen";

  // Alphabetical / Initial helpers (like WhatsApp)
  const peerInitial = (peerName || "M").trim().slice(0, 1).toUpperCase();
  const myInitial = (myName || "Y").trim().slice(0, 1).toUpperCase();

  // Callback ref for remote video to guarantee attachment
  const remoteVideoCallback = useCallback(
    (el) => {
      remoteVideoRef.current = el;
      if (el && remoteTrack) {
        remoteTrack.attach(el);
      }
    },
    [remoteTrack]
  );

  const remoteAudioCallback = useCallback(
    (el) => {
      remoteAudioRef.current = el;
      if (el && remoteAudioTrack) {
        remoteAudioTrack.attach(el);
        el.play?.().catch(() => {});
      }
    },
    [remoteAudioTrack]
  );

  // Callback ref for local video to guarantee attachment
  const localVideoCallback = useCallback(
    (el) => {
      localVideoRef.current = el;
      if (el && localTrack) {
        localTrack.attach(el);
      }
    },
    [localTrack]
  );

  // Simulated feed for demo / test mode
  useEffect(() => {
    if (!isSimulated || !isVideo) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      let frame = 0;
      let animId = null;

      const draw = () => {
        frame++;
        const grad = ctx.createRadialGradient(640, 360, 40, 640, 360, 600);
        grad.addColorStop(0, "#2c1236");
        grad.addColorStop(1, "#0a0310");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        // Ambient pulse circle
        const pulse = Math.sin(frame * 0.05) * 15;
        ctx.beginPath();
        ctx.arc(640, 320, 120 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(233, 22, 113, 0.25)";
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(peerName, 640, 320);

        ctx.fillStyle = "#d5c6eb";
        ctx.font = "20px sans-serif";
        ctx.fillText("● Live Demo Video Feed", 640, 370);

        animId = requestAnimationFrame(draw);
      };

      draw();
      const stream = canvas.captureStream(30);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }

      simAnimRef.current = () => cancelAnimationFrame(animId);
    } catch (e) {
      console.warn("Simulated canvas feed note:", e);
    }

    return () => {
      if (simAnimRef.current) simAnimRef.current();
    };
  }, [isSimulated, isVideo, peerName]);

  // Subscribe to LiveKit video & audio tracks + mute events
  useEffect(() => {
    if (!room) return;

    try {
      room.startAudio?.().catch(() => {});
    } catch {}

    const handleTrackSubscribed = (track, pub, participant) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteTrack(track);
        setRemoteCameraOff(track.isMuted);
        if (remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
          remoteVideoRef.current.play?.().catch(() => {});
        }
      }
      if (track.kind === Track.Kind.Audio) {
        console.log("🔊 [LiveKit] Remote Audio Track Subscribed:", track);
        setRemoteAudioTrack(track);
        setRemoteMuted(track.isMuted);
        if (remoteAudioRef.current) {
          track.attach(remoteAudioRef.current);
          remoteAudioRef.current.play?.().catch(() => {});
        } else {
          const el = track.attach();
          el.id = "jm-livekit-remote-audio";
          el.style.position = "fixed";
          el.style.top = "-9999px";
          el.style.opacity = "0.01";
          el.style.pointerEvents = "none";
          document.body.appendChild(el);
          el.play?.().catch(() => {});
        }
      }
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteTrack(null);
        setRemoteCameraOff(true);
        try { track.detach(); } catch {}
      }
      if (track.kind === Track.Kind.Audio) {
        setRemoteAudioTrack(null);
        try { track.detach(); } catch {}
        const fallback = document.getElementById("jm-livekit-remote-audio");
        if (fallback) fallback.remove();
      }
    };

    const handleTrackMuted = (pub, participant) => {
      if (participant !== room.localParticipant) {
        if (pub.kind === Track.Kind.Audio) {
          setRemoteMuted(true);
        }
        if (pub.kind === Track.Kind.Video) {
          setRemoteCameraOff(true);
        }
      }
    };

    const handleTrackUnmuted = (pub, participant) => {
      if (participant !== room.localParticipant) {
        if (pub.kind === Track.Kind.Audio) {
          setRemoteMuted(false);
        }
        if (pub.kind === Track.Kind.Video) {
          setRemoteCameraOff(false);
        }
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.TrackMuted, handleTrackMuted);
    room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);

    // Attach any existing subscribed tracks from remote participants
    room.remoteParticipants?.forEach((participant) => {
      participant.trackPublications?.forEach((pub) => {
        if (pub.isSubscribed && pub.track) {
          handleTrackSubscribed(pub.track, pub, participant);
        }
      });
    });

    // Check and attach local video track
    const checkLocalVideo = () => {
      const localPub = room.localParticipant?.videoTrackPublications?.values().next().value;
      if (localPub?.track) {
        setLocalTrack(localPub.track);
        if (localVideoRef.current) {
          localPub.track.attach(localVideoRef.current);
        }
      }
    };
    checkLocalVideo();
    room.on(RoomEvent.LocalTrackPublished, checkLocalVideo);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.TrackMuted, handleTrackMuted);
      room.off(RoomEvent.TrackUnmuted, handleTrackUnmuted);
      room.off(RoomEvent.LocalTrackPublished, checkLocalVideo);
    };
  }, [room]);

  // Fallback local video preview when room is not yet connected or in simulated mode
  useEffect(() => {
    if (!room && isVideo && camera) {
      let stream = null;
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
            localVideoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});

      return () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    }
  }, [room, isVideo, camera]);

  return (
    <div className="relative w-full h-full flex-1 min-h-[500px] bg-[#0d0812] overflow-hidden flex flex-col justify-between select-none">
      <audio
        ref={remoteAudioCallback}
        autoPlay
        playsInline
        style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: "none" }}
      />

      {/* ── Background: Remote Video OR Audio Avatar ── */}
      {isVideo && (remoteTrack || isSimulated) && !remoteCameraOff ? (
        <video
          ref={remoteVideoCallback}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#261226] via-[#1a0c1b] to-[#0d0812] flex flex-col items-center justify-center z-0 p-6">
          <div className="relative p-3 rounded-full border-2 border-[#c0396b] animate-pulse">
            <div className={`${isExpanded ? "w-44 h-44 sm:w-52 sm:h-52 text-5xl" : "w-32 h-32 sm:w-36 sm:h-36 text-4xl"} rounded-full overflow-hidden border-2 border-[#e91671] shadow-2xl bg-gradient-to-br from-[#be123c] to-[#7c3aed] flex items-center justify-center text-white font-bold transition-all duration-300`}>
              {avatarUrl && avatarUrl !== "/assets/logo.jpg" ? (
                <img
                  src={avatarUrl}
                  alt={peerName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>{peerInitial}</span>
              )}
            </div>
          </div>
          {isVideo && (
            <span className="mt-4 px-3.5 py-1 rounded-full bg-black/60 border border-white/10 text-white/70 text-xs font-medium backdrop-blur-md">
              📷 {peerName}'s camera is off
            </span>
          )}
        </div>
      )}

      {/* ── Top Bar: Encryption label, Peer Name, Timer, Mute Badges ── */}
      <div className="relative z-10 w-full pt-4 pb-2 px-6 flex flex-col items-center bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-white/60 text-[11px] tracking-wider uppercase font-semibold flex items-center gap-1.5">
          🔒 End-to-End Encrypted
        </span>
        <div className="flex items-center gap-2 mt-1">
          <h3 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-0">
            {peerName}
          </h3>
          {remoteMuted && (
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[11px] font-semibold flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              Muted
            </span>
          )}
        </div>
        <span className="text-[#a8e4b0] text-sm font-medium tracking-wide mt-0.5">
          {formatTime(callSeconds)}
        </span>
      </div>

      {/* ── PiP: Local Camera Preview OR Initial Avatar when Camera is Off (WhatsApp Style) ── */}
      {isVideo && (
        <div
          className={`absolute ${
            isExpanded
              ? "bottom-28 right-6 w-44 h-60 sm:w-52 sm:h-72"
              : "bottom-28 right-4 w-28 h-40 sm:w-32 sm:h-44"
          } rounded-2xl overflow-hidden border-2 ${
            !camera ? "border-red-500/30 bg-[#190c24]" : "border-white/20 bg-black"
          } shadow-2xl z-20 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 flex flex-col items-center justify-center`}
          title={camera ? "Your Camera" : "Your Camera is Off"}
        >
          {camera ? (
            <video
              ref={localVideoCallback}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            /* WhatsApp-style Initial Avatar when Camera is Off */
            <div className="w-full h-full bg-gradient-to-br from-[#2a1336] via-[#1b0a24] to-[#0d0513] flex flex-col items-center justify-center p-3 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#e91671] to-[#9333ea] border-2 border-white/20 flex items-center justify-center text-white font-extrabold text-lg sm:text-2xl shadow-lg mb-2">
                {myAvatar ? (
                  <img src={myAvatar} alt={myName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{myInitial}</span>
                )}
              </div>
              <span className="text-white/80 font-semibold text-[11px] sm:text-xs truncate max-w-[90%]">
                {myName}
              </span>
              <span className="text-red-400 font-medium text-[10px] mt-0.5 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                Camera Off
              </span>
            </div>
          )}

          {/* Local Mute Indicator on PiP */}
          {!mic && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              Muted
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Controls Bar ── */}
      <div className="relative z-10 w-full px-6 py-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-col items-center gap-3">
        {/* Local Mute Notice Pill */}
        {!mic && (
          <div className="px-3.5 py-1 rounded-full bg-red-600/80 border border-red-400/30 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-lg animate-pulse">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            You are muted
          </div>
        )}

        <div className="flex items-center justify-center gap-5">
          {/* Mic Toggle */}
          <button
            type="button"
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
              mic
                ? "bg-white/15 hover:bg-white/25 border-transparent text-white"
                : "bg-red-500/25 hover:bg-red-500/35 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.35)]"
            }`}
            title={mic ? "Mute Microphone" : "Unmute Microphone"}
            aria-label={mic ? "Mute Microphone" : "Unmute Microphone"}
          >
            {mic ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            )}
          </button>

          {/* Camera Toggle (Video Call Only) */}
          {isVideo && (
            <button
              type="button"
              onClick={toggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                camera
                  ? "bg-white/15 hover:bg-white/25 border-transparent text-white"
                  : "bg-red-500/25 hover:bg-red-500/35 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.35)]"
              }`}
              title={camera ? "Turn off Camera" : "Turn on Camera"}
              aria-label={camera ? "Turn off Camera" : "Turn on Camera"}
            >
              {camera ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              )}
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={() => performAction("end")}
            className="w-16 h-16 rounded-full bg-[#ff5656] hover:bg-[#ff3b3b] text-white flex items-center justify-center shadow-[0_6px_25px_rgba(255,86,86,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
            title="End Call"
            aria-label="End Call"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
