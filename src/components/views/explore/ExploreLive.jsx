import React from "react";
import Loader from "../../common/Loader";
import Icon from "../../common/Icon";
import { formatRelativeTime } from "../../../utils/formatters";

export default function ExploreLive({
  liveStreams,
  loadLiveStreams,
  isStartingStream,
  setIsStartingStream,
  streamTitleInput,
  setStreamTitleInput,
  handleConfirmStartStream,
  handleWatchStream,
  goLiveContainerRef,
  state,
  liveSparks,
  loadingLive,
  userMood,
  setUserMood,
  isChangingMood,
  setIsChangingMood,
  handleSendWave,
  handleOpenLiveLounge,
  liveFeed
}) {
  return (
    <section className="animate-[fadeIn_0.3s_ease-out]">
      {/* ============================================================
          LIVE VIDEO BROADCASTS (GO LIVE & WEBRTC ROOMS)
          ============================================================ */}
      <div className="mt-2 mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="text-[0.75rem] font-bold tracking-widest uppercase text-pink flex items-center gap-1.5 m-0">
              <span className="w-2.5 h-2.5 bg-pink rounded-full animate-ping-slow shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span>LIVE BROADCASTS</span>
            </div>
            {liveStreams.length > 0 && (
              <span className="bg-pink/20 text-pink font-bold text-[0.74rem] px-2 py-0.5 rounded-full border border-pink/30">
                {liveStreams.length} Active Now
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-muted hover:text-white transition-colors text-sm font-semibold flex-1 sm:flex-initial"
              onClick={loadLiveStreams}
              title="Refresh active streams"
            >
              <Icon name="refresh" className="w-4 h-4" />
              <span>Refresh</span>
            </button>

            <div className="relative flex-1 sm:flex-initial" ref={goLiveContainerRef}>
              <button
                type="button"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-br from-pink to-[#e11d48] hover:from-[#ff2a85] hover:to-pink text-white rounded-xl font-bold shadow-[0_4px_18px_rgba(244,63,94,0.4)] transition-all hover:scale-105"
                onClick={() => {
                  setIsStartingStream((prev) => !prev);
                  if (!streamTitleInput) {
                    setStreamTitleInput(`${state.me?.profile?.pseudonym || "Host"}'s Live Stream ✨`);
                  }
                }}
              >
                <span>Go Live</span> 🎥
              </button>

              {/* Floating Popover */}
              {isStartingStream && (
                <div className="absolute right-0 top-[calc(100%+12px)] w-[320px] bg-surface rounded-2xl p-5 shadow-2xl border border-white/10 z-50 animate-[fadeIn_0.2s_ease-out]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎥</span>
                      <div>
                        <h4 className="m-0 text-white text-[1.05rem] font-bold">Start Live Stream</h4>
                        <span className="text-[0.74rem] text-muted">Broadcast live video & audio</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
                      onClick={() => setIsStartingStream(false)}
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleConfirmStartStream}>
                    <label className="block text-[0.72rem] font-extrabold text-pink tracking-[0.5px] mb-1.5">
                      STREAM TITLE
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Evening Chat & Vibes ✨"
                      value={streamTitleInput}
                      onChange={(e) => setStreamTitleInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-pink mb-4 transition-colors"
                    />

                    <p className="text-[0.8rem] text-muted mb-4 leading-relaxed">
                      Your mutual connections will be notified. Your stream will be visible on the Explore tab until you end it.
                    </p>

                    <button
                      type="submit"
                      className="w-full flex justify-center items-center gap-2 bg-gradient-to-br from-pink to-[#e11d48] text-white font-bold py-2.5 rounded-xl shadow-lg transition-transform hover:scale-[1.02]"
                    >
                      <span>Start Broadcasting</span> 🚀
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {liveStreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveStreams.map((s) => (
              <div key={s.id || s.streamId} className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-white/5 group relative transition-transform hover:-translate-y-1">
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 border border-white/10">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping-slow"></span>
                  <span className="text-white text-[0.7rem] font-bold tracking-widest uppercase">Live</span>
                </div>
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1 z-10 border border-white/10 text-white text-[0.75rem] font-semibold">
                  <Icon name="user" className="w-3 h-3" />
                  {s.viewerCount || 1}
                </div>

                <div className="h-[180px] w-full bg-gradient-to-br from-pink/20 to-lilac/20 relative overflow-hidden flex items-center justify-center">
                  {s.hostPhoto ? (
                    <img src={s.hostPhoto} alt={s.hostName} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink to-lilac flex items-center justify-center text-4xl font-serif font-bold text-white shadow-xl">
                      {s.hostName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
                </div>

                <div className="p-4 relative z-20 -mt-8">
                  <h3 className="m-0 text-white font-bold text-lg mb-1 line-clamp-1 drop-shadow-md">{s.title || "Live Stream"}</h3>
                  <p className="m-0 text-cream text-[0.85rem] flex items-center gap-1.5">
                    Hosted by <strong>{s.hostName || "Host"}</strong>
                  </p>

                  <button
                    type="button"
                    className="w-full mt-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-2 rounded-xl transition-colors backdrop-blur flex justify-center items-center gap-2"
                    onClick={() => handleWatchStream(s)}
                  >
                    <span>Watch Stream</span>
                    <span className="text-lg leading-none">📺</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 text-center shadow-inner">
            <div className="text-4xl mb-3 opacity-80">📡</div>
            <h3 className="text-white font-serif font-bold text-lg m-0 mb-2">No active broadcasts</h3>
            <p className="text-muted text-[0.9rem] max-w-md mx-auto m-0">
              There are no members broadcasting right now. Be the first to start a live room and invite others!
            </p>
          </div>
        )}
      </div>

      {/* ============================================================
          LIVE RADAR (Sparks)
          ============================================================ */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-[0.75rem] font-bold tracking-widest uppercase text-lilac mb-1">
            Realtime Radar
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-white m-0 flex items-center gap-2">
            Nearby Live Sparks
            {loadingLive && <span className="animate-spin text-sm">↻</span>}
          </h2>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
            <div className="flex items-center gap-4 w-full">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink to-lilac grid place-items-center font-bold text-white text-xl shadow-lg relative z-10">
                  {state.me?.profile?.pseudonym?.[0]?.toUpperCase() || "M"}
                </div>
                <span className="absolute -bottom-1 -right-1 bg-green w-4 h-4 rounded-full border-2 border-surface z-20"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.7rem] font-bold tracking-widest uppercase text-muted mb-0.5">Your status broadcast</div>
                {isChangingMood ? (
                  <input
                    type="text"
                    className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-pink"
                    value={userMood}
                    onChange={(e) => setUserMood(e.target.value)}
                    onBlur={() => setIsChangingMood(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsChangingMood(false)}
                    autoFocus
                  />
                ) : (
                  <div className="text-white text-[0.95rem] font-medium truncate" onClick={() => setIsChangingMood(true)} title="Click to edit">
                    {userMood} <Icon name="pencil" className="inline w-3 h-3 text-muted ml-1 cursor-pointer hover:text-white" />
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[0.8rem] font-bold rounded-lg transition-colors whitespace-nowrap shrink-0"
              onClick={() => handleOpenLiveLounge()}
            >
              🎧 Join Live Lounge
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {liveSparks.map((spark) => (
              <div key={spark.id} className="bg-surface p-4 sm:p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-transform hover:-translate-y-0.5 group">
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full text-white grid place-items-center font-bold text-xl shadow-lg relative z-10" style={{ background: spark.color }}>
                      {spark.avatarLetter}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface z-20 ${spark.onlineMins.includes("now") ? "bg-green" : "bg-yellow-500"}`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white font-bold text-lg">{spark.pseudonym}</span>
                      <span className="text-muted text-sm">{spark.age}</span>
                      <span className="text-[0.65rem] uppercase tracking-widest font-bold text-pink bg-pink/10 px-1.5 py-0.5 rounded ml-1">
                        {spark.distance}
                      </span>
                    </div>
                    <p className="m-0 text-cream text-[0.9rem] italic border-l-2 border-white/10 pl-2 py-0.5 mt-1 truncate">
                      "{spark.mood}"
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    className="flex-1 sm:flex-initial flex justify-center items-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white hover:bg-pink hover:border-pink transition-all shadow-md"
                    onClick={() => handleSendWave(spark)}
                    title={`Wave at ${spark.pseudonym}`}
                  >
                    👋
                  </button>
                  <button
                    type="button"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white hover:text-black transition-all shadow-md"
                  >
                    <span>Say Hi</span>
                    <Icon name="chat" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-surface/60 rounded-2xl p-5 border border-white/5 sticky top-24 shadow-inner">
            <h4 className="m-0 mb-4 text-white font-bold text-[0.95rem] border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-lilac">⚡</span> Live Feed
            </h4>
            <div className="flex flex-col gap-3">
              {liveFeed.length > 0 ? (
                liveFeed.map((item) => (
                  <div key={item.id} className="flex gap-3 text-[0.82rem] animate-[fadeIn_0.3s_ease-out]">
                    <span className="shrink-0 text-lg">{item.icon}</span>
                    <div>
                      <span className="text-cream block mb-0.5">{item.text}</span>
                      <span className="text-muted text-[0.7rem]">{item.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="m-0 text-[0.8rem] text-muted italic text-center py-4">
                  Interact with sparks to see activity here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
