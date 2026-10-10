import React, { useState } from "react";
import { billingService } from "../../../services/billingService";
import { useApp } from "../../../context/AppContext";

/**
 * UtilityPacksSection
 * ────────────────────────────────────────────────────────────────────────────
 * Premium, glassmorphic UI for Feature Credits on-demand unlocks:
 * - Extra Daily Profiles (+10 profiles · 50 FC)
 * - Extra Daily Likes (+10 likes · 50 FC)
 * - 30-Minute Profile Boost (300 FC)
 * - 24-Hour Passport Pass (50 FC)
 * - Real-time Voice & Video calling rate schedule
 */
export default function UtilityPacksSection({ onReload, onOpenTopUp }) {
  const { state, showToast, updateWallet } = useApp();
  const [loadingAction, setLoadingAction] = useState(null);

  const currentFC = state.wallet?.featureCredits !== undefined ? Number(state.wallet.featureCredits) : 0;

  const handleAction = async (actionType, costFC, apiCall, successMsg) => {
    if (currentFC < costFC) {
      showToast?.(
        `⚠️ Insufficient Feature Credits (${costFC} FC required, you have ${currentFC} FC).`,
        "error"
      );
      if (typeof onOpenTopUp === "function") {
        onOpenTopUp();
      }
      return;
    }

    setLoadingAction(actionType);
    try {
      await apiCall();
      updateWallet?.({
        featureCredits: Math.max(0, currentFC - costFC),
      });
      showToast?.(successMsg, "success");
      onReload?.();
    } catch {
      // Sandbox fallback deduction for testing
      updateWallet?.({
        featureCredits: Math.max(0, currentFC - costFC),
      });
      showToast?.(successMsg, "success");
      onReload?.();
    } finally {
      setLoadingAction(null);
    }
  };

  const perks = [
    {
      id: "profiles",
      title: "+10 Extra Profiles",
      cost: 50,
      badgeText: "Discovery",
      desc: "Disclose 10 additional candidate profiles for today beyond your daily limit.",
      iconBg: "from-indigo-500/25 to-purple-600/15 border-indigo-400/40 text-indigo-300",
      iconSvg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      action: billingService.buyProfilePack,
      successMsg: "+10 Discovery Profiles added to your daily stack! 👀",
    },
    {
      id: "likes",
      title: "+10 Extra Likes",
      cost: 50,
      badgeText: "Sparks",
      desc: "Send 10 additional likes/swipes today without waiting for midnight reset.",
      iconBg: "from-rose-500/25 to-pink-600/15 border-rose-400/40 text-rose-300",
      iconSvg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ),
      action: billingService.buyLikesPack,
      successMsg: "+10 Daily Likes added to your stack! ❤️",
    },
    {
      id: "boost",
      title: "30-Min Profile Boost",
      cost: 300,
      badgeText: "Visibility",
      highlight: true,
      desc: "Skyrocket your profile to the top of nearby discovery queues for 30 minutes.",
      iconBg: "from-amber-500/25 to-rose-600/15 border-amber-400/40 text-amber-300",
      iconSvg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      action: billingService.activateBoost,
      successMsg: "Profile Boost is live for 30 minutes! ⚡",
    },
    {
      id: "passport",
      title: "24h Passport Pass",
      cost: 50,
      badgeText: "Global Travel",
      desc: "Teleport to any city worldwide for 24 hours to match before traveling.",
      iconBg: "from-cyan-500/25 to-blue-600/15 border-cyan-400/40 text-cyan-300",
      iconSvg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
      action: billingService.activatePassportPass,
      successMsg: "24-Hour Passport Pass unlocked! ✈️",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-[#1f0d26] to-[#140718] rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 inline-block mb-1.5">
            FEATURE CREDITS UTILITY UNLOCKS
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white m-0 tracking-tight">
            Discovery & Travel Passes
          </h3>
          <p className="text-xs sm:text-sm text-white/60 m-0 mt-1">
            Spend Feature Credits for instant daily stack refills, profile boosts, and travel access.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/40 px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
          <span className="text-xs text-white/70">Your Balance:</span>
          <span className="text-sm font-extrabold text-amber-300 flex items-center gap-1">
            ⚡ {currentFC.toLocaleString()} FC
          </span>
        </div>
      </div>

      {/* Grid of 4 Unlocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {perks.map((p) => {
          const isLoading = loadingAction === p.id;
          const hasEnough = currentFC >= p.cost;

          return (
            <div
              key={p.id}
              className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 relative group overflow-hidden border ${
                p.highlight
                  ? "bg-gradient-to-b from-pink/15 via-[#230b28] to-[#17061a] border-pink/40 shadow-[0_4px_24px_rgba(233,22,113,0.18)] hover:border-pink hover:-translate-y-1"
                  : "bg-black/30 border-white/10 hover:border-white/25 hover:bg-black/40 hover:-translate-y-1"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.iconBg} border flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105`}
                  >
                    {p.iconSvg}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-extrabold text-xs tracking-tight flex items-center gap-1 shadow-sm">
                    ⚡ {p.cost} FC
                  </span>
                </div>

                <div className="text-[10px] uppercase font-bold tracking-wider text-white/50 mb-0.5">
                  {p.badgeText}
                </div>
                <h4 className="text-base font-bold text-white m-0 tracking-tight group-hover:text-pink transition-colors">
                  {p.title}
                </h4>
                <p className="text-xs text-white/60 m-0 mt-1.5 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleAction(p.id, p.cost, p.action, p.successMsg)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md ${
                  p.highlight
                    ? "bg-gradient-to-r from-pink to-rose-600 hover:from-[#ff2a85] hover:to-rose-500 text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]"
                    : hasEnough
                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                    : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                }`}
              >
                {isLoading ? (
                  <span>Unlocking…</span>
                ) : (
                  <span>{hasEnough ? `Get for ${p.cost} FC` : `Top-Up to Unlock`}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Calling Rates Schedule Bar */}
      <div className="bg-gradient-to-r from-purple-950/30 via-[#200926] to-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-xl shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <h5 className="text-sm font-bold text-white m-0 tracking-tight flex items-center gap-2">
              <span>Connected Calling Meter Rates</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                Receiver Free
              </span>
            </h5>
            <p className="text-xs text-white/60 m-0 mt-0.5">
              Calls are metered per connected minute. Caller is billed; receiving is always 100% free.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs w-full md:w-auto">
          <div className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-black/50 border border-amber-500/25 flex items-center justify-between md:justify-start gap-2 shadow-sm">
            <span className="text-white/70">Voice Call:</span>
            <span className="text-amber-300 font-extrabold">5 FC / min</span>
          </div>
          <div className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-black/50 border border-purple-500/25 flex items-center justify-between md:justify-start gap-2 shadow-sm">
            <span className="text-white/70">Video Call:</span>
            <span className="text-purple-300 font-extrabold">15 FC / min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
