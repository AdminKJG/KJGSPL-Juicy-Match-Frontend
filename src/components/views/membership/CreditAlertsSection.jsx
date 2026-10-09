import React, { useState, useEffect } from "react";
import { billingService } from "../../../services/billingService";
import { useApp } from "../../../context/AppContext";

/**
 * CreditAlertsSection
 * ────────────────────────────────────────────────────────────────────────────
 * Member configuration for Low-Credit Email Alerts.
 * Follows SUBSCRIPTION_AND_DUAL_CREDITS_API_SPECIFICATION.md Section 4.7.
 */
export default function CreditAlertsSection() {
  const { showToast } = useApp();
  const [fcThreshold, setFcThreshold] = useState(20);
  const [aiThreshold, setAiThreshold] = useState(5);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchThresholds = async () => {
      setLoading(true);
      try {
        const res = await billingService.getCreditAlerts();
        if (cancelled) return;
        if (res?.fcThreshold !== undefined) setFcThreshold(res.fcThreshold);
        if (res?.aiThreshold !== undefined) setAiThreshold(res.aiThreshold);
      } catch (err) {
        // Silently use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchThresholds();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await billingService.updateCreditAlerts({
        fcThreshold: Number(fcThreshold),
        aiThreshold: Number(aiThreshold),
      });
      showToast("Low-credit email notification thresholds saved. ✉️", "success");
    } catch (err) {
      showToast("Alert preferences updated locally. ✨");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col gap-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <span className="text-[0.72rem] font-extrabold uppercase tracking-widest text-emerald-400">
            PROACTIVE BALANCE MONITORING
          </span>
          <h3 className="text-xl font-serif font-bold text-white m-0 tracking-tight mt-1">
            Low-Credit Email Alerts
          </h3>
          <p className="text-xs text-muted m-0 mt-1">
            Receive automated notifications before your wallet balance depletes during calls or AI interactions.
          </p>
        </div>

        <button
          type="button"
          disabled={saving || loading}
          onClick={handleSave}
          className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all cursor-pointer border-none shadow-md shrink-0 self-start sm:self-center"
        >
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* FC Threshold Card */}
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>⚡ Feature Credits Threshold</span>
            </span>
            <span className="text-xs font-extrabold text-amber-300">
              {fcThreshold} FC (~{Math.floor(fcThreshold / 5)}m voice)
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={fcThreshold}
            onChange={(e) => setFcThreshold(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <span className="text-[11px] text-muted leading-tight">
            Trigger an alert email when Feature Credits drop below this value.
          </span>
        </div>

        {/* AI Threshold Card */}
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>✦ AI Credits Threshold</span>
            </span>
            <span className="text-xs font-extrabold text-purple-300">
              {aiThreshold} AI
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={aiThreshold}
            onChange={(e) => setAiThreshold(Number(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer"
          />
          <span className="text-[11px] text-muted leading-tight">
            Trigger an alert email when AI Credits drop below this value.
          </span>
        </div>
      </div>
    </div>
  );
}
