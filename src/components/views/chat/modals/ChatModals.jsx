import React, { useState } from "react";
import { chatService } from "../../../../services/chatService";

export function DeleteModalContent({
  msg,
  canDeleteForEveryone,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}) {
  return (
    <div className="wa-delete-modal-content">
      <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: "8px" }}>
        Choose how you would like to delete this message:
      </p>

      <button
        type="button"
        className="wa-delete-option-btn danger"
        onClick={onDeleteForMe}
      >
        <span>🗑️ Delete for me</span>
        <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Removes from your view</span>
      </button>

      <button
        type="button"
        className={`wa-delete-option-btn ${canDeleteForEveryone ? "danger" : "disabled"}`}
        disabled={!canDeleteForEveryone}
        onClick={onDeleteForEveryone}
      >
        <span>🚫 Delete for everyone</span>
        <span style={{ fontSize: "0.76rem", color: canDeleteForEveryone ? "#f87171" : "var(--muted)" }}>
          {canDeleteForEveryone ? "Available (≤ 15 mins)" : "Expired (> 15 mins)"}
        </span>
      </button>

      <div className="buttonbar" style={{ marginTop: "12px", justifyContent: "flex-end" }}>
        <button type="button" className="button quiet small" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function BlockModalContent({ peerName, onConfirm, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ color: "#d1c1d4", fontSize: "0.92rem", lineHeight: 1.5 }}>
        Are you sure you want to block <strong>{peerName || "this member"}</strong>?
        They will no longer be able to send you messages or initiate calls.
      </p>
      <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-all border border-red-500/20 min-w-[120px]"
          onClick={onConfirm}
        >
          Block
        </button>
      </div>
    </div>
  );
}

export function ReportModalContent({ peerName, onSubmit, onClose }) {
  const [reportReason, setReportReason] = useState("Inappropriate behavior");
  const [reportContext, setReportContext] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ color: "#d1c1d4", fontSize: "0.9rem" }}>
        Help us keep Juicy Match safe. Select the reason you want to report <strong>{peerName || "this member"}</strong>:
      </p>

      <div>
        <label style={{ fontSize: "0.82rem", color: "#fda4af", fontWeight: 700, display: "block", marginBottom: "6px" }}>
          Reason for reporting
        </label>
        <select
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            background: "#1c0e28",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ffffff",
            fontSize: "0.9rem",
          }}
        >
          <option value="Inappropriate behavior">Inappropriate behavior</option>
          <option value="Harassment or bullying">Harassment or bullying</option>
          <option value="Spam, scams or commercial activity">Spam, scams or commercial activity</option>
          <option value="Fake profile or impersonation">Fake profile or impersonation</option>
          <option value="Safety or underage concern">Safety or underage concern</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: "0.82rem", color: "#fda4af", fontWeight: 700, display: "block", marginBottom: "6px" }}>
          Additional details (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Describe what happened so our moderation team can take prompt action…"
          value={reportContext}
          onChange={(e) => setReportContext(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            background: "#1c0e28",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ffffff",
            fontSize: "0.9rem",
            resize: "none",
          }}
        />
      </div>

      <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-all border border-red-500/20 min-w-[120px]"
          onClick={() => onSubmit(`${reportReason}${reportContext ? `: ${reportContext}` : ""}`)}
        >
          Submit Report
        </button>
      </div>
    </div>
  );
}

export function RequestPhotoModalContent({ peerName, onConfirm, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ color: "#d1c1d4", fontSize: "0.92rem", lineHeight: 1.5 }}>
        Send a private photo request to <strong>{peerName || "this member"}</strong>?
        They will receive a notification to grant or decline access.
      </p>
      <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
          onClick={onConfirm}
        >
          Send Request
        </button>
      </div>
    </div>
  );
}

export function ClearConversationModalContent({ peerName, onConfirm, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ color: "#d1c1d4", fontSize: "0.92rem", lineHeight: 1.5 }}>
        Are you sure you want to clear all messages with <strong>{peerName || "this member"}</strong>?
        This action will erase the message history in this chat.
      </p>
      <div className="buttonbar" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-all border border-red-500/20 min-w-[120px]"
          onClick={onConfirm}
        >
          Clear Messages
        </button>
      </div>
    </div>
  );
}

export function AIStartersModalContent({ starters, onSelectStarter }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p className="small">Tap any starter to insert into your chat message composer:</p>
      {starters.map((starter, idx) => (
        <button
          key={idx}
          type="button"
          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
          style={{ textAlign: "left", padding: "12px 14px", lineHeight: 1.5, fontSize: "0.88rem" }}
          onClick={() => onSelectStarter(starter)}
        >
          “{starter}”
        </button>
      ))}
    </div>
  );
}
