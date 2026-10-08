import React, { useState } from "react";
import { callsService } from "../../services/callsService";
import { useApp } from "../../context/AppContext";

export default function CallButton({ connectionId, medium = "audio", className = "" }) {
  const [loading, setLoading] = useState(false);
  const { setActiveCall, showToast } = useApp();

  const startCall = async () => {
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
      showToast?.(`Failed to start call: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={startCall}
      disabled={loading}
      className={`px-4 py-2 rounded-xl text-white font-semibold text-xs transition-all cursor-pointer border-none flex items-center gap-1.5 shadow-md ${
        medium === "video"
          ? "bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-purple-900/40"
          : "bg-gradient-to-r from-[#e91671] to-[#be123c] hover:from-[#ff2082] hover:to-[#e11d48] shadow-pink-900/40"
      } ${className}`}
    >
      {loading ? "…" : medium === "video" ? "📹 Video Call" : "📞 Voice Call"}
    </button>
  );
}
