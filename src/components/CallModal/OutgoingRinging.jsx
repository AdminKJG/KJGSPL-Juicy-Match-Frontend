import React, { useEffect, useRef, useState } from "react";
import { playRingtone } from "../../utils/formatters";
import { useApp } from "../../context/AppContext";

export default function OutgoingRinging({ callState, sizeMode = "compact", onCancel }) {
  const { state } = useApp();
  const { call, performAction } = callState;
  const peer = call?.peer || {};
  const peerName = peer.pseudonym || peer.name || "Member";
  const avatarUrl = peer.avatar || peer.photo || "/assets/logo.jpg";
  const isVideo = call?.medium === "video";
  const isExpanded = sizeMode === "theater" || sizeMode === "fullscreen";

  const ringtoneRef = useRef(null);
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const [hasCameraStream, setHasCameraStream] = useState(false);

  // Play ringtone
  useEffect(() => {
    try {
      ringtoneRef.current = playRingtone();
    } catch {}
    return () => {
      try {
        ringtoneRef.current?.stop?.();
      } catch {}
    };
  }, []);

  // Live Local Camera Preview for Video Calls
  useEffect(() => {
    if (!isVideo) return;
    let isCancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setHasCameraStream(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn("Camera preview note:", err.message);
      });

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isVideo]);

  const handleEnd = async () => {
    try {
      ringtoneRef.current?.stop?.();
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    await performAction("end");
    onCancel?.();
  };

  return (
    <div className="relative w-full h-full min-h-[520px] flex flex-col items-center justify-between p-8 sm:p-10 bg-gradient-to-b from-[#1c1024] via-[#140a1b] to-[#0d0812] text-white select-none overflow-hidden rounded-2xl">
      {/* ── Background Local Camera Preview for Video Call ── */}
      {isVideo && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${
              hasCameraStream ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Subtle gradient vignette over local camera */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/80 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Top Header Pill */}
      <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-[#e2d6e8] text-[11px] font-bold tracking-[0.12em] uppercase backdrop-blur-md shadow-lg">
        <span>🔒 Private Invitation</span>
        <span className="text-white/40">·</span>
        <span className="text-[#e91671]">{isVideo ? "Video" : "Voice"}</span>
      </div>

      {/* Center Animated Rings & Avatar */}
      <div className="relative z-10 flex flex-col items-center my-auto">
        <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center mb-6">
          {/* Animated ripple waves */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-[#e91671]/40 bg-[#e91671]/10 animate-ripple pointer-events-none"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          ))}

          {/* Avatar Container */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#e91671] shadow-[0_0_35px_rgba(233,22,113,0.55)] z-10 bg-[#281330]">
            <img
              src={avatarUrl}
              alt={peerName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/assets/logo.jpg";
              }}
            />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center m-0 drop-shadow-md">
          {peerName}
        </h2>
        <p className="text-[#e2d6e8] text-sm sm:text-base font-medium mt-2 flex items-center gap-2 drop-shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e91671] animate-ping" />
          Ringing…
        </p>

        {/* Feature Credits Rate Preview */}
        <div className="mt-3 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/15 text-xs text-white/90 flex items-center gap-2 backdrop-blur-md shadow-md">
          <span className="text-amber-400 font-bold flex items-center gap-1">
            ⚡ {state.wallet?.featureCredits ?? 100} FC
          </span>
          <span className="text-white/30">·</span>
          <span>Rate: {isVideo ? "15" : "5"} FC/min</span>
          <span className="text-white/30">·</span>
          <span className="text-pink text-[11px] font-semibold">Caller Billed</span>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="relative z-10 flex flex-col items-center gap-4 w-full">
        <div className="flex items-center justify-center">
          {/* Cancel / End button */}
          <button
            type="button"
            onClick={handleEnd}
            className="w-16 h-16 rounded-full bg-[#ff5656] hover:bg-[#ff3b3b] text-white flex items-center justify-center shadow-[0_6px_25px_rgba(255,86,86,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
            title="Cancel Call"
            aria-label="Cancel Call"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
          </button>
        </div>

        <p className="text-white/60 text-xs text-center m-0 drop-shadow-sm">
          Calls expire automatically. No recording.
        </p>
      </div>
    </div>
  );
}
