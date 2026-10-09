import React, { useState } from "react";

export default function MutualConsentBanner({ peerName, onAccept }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-3 my-2 p-3.5 rounded-xl bg-gradient-to-r from-[#e91671]/20 via-[#8a2be2]/15 to-[#e91671]/15 border border-[#e91671]/35 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(233,22,113,0.15)] animate-fadeIn">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#e91671]/25 border border-[#e91671]/50 flex items-center justify-center text-sm flex-shrink-0">
          ✨
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            Mutual Communication Consent
          </p>
          <p className="text-[11px] text-white/65 truncate">
            Connect with {peerName || "your match"} to exchange messages and make voice & video calls.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleConfirm}
        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#e91671] to-[#ff2a85] hover:opacity-95 text-white text-xs font-semibold whitespace-nowrap shadow-[0_4px_12px_rgba(233,22,113,0.35)] active:scale-95 transition-all flex-shrink-0 disabled:opacity-50"
      >
        {loading ? "Connecting…" : "Accept & Connect"}
      </button>
    </div>
  );
}
