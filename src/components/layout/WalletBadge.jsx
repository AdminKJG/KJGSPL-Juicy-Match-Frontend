import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { normalizePlanKey, getPlanDisplayName } from "../../utils/planUtils";

/**
 * WalletBadge
 * ────────────────────────────────────────────────────────────────────────────
 * Dual-Credit balance pill (Feature Credits + AI Credits) for topbar & headers.
 * Conforms to Juicy Match Dual-Credit Engine (Section 1.1).
 */
export default function WalletBadge({ className = "" }) {
  const { state, navigate } = useApp();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fc = state.wallet?.featureCredits ?? 100;
  const ai = state.wallet?.aiCredits ?? 20;
  const rawPlan = state.subscription?.planKey || state.subscription?.plan || state.subscription?.name || state.entitlement?.plan || "explore";
  const planKey = normalizePlanKey(rawPlan);
  const planName = getPlanDisplayName(planKey);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* ── Pill Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 h-10 px-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all cursor-pointer shadow-sm select-none"
        title="Dual-Credit Wallet Balance"
      >
        {/* Feature Credits */}
        <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
          <span className="text-amber-400">⚡</span>
          <span>{fc} FC</span>
        </span>

        <span className="text-white/20">|</span>

        {/* AI Credits */}
        <span className="flex items-center gap-1 text-xs font-bold text-purple-300">
          <span className="text-purple-400">✦</span>
          <span>{ai} AI</span>
        </span>
      </button>

      {/* ── Dropdown Popover ── */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 bg-gradient-to-b from-[#211129] to-[#120816] border border-white/15 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-white flex flex-col gap-3.5 backdrop-blur-xl animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-pink">
                Active Plan
              </span>
              <h4 className="text-sm font-bold text-white m-0">
                {planName}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("jm_membership_tab", "plans");
                window.dispatchEvent(new CustomEvent("jm_switch_membership_tab", { detail: "plans" }));
                setOpen(false);
                navigate("membership");
              }}
              className="text-[11px] font-semibold text-pink hover:underline bg-transparent border-none cursor-pointer"
            >
              Upgrade →
            </button>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-2">
            {/* Feature Credits Card */}
            <div
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl p-2.5 flex flex-col cursor-pointer transition-all"
              onClick={() => {
                localStorage.setItem("jm_membership_tab", "topups");
                window.dispatchEvent(new CustomEvent("jm_switch_membership_tab", { detail: "topups" }));
                setOpen(false);
                navigate("membership");
              }}
              title="Click to Top Up Feature Credits"
            >
              <span className="text-[10px] text-amber-300/80 uppercase font-semibold">
                Feature Credits
              </span>
              <span className="text-lg font-extrabold text-amber-300 mt-0.5">
                ⚡ {fc}
              </span>
              <span className="text-[10px] text-white/50 mt-1 leading-tight">
                Calls (5-15 FC/min), Boosts & Packs
              </span>
            </div>

            {/* AI Credits Card */}
            <div
              className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl p-2.5 flex flex-col cursor-pointer transition-all"
              onClick={() => {
                localStorage.setItem("jm_membership_tab", "topups");
                window.dispatchEvent(new CustomEvent("jm_switch_membership_tab", { detail: "topups" }));
                setOpen(false);
                navigate("membership");
              }}
              title="Click to Top Up AI Credits"
            >
              <span className="text-[10px] text-purple-300/80 uppercase font-semibold">
                AI Credits
              </span>
              <span className="text-lg font-extrabold text-purple-300 mt-0.5">
                ✦ {ai}
              </span>
              <span className="text-[10px] text-white/50 mt-1 leading-tight">
                AI Wingman, Bio Polish & Insights
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("jm_membership_tab", "topups");
              window.dispatchEvent(new CustomEvent("jm_switch_membership_tab", { detail: "topups" }));
              setOpen(false);
              navigate("membership");
            }}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#e91671] to-[#be123c] hover:from-[#ff2082] hover:to-[#e11d48] text-white text-xs font-bold transition-all shadow-md cursor-pointer border-none flex items-center justify-center gap-1.5"
          >
            <span>Top Up Credits & View Plans</span>
          </button>
        </div>
      )}
    </div>
  );
}
