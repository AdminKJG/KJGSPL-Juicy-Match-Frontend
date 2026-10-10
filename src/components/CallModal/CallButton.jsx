import React, { useState } from "react";
import { callsService } from "../../services/callsService";
import { useApp } from "../../context/AppContext";
import InsufficientCreditsModal from "./InsufficientCreditsModal";

export default function CallButton({ connectionId, medium = "audio", className = "" }) {
  const [loading, setLoading] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const { state, setActiveCall, showToast } = useApp();

  const isVideo = medium === "video";
  const requiredCredits = isVideo ? 15 : 5;
  const currentCredits = state.wallet?.featureCredits !== undefined ? Number(state.wallet.featureCredits) : 0;

  const startCall = async () => {
    // 1. Pre-authorization check
    if (currentCredits < requiredCredits) {
      setShowInsufficientModal(true);
      return;
    }

    setLoading(true);
    try {
      const call = await callsService.initiateCall(connectionId, medium);
      setActiveCall({
        ...call,
        id: call?.id || call?.data?.id,
        connectionId,
        medium,
        isIncoming: false,
        initialStatus: "ringing",
      });
    } catch (e) {
      if (e.status === 402 || e.data?.code === 402 || e.message?.toLowerCase().includes("credit")) {
        setShowInsufficientModal(true);
      } else {
        showToast?.(`Failed to start call: ${e.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={startCall}
        disabled={loading}
        title={`${isVideo ? "Video" : "Voice"} Call · ${requiredCredits} FC/min`}
        className={`px-4 py-2 rounded-xl text-white font-semibold text-xs transition-all cursor-pointer border-none flex items-center gap-1.5 shadow-md ${
          isVideo
            ? "bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-purple-900/40"
            : "bg-gradient-to-r from-[#e91671] to-[#be123c] hover:from-[#ff2082] hover:to-[#e11d48] shadow-pink-900/40"
        } ${className}`}
      >
        <span>{loading ? "…" : isVideo ? "📹 Video Call" : "📞 Voice Call"}</span>
        <span className="text-[10px] opacity-75 font-normal">({requiredCredits} FC/m)</span>
      </button>

      {showInsufficientModal && (
        <InsufficientCreditsModal
          medium={medium}
          requiredCredits={requiredCredits}
          currentCredits={currentCredits}
          onClose={() => setShowInsufficientModal(false)}
          onSuccess={() => {
            setShowInsufficientModal(false);
            startCall();
          }}
        />
      )}
    </>
  );
}
