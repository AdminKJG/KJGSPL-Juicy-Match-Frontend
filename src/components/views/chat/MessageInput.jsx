import React, { useRef, useEffect, useState } from "react";

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😘","😎","🤔","🙄","😭","😡",
  "👍","👎","❤️","🔥","✨","🎉","😊","🥺","💪","🙏",
  "😴","🤯","💀","🤮","😤","🥳","😇","🤩","😬","🫠",
  "👀","💯","🎯","⚡","🌹","💋","💎","🍓","🍒","🔑",
];

export default function MessageInput({
  inputBody,
  setInputBody,
  onSend,
  sending,
  showAttachMenu,
  setShowAttachMenu,
  showEmojiDrawer,
  setShowEmojiDrawer,
  replyTo,
  setReplyTo,
  editingMsgId,
  setEditingMsgId,
  handleFileChange,
  fileInputRef,
  pendingAttachment,
  setPendingAttachment,
  handleCancelReplyEdit,
  handleEmojiSelect,
  prompts,
  onPromptClick,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}) {
  const inputRef = useRef(null);
  const [emojiSearch, setEmojiSearch] = useState("");

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }
  }, [inputBody]);

  // Focus input when replyTo or editingMsgId changes
  useEffect(() => {
    if ((replyTo || editingMsgId) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo, editingMsgId]);

  const canSend = inputBody.trim() || pendingAttachment;
  const filteredEmojis = emojiSearch
    ? EMOJI_LIST.filter((e) => e.includes(emojiSearch))
    : EMOJI_LIST;

  return (
    <div style={{ background: "rgba(17,9,26,0.96)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "10px 16px 12px", position: "relative", zIndex: 10, flexShrink: 0, backdropFilter: "blur(12px)" }}>

      {/* Prompts / AI Sparks */}
      {prompts && prompts.length > 0 && !inputBody && !replyTo && !pendingAttachment && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", scrollbarWidth: "none" }}>
          {prompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPromptClick(p)}
              style={{ flexShrink: 0, padding: "5px 14px", background: "rgba(233,22,113,0.08)", border: "1px solid rgba(233,22,113,0.25)", borderRadius: "20px", color: "#e91671", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
              onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(233,22,113,0.18)"; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.background = "rgba(233,22,113,0.08)"; }}
            >
              ✨ {p.label || p}
            </button>
          ))}
        </div>
      )}

      {/* Reply / Edit / Attachment context bar */}
      {(replyTo || editingMsgId || pendingAttachment) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", borderLeft: "4px solid #e91671", borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden", flex: 1 }}>
            {replyTo && (
              <>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e91671" }}>
                  {replyTo.sender === "me" || replyTo.isMine || replyTo.mine ? "You" : "Match"}
                </span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {replyTo.body || "Attachment"}
                </span>
              </>
            )}
            {editingMsgId && (
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>✏️ Editing message…</span>
            )}
            {pendingAttachment && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e91671" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pendingAttachment.file?.name || "Image ready to send"}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancelReplyEdit}
            style={{ width: "26px", height: "26px", borderRadius: "50%", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: "12px", fontSize: "16px", transition: "all 0.15s" }}
            onMouseEnter={(ev) => { ev.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending image preview */}
      {pendingAttachment?.previewUrl && (
        <div style={{ position: "relative", marginBottom: "8px", display: "inline-block" }}>
          <img
            src={pendingAttachment.previewUrl}
            alt="Preview"
            style={{ maxHeight: "120px", maxWidth: "200px", borderRadius: "10px", objectFit: "cover", display: "block", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            type="button"
            onClick={() => { setPendingAttachment(null); handleCancelReplyEdit(); }}
            style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main input row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>

        {/* Attach button */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiDrawer(false); }}
            style={{
              width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
              background: showAttachMenu ? "rgba(233,22,113,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${showAttachMenu ? "rgba(233,22,113,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: showAttachMenu ? "#e91671" : "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
            }}
            title="Attach"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showAttachMenu ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {showAttachMenu && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#1e1028", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "8px 0", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: "160px", zIndex: 30 }}>
              <button
                type="button"
                onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", background: "none", border: "none", color: "#e8dcea", fontSize: "13px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={(ev) => ev.currentTarget.style.background = "none"}
              >
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(233,22,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e91671" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                Photo / Gallery
              </button>
            </div>
          )}
        </div>

        {/* Text area container */}
        <div style={{ flex: 1, background: "#1c0e28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "22px", display: "flex", alignItems: "flex-end", overflow: "hidden", transition: "border-color 0.2s, box-shadow 0.2s", position: "relative" }}
          onFocus={() => {}}
        >
          {/* Emoji button inside input */}
          <button
            type="button"
            onClick={() => { setShowEmojiDrawer(!showEmojiDrawer); setShowAttachMenu(false); }}
            style={{ padding: "10px 10px 10px 14px", background: "none", border: "none", color: showEmojiDrawer ? "#e91671" : "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.15s" }}
            title="Emoji"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={inputBody}
            onChange={(e) => setInputBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend(e);
              }
            }}
            placeholder="Type a message…"
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: "14px", lineHeight: 1.45,
              padding: "10px 4px 10px 0", resize: "none",
              maxHeight: "128px", minHeight: "42px",
              scrollbarWidth: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Send / Mic button */}
        {canSend ? (
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            style={{
              width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #e91671, #be123c)",
              border: "none", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.6 : 1,
              boxShadow: "0 4px 16px rgba(233,22,113,0.45)",
              transition: "all 0.2s",
              transform: "scale(1)",
            }}
            onMouseEnter={(ev) => { if (!sending) ev.currentTarget.style.transform = "scale(1.08)"; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.transform = "scale(1)"; }}
            title="Send"
          >
            {sending ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={{ animation: "jm-spin 0.8s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginLeft: "2px" }}>
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"/>
              </svg>
            )}
          </button>
        ) : isRecording ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={onCancelRecording}
              style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              title="Delete recording"
              onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.1)"; ev.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; ev.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "0 12px", background: "rgba(233,22,113,0.1)", borderRadius: "22px", height: "44px", border: "1px solid rgba(233,22,113,0.3)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#e91671", animation: "jm-pulse 1.5s infinite" }} />
              <span style={{ color: "#e91671", fontWeight: 700, fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
                {Math.floor((recordingSeconds || 0) / 60)}:{(recordingSeconds || 0) % 60 < 10 ? "0" : ""}{(recordingSeconds || 0) % 60}
              </span>
            </div>
            <button
              type="button"
              onClick={onStopRecording}
              style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "linear-gradient(135deg, #e91671, #be123c)",
                border: "none", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(233,22,113,0.45)",
              }}
              title="Send recording"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginLeft: "2px" }}>
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"/>
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.12)"; ev.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; ev.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            title="Record voice note"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        )}
      </div>

      {/* Emoji Drawer */}
      {showEmojiDrawer && (
        <div style={{
          marginTop: "8px", background: "#150c1f", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", padding: "10px 12px", boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search emojis…"
            value={emojiSearch}
            onChange={(e) => setEmojiSearch(e.target.value)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px", padding: "6px 12px", color: "#fff", fontSize: "12px",
              outline: "none", marginBottom: "8px", boxSizing: "border-box",
            }}
          />
          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "2px", maxHeight: "120px", overflowY: "auto", scrollbarWidth: "none" }}>
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px", borderRadius: "6px", lineHeight: 1, transition: "transform 0.1s, background 0.1s" }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.08)"; ev.currentTarget.style.transform = "scale(1.25)"; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = "none"; ev.currentTarget.style.transform = "scale(1)"; }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
      <style>{`
        @keyframes jm-spin { to { transform: rotate(360deg); } }
        @keyframes jm-pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
