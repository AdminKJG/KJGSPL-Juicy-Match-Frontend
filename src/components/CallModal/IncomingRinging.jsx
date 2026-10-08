import React, { useEffect, useRef } from "react";
import { playRingtone } from "../../utils/formatters";

export default function IncomingRinging({ callState, sizeMode = "compact", onClose }) {
  const { call, isVideo, performAction } = callState;
  const peer = call?.peer || {};
  const peerName = peer.pseudonym || peer.name || "Match";
  const avatarUrl = peer.avatar || peer.photo || "/assets/logo.jpg";
  const isExpanded = sizeMode === "theater" || sizeMode === "fullscreen";

  const ringtoneRef = useRef(null);

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

  const accept = async () => {
    try {
      ringtoneRef.current?.stop?.();
    } catch {}
    await performAction("accept");
  };

  const decline = async () => {
    try {
      ringtoneRef.current?.stop?.();
    } catch {}
    await performAction("decline");
    onClose?.();
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col items-center justify-between p-8 sm:p-10 bg-[radial-gradient(ellipse_at_30%_20%,_#3b1d34,_#0d0812)] text-white select-none">
      {/* Top Header */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-semibold tracking-wider uppercase">
        <span>Incoming {isVideo ? "Video" : "Voice"} Call</span>
      </div>

      {/* Center Caller Info & Glowing Avatar */}
      <div className="flex flex-col items-center my-auto">
        <div className="relative p-2 rounded-full border-2 border-white/30 animate-pulse-glow mb-6 bg-white/5">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#e91671] shadow-2xl bg-[#281330]">
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

        <h2 className="text-3xl font-bold text-white tracking-tight text-center m-0">
          {peerName}
        </h2>
        <p className="text-[#cdafc4] text-base font-normal mt-2 tracking-wide">
          {isVideo ? "Incoming Video Call…" : "Incoming Voice Call…"}
        </p>
      </div>

      {/* Bottom Accept / Decline Action Group */}
      <div className="flex items-center justify-around w-full max-w-xs px-4">
        {/* Decline Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={decline}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#ff5656] hover:bg-[#ff3b3b] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(255,86,86,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
            title="Decline Call"
            aria-label="Decline Call"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
          </button>
          <span className="text-sm font-semibold text-[#e8d8e0]">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={accept}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#4ade80] hover:bg-[#22c55e] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(74,222,128,0.45)] animate-bounce-up hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
            title="Accept Call"
            aria-label="Accept Call"
          >
            {isVideo ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            )}
          </button>
          <span className="text-sm font-semibold text-[#e8d8e0]">Accept</span>
        </div>
      </div>
    </div>
  );
}
