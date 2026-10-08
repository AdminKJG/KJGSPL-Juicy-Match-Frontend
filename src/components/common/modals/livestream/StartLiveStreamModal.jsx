import React from "react";
import Icon from "../../ui/Icon";
import { portraitClass } from "../../../../utils/formatters";

/**
 * StartLiveStreamModal
 * Premium, user-friendly modal dialog for creating and launching a new live broadcast.
 */
export default function StartLiveStreamModal({
  isOpen,
  streamTitle,
  onTitleChange,
  onSubmit,
  onClose,
  currentUser,
}) {
  if (!isOpen) return null;

  const myName = currentUser?.profile?.pseudonym || currentUser?.name || "Host";
  const myPhoto = currentUser?.profile?.photo;
  const myPortrait = currentUser?.profile?.portrait ?? 0;

  const PRESETS = [
    "✨ Chill & Chat",
    "☕ Coffee Hangout",
    "🍷 Late Night Lounge",
    "🎵 Music & Vibes",
    "💬 Open Q&A Session",
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#25122e] via-[#160a1c] to-[#0d0511] border border-pink/30 rounded-3xl p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col gap-5 text-cream relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink to-[#ff2a85] flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(233,22,113,0.5)]">
              🎥
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Start a Live Stream</h3>
              <p className="text-xs text-white/70 mt-0.5">
                Broadcast live video & audio to your mutual connections
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Host Identity Badge */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md portrait ${portraitClass(
              myPortrait
            )}`}
          >
            {myPhoto ? (
              <img src={myPhoto} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span>{myName[0]?.toUpperCase() || "H"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">{myName}</span>
              <span className="px-1.5 py-0.2 bg-pink/20 border border-pink/30 text-pink text-[10px] font-bold rounded uppercase">
                Host
              </span>
            </div>
            <p className="text-[11px] text-white/60">Your mutual friends will be notified when you go live</p>
          </div>
        </div>

        {/* Stream Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-pink uppercase tracking-wider mb-2">
              Broadcast Title
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Evening Chat & Vibes ✨"
              value={streamTitle}
              onChange={(e) => onTitleChange?.(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-pink text-white placeholder-white/40 text-sm outline-none transition-all shadow-inner"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-medium text-white/60 mb-2">
              Or pick a quick vibe:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onTitleChange?.(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    streamTitle === preset
                      ? "bg-pink/25 border-pink text-white shadow-sm"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Badges */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-white/70">
            <span className="flex items-center gap-1">📹 HD Video</span>
            <span className="flex items-center gap-1">💬 Live Chat</span>
            <span className="flex items-center gap-1">❤️ Reactions</span>
            <span className="flex items-center gap-1">👁️ Real-time Viewers</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-pink via-[#ff2a85] to-rose-500 hover:from-[#ff2a85] hover:to-pink text-white text-sm font-bold shadow-[0_4px_20px_rgba(233,22,113,0.5)] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Go Live Now</span>
              <span>🚀</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
