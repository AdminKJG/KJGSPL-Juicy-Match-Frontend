import React, { useState } from "react";
import { portraitClass } from "../../../../utils/formatters";

/**
 * ViewerCountHeader
 * Top bar header displaying host info, live badge, viewer count, peak viewers, size toggles, viewers list drawer, and stream actions.
 */
export default function ViewerCountHeader({
  stream,
  isHost,
  viewerCount = 1,
  peakViewers = 1,
  sizeMode = "compact",
  viewersList = [],
  onToggleSize,
  onToggleFullscreen,
  onMinimize,
  onOpenReport,
  onModerateUser,
  onClose,
}) {
  const [showViewersModal, setShowViewersModal] = useState(false);
  const hostName = stream?.hostName || stream?.pseudonym || stream?.creator || "Host";
  const streamTitle = stream?.title || "Live Broadcast";
  const portraitIdx = stream?.hostPortrait ?? stream?.portrait ?? 0;
  const isTheater = sizeMode === "theater";
  const isFullscreen = sizeMode === "fullscreen";

  return (
    <header className="relative z-30 flex items-center justify-between gap-2 px-3 py-2.5 bg-black/70 backdrop-blur-md border-b border-white/10 select-none">
      {/* ── Left: Host Avatar, Name & Live Badge ── */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border border-pink/60 shrink-0 portrait ${portraitClass(
            portraitIdx
          )}`}
        >
          {stream?.hostPhoto || stream?.photo ? (
            <img
              src={stream.hostPhoto || stream.photo}
              alt=""
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-xs">{hostName[0]?.toUpperCase() || "H"}</span>
          )}
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[150px]">
              {hostName}
            </span>
            {isHost && (
              <span className="px-1 py-0.2 text-[9px] font-extrabold uppercase rounded bg-pink/20 text-pink border border-pink/30">
                HOST
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/50 truncate max-w-[100px] sm:max-w-[160px] leading-tight">
            {streamTitle}
          </span>
        </div>

        {/* LIVE Badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold tracking-wider uppercase shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {/* ── Right: Viewers, Minimize (ICON ONLY), Sizing & Close/End ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Live Viewers Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowViewersModal(!showViewersModal)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-semibold transition-all cursor-pointer"
            title="Viewers in room"
          >
            <span className="text-emerald-400">👁</span>
            <span>{viewerCount}</span>
          </button>

          {/* Viewers Dropdown Modal */}
          {showViewersModal && (
            <div className="absolute right-0 top-full mt-2 w-52 p-3 bg-[#180a20] border border-white/15 rounded-xl z-50 animate-fade-in backdrop-blur-xl">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Viewers ({Math.max(viewersList.length, viewerCount)})
                </span>
                <button
                  type="button"
                  onClick={() => setShowViewersModal(false)}
                  className="text-white/60 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                {viewersList.length > 0 ? (
                  viewersList.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="flex items-center justify-between gap-2 p-1 rounded hover:bg-white/5 text-xs text-white"
                    >
                      <span className="truncate">{v.name || "Viewer"}</span>
                      {isHost && v.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowViewersModal(false);
                            onModerateUser?.({ id: v.id, pseudonym: v.name });
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-pink/20 text-pink font-semibold"
                        >
                          Mute
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-white/50 py-1 text-center">
                    {viewerCount > 1 ? `${viewerCount} watching live` : "Waiting for viewers…"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Minimize Button - ICON ONLY */}
        <button
          type="button"
          onClick={onMinimize}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          title="Minimize (PiP)"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
          </svg>
        </button>

        {/* Toggle Theater / Expand - ICON ONLY */}
        <button
          type="button"
          onClick={onToggleSize}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isTheater ? "bg-white/25 text-white" : "bg-white/10 hover:bg-white/20 text-white/80"
          }`}
          title={isTheater ? "Compact view" : "Theater view"}
        >
          {isTheater ? (
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          )}
        </button>

        {/* Viewer Report Button */}
        {!isHost && (
          <button
            type="button"
            onClick={onOpenReport}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 transition-all cursor-pointer"
            title="Report Stream"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </button>
        )}

        {/* Host "End Live" or Viewer "Exit" Button */}
        {isHost ? (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            title="End Broadcast"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>End Live</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-500/30 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Exit live stream"
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
}
