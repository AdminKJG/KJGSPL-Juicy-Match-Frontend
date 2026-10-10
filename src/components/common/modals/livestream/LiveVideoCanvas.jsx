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
  remoteTrack,
  audioBlocked = false,
  onUnlockAudio,
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

  // Callback ref ensuring remote video element reliably attaches track
  const setRemoteVideoCallback = useCallback(
    (el) => {
      if (remoteVideoRef) {
        remoteVideoRef.current = el;
      }
      if (el && remoteTrack) {
        try {
          remoteTrack.attach(el);
          el.play().catch(() => {});
          setVideoPlaying(true);
        } catch {}
      }
    },
    [remoteTrack, remoteVideoRef]
  );

  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, localVideoRef]);

  useEffect(() => {
    if (remoteTrack) {
      setVideoPlaying(true);
    }
    if (remoteVideoRef?.current && remoteTrack) {
      try {
        remoteTrack.attach(remoteVideoRef.current);
        remoteVideoRef.current.play().catch(() => {});
        setVideoPlaying(true);
      } catch {}
    }
  }, [remoteTrack, remoteVideoRef]);

  const hasActiveVideo = Boolean(remoteTrack || videoPlaying);

  return (
    <div className="relative flex-1 w-full h-full min-h-[300px] bg-black overflow-hidden flex items-center justify-center select-none">
      {/* Remote audio stream player (using w-px h-px opacity-0 so browser never suspends playback) */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="absolute opacity-0 pointer-events-none w-px h-px" />

      {/* Browser Autoplay Blocked - Tap to Unmute Banner */}
      {!isHost && audioBlocked && (
        <button
          type="button"
          onClick={onUnlockAudio}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-gradient-to-r from-pink to-purple-600 hover:from-pink/90 hover:to-purple-500 text-white text-xs font-bold shadow-[0_4px_20px_rgba(233,22,113,0.5)] flex items-center gap-2 animate-bounce cursor-pointer"
        >
          <span>🔊</span>
          <span>Tap to Unmute Audio</span>
        </button>
      )}

      {/* ── Video Feeds ── */}
      {isHost ? (
        /* Host Local Camera Stream */
        <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[#1b0a24] via-[#100615] to-[#08020a]">
          <video
            ref={setLocalVideoCallback}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => e.target.play().catch(() => {})}
            className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
              isVideoOff || !localStream ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Host Camera Starting / Paused */}
          {(!localStream || isVideoOff) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1f1027]/90 via-[#100615]/90 to-[#0a050d] gap-4 backdrop-blur-md">
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
              <div className="flex items-center gap-2 text-white/90 text-sm font-semibold bg-black/60 px-4 py-2 rounded-full border border-pink/30 shadow-lg">
                <Icon name="video" className="w-4 h-4 text-pink animate-pulse" />
                <span>{isVideoOff ? "Camera is Paused" : "Starting camera & broadcast studio…"}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Viewer Remote Stream */
        <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[#1b0a24] via-[#100615] to-[#08020a]">
          {/* Ambient blurred backdrop of host */}
          {(stream?.hostPhoto || stream?.photo) && (
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none"
              style={{ backgroundImage: `url(${stream.hostPhoto || stream.photo})` }}
            />
          )}

          <video
            ref={setRemoteVideoCallback}
            autoPlay
            playsInline
            muted
            onPlaying={() => setVideoPlaying(true)}
            onLoadedData={() => setVideoPlaying(true)}
            onCanPlay={() => setVideoPlaying(true)}
            onLoadedMetadata={(e) => {
              setVideoPlaying(true);
              e.target.play().catch(() => {});
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              hasActiveVideo ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Buffer / Connecting State */}
          {!hasActiveVideo && !streamEndedBanner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0512]/95 gap-3.5 z-10 select-none px-6 text-center">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white border border-pink/50 portrait ${portraitClass(
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
                <div className="absolute -inset-1 rounded-full border border-pink/30 border-t-pink animate-spin" />
              </div>
              <div className="max-w-xs">
                <h4 className="text-white font-semibold text-sm mb-1">{hostName}'s Live Stream</h4>
                <p className="text-xs text-white/60 mb-1">{connectingStatus}</p>
                <p className="text-[11px] text-white/40">
                  You can chat and send reactions live below while waiting for video feed.
                </p>
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
