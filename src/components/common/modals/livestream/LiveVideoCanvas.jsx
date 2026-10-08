import React, { useCallback, useEffect, useState } from "react";
import Icon from "../../ui/Icon";
import FloatingHeartsLayer from "./FloatingHeartsLayer";
import { portraitClass } from "../../../../utils/formatters";

/**
 * LiveVideoCanvas
 * Central video canvas rendering WebRTC camera stream, audio elements, camera-off visual avatar, and floating hearts.
 */
export default function LiveVideoCanvas({
  isHost,
  isVideoOff,
  isConnected,
  connectingStatus,
  streamEndedBanner,
  stream,
  floatingHearts = [],
  localStream,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  onReturnToExplore,
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const hostName = stream?.hostName || stream?.pseudonym || stream?.creator || "Host";
  const portraitIdx = stream?.hostPortrait ?? stream?.portrait ?? 0;

  // Callback ref ensuring local video element reliably binds srcObject
  const setLocalVideoCallback = useCallback(
    (el) => {
      if (localVideoRef) {
        localVideoRef.current = el;
      }
      if (el && localStream) {
        if (el.srcObject !== localStream) {
          el.srcObject = localStream;
        }
        el.play().catch(() => {});
      }
    },
    [localStream, localVideoRef]
  );

  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, localVideoRef]);

  return (
    <div className="relative flex-1 w-full h-full min-h-[300px] bg-black overflow-hidden flex items-center justify-center select-none">
      {/* Hidden audio element for remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* ── Video Feeds ── */}
      {isHost ? (
        /* Host Local Camera Stream */
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
          <video
            ref={setLocalVideoCallback}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => e.target.play().catch(() => {})}
            className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
              isVideoOff ? "opacity-0" : "opacity-100"
            }`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1f1027] to-[#0a050d] gap-4">
              <div className="relative">
                <div
                  className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-4 border-pink/60 portrait ${portraitClass(
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
                    <span>{hostName[0]?.toUpperCase() || "H"}</span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-pink/40 animate-ping opacity-30" />
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                <Icon name="video" className="w-4 h-4 text-pink" />
                <span>Camera is Paused</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Viewer Remote Stream */
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            onPlaying={() => setVideoPlaying(true)}
            onLoadedMetadata={(e) => e.target.play().catch(() => {})}
            className="w-full h-full object-cover"
          />

          {/* Buffer / Connecting State */}
          {!isConnected && !videoPlaying && !streamEndedBanner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1c0f24] to-[#0b050f] gap-4 z-10">
              <div className="relative">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl border-2 border-pink/50 portrait ${portraitClass(
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
                    <span>{hostName[0]?.toUpperCase() || "H"}</span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-pink/20 border-t-pink animate-spin" />
              </div>
              <div className="text-center">
                <h4 className="text-white font-bold text-base mb-1">{hostName}'s Live Stream</h4>
                <p className="text-xs text-white/70 animate-pulse">{connectingStatus}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Animated Reaction Hearts Layer */}
      <FloatingHeartsLayer hearts={floatingHearts} />

      {/* ── Broadcast Ended Overlay ── */}
      {streamEndedBanner && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full bg-gradient-to-b from-[#2a1338] to-[#14081c] border border-pink/30 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-pink/20 border border-pink/40 flex items-center justify-center text-3xl mb-1 shadow-[0_0_24px_rgba(233,22,113,0.3)]">
              🎬
            </div>
            <h3 className="text-xl font-bold text-white">Broadcast Ended</h3>
            <p className="text-sm text-cream/75 leading-relaxed">
              {isHost
                ? "Your live broadcast session has ended. Thank you for connecting with your fans & matches!"
                : `${hostName} has concluded this live streaming session.`}
            </p>
            <button
              type="button"
              onClick={onReturnToExplore}
              className="mt-3 px-6 py-3 rounded-full bg-gradient-to-r from-pink to-purple-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(233,22,113,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Return to Explore
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
