import React from "react";
import { useApp } from "../../context/AppContext";

/**
 * CallEndSummaryModal
 * ────────────────────────────────────────────────────────────────────────────
 * Post-call billing receipt summary displayed when a call terminates.
 * Follows SUBSCRIPTION_AND_DUAL_CREDITS_API_SPECIFICATION.md Section 4.4.
 */
export default function CallEndSummaryModal({
  callReceipt = null,
  isCaller = true,
  medium = "audio",
  peerName = "Match",
  durationSeconds = 0,
  onClose,
}) {
  const { state } = useApp();

  const isVideo = medium === "video";
  const ratePerMinute = isVideo ? 15 : 5;

  const connectedSecs = callReceipt?.connected_seconds ?? durationSeconds;
  const billedMinutes = callReceipt?.billed_minutes ?? Math.max(1, Math.ceil(connectedSecs / 60));
  const fcCharged = isCaller ? (callReceipt?.fc_charged ?? (billedMinutes * ratePerMinute)) : 0;
  const currentFC = state.wallet?.featureCredits ?? 100;

  const formatSecs = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;

  return (
    <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center flex-1 min-h-[380px] bg-gradient-to-b from-[#1c1024] to-[#0d0812] text-white">
      {/* Icon */}
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#e91671]/20 to-purple-600/20 border border-pink/30 flex items-center justify-center text-3xl mb-4 shadow-xl">
        {isCaller ? "🧾" : "🎉"}
      </div>

      <h3 className="text-white text-2xl font-bold tracking-tight m-0">
        Call Ended
      </h3>
      <p className="text-white/60 text-xs mt-1 mb-6">
        {peerName ? `Conversation with ${peerName}` : "Session Complete"}
      </p>

      {/* Receipt Card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-4.5 flex flex-col gap-3 text-xs mb-6 shadow-xl backdrop-blur-sm">
        <div className="flex justify-between items-center text-white/70">
          <span>Call Duration:</span>
          <span className="font-semibold text-white">{formatSecs(connectedSecs)}</span>
        </div>

        <div className="flex justify-between items-center text-white/70">
          <span>Billed Minutes (rounded):</span>
          <span className="font-semibold text-white">{billedMinutes} min</span>
        </div>

        <div className="flex justify-between items-center text-white/70">
          <span>Rate:</span>
          <span className="font-semibold text-white">{ratePerMinute} FC / min</span>
        </div>

        <div className="h-px bg-white/10 my-1" />

        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-white">Total Charged:</span>
          {isCaller ? (
            <span className="font-extrabold text-[#fbbf24] text-base">
              {fcCharged} Feature Credits
            </span>
          ) : (
            <span className="font-extrabold text-emerald-400 text-base">
              0 FC (Free for Receiver)
            </span>
          )}
        </div>

        {isCaller && (
          <div className="flex justify-between items-center text-[11px] text-white/50 pt-1">
            <span>Remaining Balance:</span>
            <span className="font-bold text-white/90">{currentFC} FC</span>
          </div>
        )}
      </div>

      {/* Done Button */}
      <button
        type="button"
        onClick={onClose}
        className="px-8 py-3 rounded-full bg-gradient-to-r from-[#e91671] to-[#be123c] hover:from-[#ff2082] hover:to-[#e11d48] text-white font-bold text-xs shadow-[0_4px_16px_rgba(233,22,113,0.4)] cursor-pointer border-none transition-all hover:scale-105 active:scale-95"
      >
        Done & Close
      </button>
    </div>
  );
}
