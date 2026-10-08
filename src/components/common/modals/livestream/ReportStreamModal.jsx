import React from "react";
import Icon from "../../ui/Icon";

/**
 * ReportStreamModal
 * Dialog for viewers to report an active livestream for Trust & Safety review.
 */
export default function ReportStreamModal({ onReport, onClose }) {
  const REPORT_REASONS = [
    { label: "Harassment or Bullying", reason: "harassment" },
    { label: "Impersonation", reason: "impersonation" },
    { label: "Inappropriate or Unwanted Media", reason: "unwanted-media" },
    { label: "Other Community Guideline Violation", reason: "other" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gradient-to-b from-[#24122d] to-[#110716] border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-cream"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-base font-bold text-white">Report Broadcast</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-cream/70">
          Please select why you are reporting this live stream. Reports are reviewed immediately by Trust & Safety:
        </p>

        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((opt) => (
            <button
              key={opt.reason}
              type="button"
              onClick={() => onReport?.(opt.reason)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 font-medium text-xs text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <span>{opt.label}</span>
              <Icon name="arrow-right" className="w-3.5 h-3.5 text-white/40" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
