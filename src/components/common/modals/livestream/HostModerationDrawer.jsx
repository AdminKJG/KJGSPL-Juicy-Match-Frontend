import React from "react";
import Icon from "../../ui/Icon";

/**
 * HostModerationDrawer
 * Dialog for the host to moderate a specific viewer (mute from chat or permanently ban from the room).
 */
export default function HostModerationDrawer({
  target,
  onMute,
  onBan,
  onClose,
}) {
  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gradient-to-b from-[#251330] to-[#120817] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-cream"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-base font-bold text-white">Moderate Viewer</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-cream/70">
          Take moderation action on <strong className="text-white font-bold">{target.pseudonym || "Viewer"}</strong> for this live stream:
        </p>

        <div className="flex flex-col gap-2">
          {/* Mute Button */}
          <button
            type="button"
            onClick={() => onMute?.(target)}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <span className="text-sm">🔇</span>
            <span>Mute Chat (Viewer cannot post messages)</span>
          </button>

          {/* Ban Button */}
          <button
            type="button"
            onClick={() => onBan?.(target)}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-500/30 text-red-400 font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <span className="text-sm">🚫</span>
            <span>Ban from Stream (Kick & block re-entry)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
