import React from "react";
import Icon from "../../ui/Icon";

/**
 * LiveControlsBar
 * Bottom bar with quick reaction emoji buttons, chat input field, host audio/video controls, and end/leave actions.
 */
export default function LiveControlsBar({
  isHost,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onSendReaction,
  isSending = false,
  isMuted = false,
  isVideoOff = false,
  isMutedByHost = false,
  onToggleMute,
  onToggleVideo,
  onEndStream,
  onLeaveStream,
}) {
  const QUICK_REACTIONS = ["❤️", "🔥", "👏", "✨", "😍", "🎉", "🍑"];

  return (
    <div className="relative z-30 flex flex-col gap-2 p-3 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-md border-t border-white/10">
      {/* ── Quick Reactions Row ── */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 px-1">
        <div className="flex items-center gap-1.5 flex-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendReaction?.(emoji)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-125 transition-transform flex items-center justify-center text-lg sm:text-xl shadow-sm cursor-pointer select-none"
              title={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Floating Heart Burst Button */}
        <button
          type="button"
          onClick={() => {
            onSendReaction?.("❤️");
            onSendReaction?.("💖");
            onSendReaction?.("✨");
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-pink via-[#ff2a85] to-rose-400 text-white flex items-center justify-center text-xl shadow-[0_0_16px_rgba(233,22,113,0.6)] active:scale-110 hover:scale-105 transition-all cursor-pointer select-none shrink-0"
          title="Send heart burst"
        >
          ❤️
        </button>
      </div>

      {/* ── Chat Input & Action Buttons ── */}
      <div className="flex items-center gap-2">
        {/* Chat input form */}
        <form onSubmit={onSendMessage} className="flex-1 relative flex items-center">
          <input
            type="text"
            placeholder={
              isMutedByHost
                ? "You have been muted in this stream"
                : "Say something live…"
            }
            value={chatInput}
            onChange={(e) => onChatInputChange?.(e.target.value)}
            disabled={isMutedByHost || isSending}
            maxLength={250}
            className="w-full h-10 pl-4 pr-10 rounded-full bg-white/10 focus:bg-white/15 border border-white/15 focus:border-pink/60 text-white placeholder-white/40 text-sm outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isSending || isMutedByHost}
            className="absolute right-1.5 w-7 h-7 rounded-full bg-pink hover:bg-[#ff2a85] disabled:bg-white/10 text-white disabled:text-white/30 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Send chat message"
          >
            <Icon name="arrow-right" className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Host Controls */}
        {isHost ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                isMuted
                  ? "bg-red-500/30 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              <Icon name="mic" className="w-4 h-4" />
            </button>

            {/* Video Toggle */}
            <button
              type="button"
              onClick={onToggleVideo}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                isVideoOff
                  ? "bg-red-500/30 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
              }`}
              title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              <Icon name="video" className="w-4 h-4" />
            </button>

            {/* End Stream Button */}
            <button
              type="button"
              onClick={onEndStream}
              className="h-10 px-3.5 rounded-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-[0_4px_14px_rgba(220,38,38,0.4)] transition-all cursor-pointer whitespace-nowrap"
            >
              End
            </button>
          </div>
        ) : (
          /* Viewer Leave Button */
          <button
            type="button"
            onClick={onLeaveStream}
            className="h-10 px-4 rounded-full bg-white/10 hover:bg-red-500/30 border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
          >
            Exit
          </button>
        )}
      </div>
    </div>
  );
}
