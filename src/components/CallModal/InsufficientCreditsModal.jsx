import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { billingService } from "../../services/billingService";

/**
 * InsufficientCreditsModal
 * ────────────────────────────────────────────────────────────────────────────
 * Displayed when user tries to make a voice/video call without meeting the
 * pre-authorization requirement (>= 5 FC for voice, >= 15 FC for video).
 */
export default function InsufficientCreditsModal({
  medium = "audio",
  requiredCredits = 5,
  currentCredits = 0,
  onClose,
  onSuccess,
}) {
  const { state, showToast, updateWallet, navigate } = useApp();
  const [loading, setLoading] = useState(false);

  const shortfall = Math.max(0, requiredCredits - currentCredits);
  const isVideo = medium === "video";

  const handleSimulatedTopup = async (amount = 500) => {
    setLoading(true);
    try {
      // 1. Try real backend purchase quote first
      try {
        const quoteRes = await billingService.createQuote("jm.topup.fc.500");
        const qId = quoteRes?.quoteId || quoteRes?.id;
        if (qId) {
          await billingService.purchaseQuote(qId, "approved");
        }
      } catch (backendErr) {
        console.warn("[Topup Backend API note]:", backendErr.message);
      }

      // 2. Update local wallet in state
      updateWallet?.({
        featureCredits: (state.wallet?.featureCredits || currentCredits) + amount,
      });

      showToast(`+${amount} Feature Credits added! You're ready to call. ⚡`);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      showToast(err.message || "Top-up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToMembership = () => {
    onClose?.();
    navigate?.("membership");
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-[#24112c] via-[#170a1e] to-[#0d0513] border border-pink/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_70px_rgba(233,22,113,0.3)] relative text-white flex flex-col gap-5 animate-scale-up">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all border-none"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#e91671] flex items-center justify-center text-2xl shadow-lg shadow-pink/30">
            ⚡
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#fbbf24]">
              Feature Credits Required
            </span>
            <h3 className="text-xl font-bold text-white m-0 tracking-tight">
              Insufficient Credits for {isVideo ? "Video" : "Voice"} Call
            </h3>
          </div>
        </div>

        {/* Shortfall Breakdown Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Required for {isVideo ? "Video" : "Voice"} Call:</span>
            <span className="font-bold text-white">{requiredCredits} FC</span>
          </div>
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Your Current Balance:</span>
            <span className="font-bold text-amber-400">{currentCredits} FC</span>
          </div>
          <div className="h-px bg-white/10 my-1" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-rose-300">Credits Needed:</span>
            <span className="font-extrabold text-rose-400 text-base">+{shortfall} FC</span>
          </div>
        </div>

        <p className="text-xs text-white/70 leading-relaxed m-0">
          Juicy Match charges <strong className="text-white">{isVideo ? "15 FC/min" : "5 FC/min"}</strong> for connected {isVideo ? "video" : "voice"} calls (receiver is always free).
          Grab a top-up pack or upgrade your subscription for monthly credit grants.
        </p>

        {/* Action Options */}
        <div className="flex flex-col gap-2.5">
          {/* Quick 500 FC Top Up */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSimulatedTopup(500)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#e91671] to-[#be123c] hover:from-[#ff2082] hover:to-[#e11d48] text-white font-bold text-sm shadow-[0_4px_16px_rgba(233,22,113,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-none flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <span>⚡</span>
              <span>Quick Top-Up (+500 FC)</span>
            </span>
            <span className="text-xs bg-black/30 px-2.5 py-1 rounded-full font-extrabold">
              $4.99
            </span>
          </button>

          {/* Membership Plans */}
          <button
            type="button"
            onClick={handleGoToMembership}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all cursor-pointer border border-white/15 flex items-center justify-center gap-2"
          >
            <span>👑 Upgrade Subscription (Connect / Premium)</span>
          </button>

          {/* Fast Free Demo Grant */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSimulatedTopup(100)}
            className="text-[11px] text-white/50 hover:text-white/90 underline text-center cursor-pointer bg-transparent border-none mt-1"
          >
            Developer Sandbox: Grant 100 Free Test Credits
          </button>
        </div>
      </div>
    </div>
  );
}
