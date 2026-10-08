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
    <header className="relative z-30 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
      {/* ── Host Profile & Title ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md border-2 border-pink/60 shrink-0 portrait ${portraitClass(
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
            <span className="text-sm">{hostName[0]?.toUpperCase() || "H"}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
              {hostName}
            </span>
            {isHost ? (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-pink/20 text-pink border border-pink/30">
                HOST
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-white/10 text-white/70">
                Connected
              </span>
            )}
          </div>
          <div className="text-xs text-white/75 truncate max-w-[160px] sm:max-w-[240px]">
            {streamTitle}
          </div>
        </div>
      </div>

      {/* ── Live Badge, Viewers, Sizing & Close ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* LIVE Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[11px] font-extrabold tracking-wider uppercase shadow-[0_0_12px_rgba(220,38,38,0.6)]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>LIVE</span>
        </div>

        {/* Live Viewers & Peak Pill (Clickable to see who is watching) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowViewersModal(!showViewersModal)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white text-xs font-semibold backdrop-blur-md shadow-sm transition-all cursor-pointer"
            title="Click to see who joined the room"
          >
            <div className="flex items-center gap-1 text-emerald-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span>{viewerCount}</span>
            </div>
            {peakViewers > 1 && (
              <span className="text-[10px] text-white/50 border-l border-white/15 pl-1.5 hidden sm:inline">
                Peak {peakViewers}
              </span>
            )}
          </button>

          {/* Connected Viewers Dropdown / Modal */}
          {showViewersModal && (
            <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-gradient-to-b from-[#220d2e] to-[#12071a] border border-white/15 rounded-2xl shadow-2xl z-50 animate-fade-in backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Viewers in Room ({Math.max(viewersList.length, viewerCount)})
                </span>
                <button
                  type="button"
                  onClick={() => setShowViewersModal(false)}
                  className="text-white/60 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {viewersList.length > 0 ? (
                  viewersList.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-white"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink to-purple-600 flex items-center justify-center font-bold text-[10px]">
                          {(v.name || "V")[0]?.toUpperCase()}
                        </div>
                        <span className="truncate font-medium">{v.name || "Viewer"}</span>
                      </div>
                      {isHost && v.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowViewersModal(false);
                            onModerateUser?.({ id: v.id, pseudonym: v.name });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-pink/20 text-pink font-semibold shrink-0"
                        >
                          Moderate
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-white/60 py-2 text-center">
                    {viewerCount > 1
                      ? `${viewerCount} members watching live`
                      : "Waiting for mutual matches to join…"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Window Sizing Controls (Compact / Theater / Fullscreen) */}
        <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-full border border-white/10 backdrop-blur-md">
          {/* Toggle Theater / Expand */}
          <button
            type="button"
            onClick={onToggleSize}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isTheater
                ? "bg-white/25 text-white shadow-inner"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title={isTheater ? "Compact view (440px)" : "Theater view (980px)"}
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

          {/* Toggle Native Fullscreen */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isFullscreen
                ? "bg-white/25 text-white shadow-inner"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen mode"}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>

        {/* Viewer Report Button */}
        {!isHost && (
          <button
            type="button"
            onClick={onOpenReport}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Report this live stream"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </button>
        )}

        {/* Close / Exit Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          title={isHost ? "End live broadcast" : "Exit stream"}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
