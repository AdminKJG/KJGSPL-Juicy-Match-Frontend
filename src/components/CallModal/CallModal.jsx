import React, { useState, useEffect } from "react";
import { useCall } from "../../hooks/useCall";
import { useApp } from "../../context/AppContext";
import OutgoingRinging from "./OutgoingRinging";
import IncomingRinging from "./IncomingRinging";
import ActiveCall from "./ActiveCall";
import CallEndSummaryModal from "./CallEndSummaryModal";

export default function CallModal({ call, callData, onClose, onCallEnded, showToast }) {
  const { updateWallet, refreshWallet, state } = useApp();
  const initialCall = call || callData;
  const callState = useCall(initialCall);
  const {
    call: currentCall,
    isTerminal,
    isAccepted,
    isRinging,
    isCaller,
    isReceiver,
    isSimulated,
    room,
    error,
    callReceipt,
    callSeconds,
  } = callState;

  // Screen sizing: 'compact' (420px) | 'theater' (960px) | 'fullscreen' (100vw/100vh)
  const [sizeMode, setSizeMode] = useState("compact");

  // Deduct charged credits from wallet & sync with backend when call terminates
  useEffect(() => {
    if (isTerminal) {
      const isVideo = currentCall?.medium === "video";
      const ratePerMinute = isVideo ? 15 : 5;
      const billedMinutes = callReceipt?.billed_minutes ?? Math.max(1, Math.ceil(callSeconds / 60));
      const charged = callReceipt?.fc_charged ?? (billedMinutes * ratePerMinute);

      if (isCaller && callSeconds > 0) {
        updateWallet?.((prev) => {
          const currentFC = prev?.featureCredits ?? 0;
          return {
            ...prev,
            featureCredits: Math.max(0, currentFC - charged),
          };
        });
      }

      // Fetch fresh live balance directly from backend
      refreshWallet?.();

      onCallEnded?.(currentCall?.state || "ended");
      // If it was connected, let user see CallEndSummaryModal instead of auto-closing instantly
      if (callSeconds === 0 && !callReceipt) {
        const timer = setTimeout(() => {
          onClose?.();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [isTerminal, isCaller, callSeconds, callReceipt, currentCall?.medium]);

  if (!currentCall) return null;

  const isMinimized = sizeMode === "minimized";
  const isFullscreen = sizeMode === "fullscreen";
  const isTheater = sizeMode === "theater";

  return (
    <div
      className={
        isMinimized
          ? "fixed inset-0 z-[9999] pointer-events-none flex items-end justify-end p-4 sm:p-6"
          : `fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center ${isFullscreen ? "p-0" : "p-3 sm:p-5"}`
      }
    >
      <div
        className={`bg-gradient-to-b from-[#1c1024] to-[#0d0812] overflow-hidden relative border flex flex-col transition-all duration-300 pointer-events-auto ${
          isMinimized
            ? "w-[330px] sm:w-[360px] h-[210px] sm:h-[230px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] border-[#e91671]/50 ring-1 ring-white/15"
            : isFullscreen
            ? "w-screen h-screen rounded-none max-w-none max-h-none border-0"
            : isTheater
            ? "w-full max-w-[980px] h-[88vh] max-h-[800px] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] border-white/10"
            : "w-full max-w-[440px] h-[85vh] max-h-[640px] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] border-white/10"
        }`}
      >
        {/* ── Top-Left Juicy Match Branding Badge ── */}
        <div className="absolute top-3 left-3 z-40 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-lg select-none">
          <img
            src="/assets/logo.jpg"
            alt="Juicy Match"
            className="w-4 h-4 rounded-full object-cover border border-[#e91671]/60 shadow-[0_0_8px_rgba(233,22,113,0.5)]"
          />
          <span className="text-white font-bold text-xs tracking-tight">Juicy Match</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Call in progress" />
        </div>

        {/* ── Top-Right Window Controls (Minimize / Theater / Fullscreen) ── */}
        <div className="absolute top-3 right-3 z-40 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-lg">
          {/* Minimize / Floating PiP Button */}
          <button
            type="button"
            onClick={() => setSizeMode((prev) => (prev === "minimized" ? "compact" : "minimized"))}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMinimized
                ? "bg-[#e91671] text-white shadow-lg shadow-[#e91671]/40"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title={isMinimized ? "Restore Full Call Window" : "Minimize Call (Browse Other Modules)"}
            aria-label="Toggle Minimize Call"
          >
            {isMinimized ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            )}
          </button>

          {!isMinimized && (
            <>
              {/* Theater / Expand Button */}
              <button
                type="button"
                onClick={() => setSizeMode((prev) => (prev === "theater" ? "compact" : "theater"))}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isTheater
                    ? "bg-white/20 text-white shadow-inner"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                title={isTheater ? "Compact Window (420px)" : "Expand Window (Theater Mode)"}
                aria-label="Toggle Theater View"
              >
                {isTheater ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                onClick={() => setSizeMode((prev) => (prev === "fullscreen" ? "compact" : "fullscreen"))}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isFullscreen
                    ? "bg-[#e91671] text-white shadow-lg shadow-[#e91671]/40"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen Mode"}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/>
                    <polyline points="20 10 14 10 14 4"/>
                    <line x1="14" y1="10" x2="21" y2="3"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  </svg>
                )}
              </button>
            </>
          )}
        </div>

        {/* 1. Active connected call (LiveKit room OR demo simulated) */}
        {isAccepted && (room || isSimulated) && (
          <ActiveCall callState={callState} sizeMode={sizeMode} onClose={onClose} />
        )}

        {/* 2. Ringing state for caller (waiting for answer) */}
        {isRinging && isCaller && !isAccepted && (
          <OutgoingRinging callState={callState} sizeMode={sizeMode} onCancel={onClose} />
        )}

        {/* 3. Ringing state for receiver (accept / decline) */}
        {isRinging && isReceiver && !isAccepted && (
          <IncomingRinging callState={callState} sizeMode={sizeMode} onClose={onClose} />
        )}

        {/* 4. Terminal state banner or Billing Receipt */}
        {isTerminal && (
          (callSeconds > 0 || callReceipt) ? (
            <CallEndSummaryModal
              callReceipt={callReceipt}
              isCaller={isCaller}
              medium={currentCall?.medium}
              peerName={currentCall?.peer?.pseudonym || currentCall?.peer?.name}
              durationSeconds={callSeconds}
              onClose={onClose}
            />
          ) : (
            <div className="p-10 text-center flex flex-col items-center justify-center flex-1 min-h-[320px]">
              <div className="w-16 h-16 rounded-full bg-[#ff5656]/20 text-[#ff5656] flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
              </div>
              <h3 className="text-white text-xl font-bold m-0">
                {currentCall?.state === "declined" ? "Call Declined" : "Call Ended"}
              </h3>
              <p className="text-[#ccb9ca] text-xs mt-2">Closing window…</p>
            </div>
          )
        )}

        {/* 5. Error banner */}
        {error && (
          <div className="absolute top-12 left-4 right-4 bg-rose-600/90 text-white text-xs px-4 py-2.5 rounded-xl text-center shadow-lg backdrop-blur-sm z-50">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
