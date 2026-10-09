import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../../context/AppContext";

/**
 * CallCreditBar
 * ────────────────────────────────────────────────────────────────────────────
 * Live in-call credit status, burn rate indicator, and low-credit warning banner.
 *
 * Rules from SUBSCRIPTION_AND_DUAL_CREDITS_API_SPECIFICATION.md:
 * - Voice Call: 5 FC / connected minute (caller billed, receiver free)
 * - Video Call: 15 FC / connected minute (caller billed, receiver free)
 * - Minutes rounded up to whole minute
 * - When credits run low, display alert and provide quick top-up action
 */
export default function CallCreditBar({
  isCaller = true,
  isVideo = false,
  callSeconds = 0,
  onDepleted = null,
  onOpenTopup = null,
}) {
  const { state, showToast, updateWallet } = useApp();

  // Rate in FC per minute
  const ratePerMinute = isVideo ? 15 : 5;

  // Caller's starting feature credits
  const initialFC = state.wallet?.featureCredits ?? 100;

  // Billed minutes (rounded up once per call)
  const billedMinutes = Math.max(1, Math.ceil(callSeconds / 60));
  const fcBurned = isCaller ? billedMinutes * ratePerMinute : 0;
  const remainingFC = Math.max(0, initialFC - fcBurned);
  const minutesLeft = Math.max(0, Math.floor(remainingFC / ratePerMinute));

  // Low credit thresholds: 2 minutes left or <= 2x rate
  const isLowCredit = isCaller && remainingFC <= ratePerMinute * 2;
  const isCritical = isCaller && remainingFC <= ratePerMinute;
  const isDepleted = isCaller && remainingFC <= 0 && callSeconds > 10;

  const warnedRef = useRef(false);
  const criticalWarnedRef = useRef(false);

  // Trigger audio / toast warning once when low credit is reached
  useEffect(() => {
    if (isCaller && isLowCredit && !warnedRef.current && callSeconds > 15) {
      warnedRef.current = true;
      showToast?.(`⚠️ Low Credits: only ${remainingFC} FC left (~${minutesLeft}m remaining)!`, "warning");
    }
  }, [isCaller, isLowCredit, remainingFC, minutesLeft, callSeconds, showToast]);

  // Depleted balance trigger
  useEffect(() => {
    if (isDepleted && !criticalWarnedRef.current) {
      criticalWarnedRef.current = true;
      showToast?.("⚠️ Feature Credits depleted. Ending call…", "error");
      const timer = setTimeout(() => {
        onDepleted?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDepleted, onDepleted, showToast]);

  if (!isCaller) {
    // Receiver view: Free of charge
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold backdrop-blur-md shadow-md animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>🎁 Free Receiver Call · 0 FC charged</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-[420px] px-3">
      {/* ── Main Credit Pill ── */}
      <div
        className={`flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-full backdrop-blur-md text-xs font-medium border shadow-lg transition-all ${
          isCritical
            ? "bg-rose-950/80 border-rose-500/60 text-rose-200 animate-pulse shadow-rose-950/50"
            : isLowCredit
            ? "bg-amber-950/70 border-amber-500/50 text-amber-200 shadow-amber-950/40"
            : "bg-black/60 border-white/15 text-white/90"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#fbbf24] font-bold flex items-center gap-1">
            ⚡ {remainingFC} FC
          </span>
          <span className="text-white/40">·</span>
          <span className="text-white/70 text-[11px]">
            {ratePerMinute} FC/min ({isVideo ? "Video" : "Voice"})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isCritical
                ? "bg-rose-500/30 text-rose-300"
                : isLowCredit
                ? "bg-amber-500/30 text-amber-300"
                : "bg-white/10 text-white/80"
            }`}
          >
            ~{minutesLeft}m left
          </span>

          {onOpenTopup && (
            <button
              type="button"
              onClick={onOpenTopup}
              className="px-2 py-0.5 rounded-full bg-[#e91671] hover:bg-[#ff2082] text-white text-[10px] font-bold transition-all cursor-pointer border-none shadow-sm"
              title="Add more feature credits"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* ── Low Credit Alert Banner (when <= 2 mins left) ── */}
      {isLowCredit && (
        <div
          className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-[11px] w-full backdrop-blur-md transition-all ${
            isCritical
              ? "bg-rose-900/80 border-rose-500 text-rose-100"
              : "bg-amber-900/80 border-amber-500 text-amber-100"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">⚠️</span>
            <span className="font-semibold">
              {isCritical
                ? `Critical: Under 1 minute left (${remainingFC} FC)!`
                : `Low Balance: ~${minutesLeft} mins left (${remainingFC} FC).`}
            </span>
          </div>

          {onOpenTopup && (
            <button
              type="button"
              onClick={onOpenTopup}
              className="underline font-bold text-white hover:text-amber-200 cursor-pointer bg-transparent border-none p-0 text-[11px]"
            >
              Top Up Now →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
