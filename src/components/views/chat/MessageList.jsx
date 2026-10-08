import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../../../context/AppContext";

// time helpers
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// AuthImage: handles blob/data/http + fallback
const FALLBACKS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
];
function AuthImage({ src, alt, onClick, style }) {
  const [errored, setErrored] = useState(false);
  const fb = FALLBACKS[Math.abs((src || "").length % FALLBACKS.length)];
  const resolved = (!src || errored) ? fb : src;
  return (
    <img
      src={resolved}
      alt={alt || "photo"}
      onClick={onClick}
      onError={() => setErrored(true)}
      loading="lazy"
      style={{ ...style, cursor: onClick ? "zoom-in" : "default" }}
    />
  );
}

// Read receipt ticks (WhatsApp style: 1 grey = sent, 2 grey = delivered, 2 blue = read/seen)
function Ticks({ msg, read, isMine }) {
  if (!isMine) return null;

  const isRead = Boolean(
    read ||
    msg?.read ||
    msg?.isRead ||
    msg?.status === "read" ||
    msg?.status === "seen" ||
    msg?.readAt ||
    msg?.read_at
  );

  const isDelivered = Boolean(
    isRead ||
    msg?.isDelivered ||
    msg?.is_delivered ||
    msg?.status === "delivered" ||
    (msg?.id && !String(msg.id).startsWith("client-"))
  );

  if (isRead) {
    // WhatsApp Double Blue Ticks
    return (
      <span
        title="Read"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "2px",
          color: "#53bdeb",
        }}
      >
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M1 5.5L5 9.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 9.5L11 1.5M11 1.5L15 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  if (isDelivered) {
    // WhatsApp Double Grey Ticks
    return (
      <span
        title="Delivered"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "2px",
          color: "rgba(255,255,255,0.65)",
        }}
      >
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M1 5.5L5 9.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 9.5L11 1.5M11 1.5L15 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }

  // WhatsApp Single Grey Tick (Sent)
  return (
    <span
      title="Sent"
      style={{
        display: "inline-flex",
        alignItems: "center",
        marginLeft: "2px",
        color: "rgba(255,255,255,0.45)",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M1 5.5L4.5 9L10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

// Reply context strip
function ReplyStrip({ replyTo, meId, peerName, isMine }) {
  if (!replyTo) return null;
  const fromMe = replyTo.sender === meId;
  return (
    <div style={{
      borderLeft: `3px solid ${isMine ? "rgba(255,255,255,0.6)" : "#e91671"}`,
      background: isMine ? "rgba(0,0,0,0.25)" : "rgba(233,22,113,0.08)",
      borderRadius: "6px", padding: "5px 9px", marginBottom: "6px",
    }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: isMine ? "rgba(255,255,255,0.8)" : "#e91671", marginBottom: "2px" }}>
        {fromMe ? "You" : peerName || "Match"}
      </div>
      <div style={{ fontSize: "12px", color: isMine ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
        {replyTo.body || "Attachment"}
      </div>
    </div>
  );
}

// Media renderer
function MediaContent({ msg, onViewImage, onToggleAudio, playingAudioId }) {
  const voiceTagMatch = typeof msg.body === "string" && msg.body.match(/\[(voice|audio):([\s\S]+?)\]/i);
  const photoTagMatch = typeof msg.body === "string" && msg.body.match(/\[(photo|image|video|media):([\s\S]+?)\]/i);
  const tagPath = (voiceTagMatch ? voiceTagMatch[2] : photoTagMatch ? photoTagMatch[2] : "")?.trim();
  
  const rawTarget = msg.mediaUrl || msg.media_url || (tagPath ? mediaService.getRawMediaUrl(tagPath) : null) || (msg.mediaId ? mediaService.getRawMediaUrl(msg.mediaId) : null) || (msg.media_id ? mediaService.getRawMediaUrl(msg.media_id) : null);
  const url = rawTarget || "";
  const kind = msg.kind;
  const isVoice = kind === "voice" || kind === "audio" || !!voiceTagMatch || (typeof msg.body === "string" && msg.body.includes("Voice note"));

  if (isVoice) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(0,0,0,0.25)", borderRadius: "14px", padding: "8px 12px", marginBottom: "4px", minWidth: "190px" }}>
        <button
          type="button"
          onClick={() => onToggleAudio && onToggleAudio(msg.id, url)}
          style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #e91671, #9333ea)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
        >
          {playingAudioId === msg.id ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><rect x="2" y="2" width="3" height="10" rx="1"/><rect x="7" y="2" width="3" height="10" rx="1"/></svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="white" style={{ marginLeft: "2px" }}><path d="M1 1L11 7L1 13V1Z"/></svg>
          )}
        </button>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "18px", marginBottom: "2px" }}>
            {[4, 8, 14, 9, 16, 6, 12, 18, 10, 5, 13, 8, 15, 9, 5, 12, 6, 9].map((h, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: 1,
                  maxWidth: "3px", 
                  borderRadius: "2px", 
                  backgroundColor: playingAudioId === msg.id ? "#e91671" : "rgba(255,255,255,0.45)",
                  height: playingAudioId === msg.id ? "12px" : `${h}px`,
                  transition: "all 0.2s",
                  animation: playingAudioId === msg.id ? `jm-wave 0.6s infinite alternate ${i * 0.05}s` : "none"
                }} 
              />
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
            {playingAudioId === msg.id ? "Playing voice note…" : "Voice note"}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
    );
  }

  if (kind === "video" || (url && (url.endsWith(".mp4") || url.endsWith(".webm") || url.includes("video")))) {
    return (
      <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", marginBottom: "4px", cursor: "pointer", maxWidth: "260px" }} onClick={() => onViewImage && onViewImage(url)}>
        <video src={url} style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="18" viewBox="0 0 12 14" fill="#111"><path d="M1 1L11 7L1 13V1Z"/></svg>
          </div>
        </div>
      </div>
    );
  }

  if (url) {
    return (
      <div style={{ borderRadius: "14px", overflow: "hidden", marginBottom: "4px", maxWidth: "260px" }}>
        <AuthImage
          src={url}
          alt="Shared photo"
          onClick={() => onViewImage && onViewImage(url)}
          style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }
  return null;
}

// ── Interactive Live Stream Announcement Card ─────────────────────────────────
function LiveStreamMessageCard({ msg, peer, isMine, onJoinLive }) {
  const body = String(msg.body || "");
  
  // Extract title (between quotes or fallback)
  const titleMatch = body.match(/"([^"]+)"/);
  const streamTitle = titleMatch ? titleMatch[1] : (peer?.pseudonym ? `${peer.pseudonym}'s Live Broadcast ✨` : "Live Broadcast Studio ✨");

  const senderName = isMine ? "You" : (peer?.pseudonym || "Host");

  return (
    <div style={{
      width: "100%",
      minWidth: "240px",
      maxWidth: "320px",
      borderRadius: "16px",
      background: "linear-gradient(145deg, rgba(220,20,90,0.22) 0%, rgba(120,40,180,0.3) 100%), #16081e",
      border: "1.5px solid rgba(233,22,113,0.45)",
      padding: "12px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
      backdropFilter: "blur(12px)",
      margin: "2px 0 4px",
    }}>
      {/* Top Header Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "3px 9px", borderRadius: "100px",
          background: "linear-gradient(90deg, #e11d48, #e91671)",
          boxShadow: "0 0 12px rgba(225,29,72,0.6)",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#fff", animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            LIVE STREAM
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
          🎥 Studio
        </span>
      </div>

      {/* Stream Details & Title */}
      <div style={{ marginBottom: "10px" }}>
        <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 800, color: "#ffffff", lineHeight: 1.35, textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
          {streamTitle}
        </h4>
        <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
          {isMine
            ? "You started a live streaming broadcast."
            : `${senderName} is broadcasting live right now! Tap below to join.`}
        </p>
      </div>

      {/* Action Button: Join Live Room */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onJoinLive?.(msg, streamTitle);
        }}
        style={{
          width: "100%",
          padding: "9px 14px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #e91671 0%, #9333ea 100%)",
          color: "#ffffff",
          border: "none",
          fontWeight: 800,
          fontSize: "12.5px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(233,22,113,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
          transition: "all 0.18s ease",
        }}
        onMouseEnter={(ev) => {
          ev.currentTarget.style.transform = "scale(1.02)";
          ev.currentTarget.style.boxShadow = "0 6px 20px rgba(233,22,113,0.65), inset 0 1px 0 rgba(255,255,255,0.4)";
        }}
        onMouseLeave={(ev) => {
          ev.currentTarget.style.transform = "scale(1)";
          ev.currentTarget.style.boxShadow = "0 4px 16px rgba(233,22,113,0.45), inset 0 1px 0 rgba(255,255,255,0.3)";
        }}
      >
        <span style={{ fontSize: "14px" }}>▶</span>
        <span>{isMine ? "Enter Your Live Studio" : "Join Live Broadcast"}</span>
      </button>
    </div>
  );
}

// Universal Reaction parser that handles all backend and local formats:
// 1. Map of { [userId]: "❤️" }
// 2. Map of { "❤️": count }
// 3. String msg.reaction = "❤️"
// 4. Array of [ { emoji: "❤️" } ]
export function parseReactions(msg) {
  const emojiCounts = {};
  if (!msg) return [];

  // 1. If msg.reaction is a string emoji
  if (typeof msg.reaction === "string" && msg.reaction.trim()) {
    const e = msg.reaction.trim();
    if (/\p{Emoji}/u.test(e) || e.length <= 4) {
      emojiCounts[e] = Number(msg.reactionCount) || 1;
    }
  }

  // 2. If msg.reactions is an Array
  if (Array.isArray(msg.reactions)) {
    msg.reactions.forEach((item) => {
      if (!item) return;
      if (typeof item === "string") {
        emojiCounts[item] = (emojiCounts[item] || 0) + 1;
      } else if (typeof item === "object") {
        const e = item.emoji || item.reaction;
        if (e && typeof e === "string") {
          emojiCounts[e] = (emojiCounts[e] || 0) + 1;
        }
      }
    });
  }
  // 3. If msg.reactions is an Object (e.g. { "jm-member-gen-021": "❤️" } or { "❤️": 2 })
  else if (msg.reactions && typeof msg.reactions === "object") {
    Object.entries(msg.reactions).forEach(([key, val]) => {
      if (!val) return;
      // Case A: key is user ID, val is emoji (e.g. { "jm-member-gen-021": "❤️" })
      if (typeof val === "string" && (/\p{Emoji}/u.test(val) || val.length <= 4)) {
        emojiCounts[val] = (emojiCounts[val] || 0) + 1;
      }
      // Case B: key is emoji, val is count (e.g. { "❤️": 2 })
      else if ((/\p{Emoji}/u.test(key) || key.length <= 4) && (typeof val === "number" || !isNaN(Number(val)))) {
        emojiCounts[key] = (emojiCounts[key] || 0) + Number(val);
      }
      // Case C: key is emoji, val is array of userIds
      else if (Array.isArray(val) && (/\p{Emoji}/u.test(key) || key.length <= 4)) {
        emojiCounts[key] = (emojiCounts[key] || 0) + val.length;
      }
    });
  }

  return Object.entries(emojiCounts).map(([emoji, count]) => ({ emoji, count }));
}

// Reaction badge
function ReactionBadge({ msg, isMine, onReact }) {
  const list = parseReactions(msg);
  if (list.length === 0) return null;
  const totalCount = list.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onReact && list.length > 0) {
          onReact(msg.id || msg.clientId, list[0].emoji);
        }
      }}
      title="Reaction (Click to toggle)"
      style={{
        position: "absolute", bottom: "-11px", [isMine ? "right" : "left"]: "8px",
        background: "#1c0d28", border: "1.5px solid rgba(255,255,255,0.22)",
        borderRadius: "20px", padding: "2px 7px",
        display: "inline-flex", alignItems: "center", gap: "3px",
        fontSize: "14px", cursor: "pointer",
        boxShadow: "0 4px 14px rgba(0,0,0,0.65)", zIndex: 20, userSelect: "none",
        transition: "transform 0.15s ease",
      }}
      onMouseEnter={(ev) => ev.currentTarget.style.transform = "scale(1.15)"}
      onMouseLeave={(ev) => ev.currentTarget.style.transform = "scale(1)"}
    >
      {list.slice(0, 3).map(({ emoji }) => (
        <span key={emoji} style={{ lineHeight: 1 }}>{emoji}</span>
      ))}
      {totalCount > 1 && (
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontWeight: 700, marginLeft: "2px" }}>
          {totalCount}
        </span>
      )}
    </div>
  );
}

// Hover action bar
const QUICK_REACTS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
function HoverActions({ msg, isMine, onReply, onReact, onEdit, onDelete, showDropdown, setShowDropdown }) {
  if (msg.isDeletedForEveryone || msg.deleted_for_all) return null;
  const isCall = msg.kind === "call" || (msg.body && (msg.body.toLowerCase().includes("call ·") || msg.body.startsWith("📹") || msg.body.startsWith("📞")));
  const isVoice = msg.kind === "voice";
  const canEdit = isMine && !isCall && !isVoice && msg.body && !msg.body.startsWith("[photo:");
  const isOpen = Boolean(showDropdown);

  return (
    <div
      className="jm-msg-hover-actions"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        [isMine ? "right" : "left"]: "calc(100% + 8px)", // Placed outside the bubble
        display: "flex", alignItems: "center", gap: "3px",
        background: "rgba(22,11,32,0.9)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "24px", padding: "4px 6px",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transition: "opacity 0.15s ease",
        zIndex: 50, backdropFilter: "blur(14px)", boxShadow: "0 4px 16px rgba(0,0,0,0.55)"
      }}
    >
      {/* Emoji quick react */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(showDropdown === "emoji" ? null : "emoji");
          }}
          style={{ width: "26px", height: "26px", borderRadius: "50%", background: showDropdown === "emoji" ? "rgba(255,255,255,0.18)" : "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", transition: "background 0.15s" }}
          onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          onMouseLeave={(ev) => ev.currentTarget.style.background = showDropdown === "emoji" ? "rgba(255,255,255,0.18)" : "none"}
          title="React"
        >
          😊
        </button>
        {showDropdown === "emoji" && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: "absolute", bottom: "calc(100% + 10px)", [isMine ? "right" : "left"]: 0, background: "rgba(30,14,42,0.98)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "30px", padding: "8px 10px", display: "flex", gap: "6px", boxShadow: "0 10px 32px rgba(0,0,0,0.8)", zIndex: 100, backdropFilter: "blur(16px)" }}
          >
            {QUICK_REACTS.map((e) => (
              <button
                key={e}
                type="button"
                onMouseDown={(ev) => ev.stopPropagation()}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onReact(msg.id || msg.clientId, e);
                  setShowDropdown(null);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "24px", lineHeight: 1, padding: "2px", borderRadius: "50%", transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                onMouseEnter={(ev) => { ev.currentTarget.style.transform = "scale(1.3) translateY(-4px)"; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.transform = "scale(1) translateY(0)"; }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reply */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onReply(msg); }}
        style={{ width: "26px", height: "26px", borderRadius: "50%", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        onMouseLeave={(ev) => ev.currentTarget.style.background = "none"}
        title="Reply"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d1c1d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
        </svg>
      </button>

      {/* More options */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(showDropdown === "more" ? null : "more");
          }}
          style={{ width: "26px", height: "26px", borderRadius: "50%", background: showDropdown === "more" ? "rgba(255,255,255,0.18)" : "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s" }}
          onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          onMouseLeave={(ev) => ev.currentTarget.style.background = showDropdown === "more" ? "rgba(255,255,255,0.18)" : "none"}
          title="More"
        >
          <svg width="3" height="13" viewBox="0 0 3 13" fill="#d1c1d4">
            <circle cx="1.5" cy="1.5" r="1.5"/><circle cx="1.5" cy="6.5" r="1.5"/><circle cx="1.5" cy="11.5" r="1.5"/>
          </svg>
        </button>
        {showDropdown === "more" && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: "absolute", bottom: "calc(100% + 6px)", [isMine ? "right" : "left"]: 0, background: "#1e1028", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,0.7)", minWidth: "130px", zIndex: 100 }}
          >
            <button
              type="button"
              onMouseDown={(ev) => ev.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onReply(msg); setShowDropdown(null); }}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "#e8dcea", fontSize: "13px", cursor: "pointer", display: "block" }}
              onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={(ev) => ev.currentTarget.style.background = "none"}
            >
              Reply
            </button>
            {canEdit && (
              <button
                type="button"
                onMouseDown={(ev) => ev.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(msg); setShowDropdown(null); }}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "#e8dcea", fontSize: "13px", cursor: "pointer", display: "block" }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={(ev) => ev.currentTarget.style.background = "none"}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onMouseDown={(ev) => ev.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(msg); setShowDropdown(null); }}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "#f87171", fontSize: "13px", cursor: "pointer", display: "block" }}
              onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(248,113,113,0.12)"}
              onMouseLeave={(ev) => ev.currentTarget.style.background = "none"}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main MessageList
export default function MessageList({
  messages,
  meId,
  peer,
  loading,
  isInitialLoad,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onViewImage,
  showDropdownMsgId,
  setShowDropdownMsgId,
  onToggleAudio,
  playingAudioId,
}) {
  const { isPeerLive, openLiveStream, activeLiveStreams } = useApp();
  const scrollRef = useRef(null);
  const [hoverDrop, setHoverDrop] = useState(null);
  const isNearBottomRef = useRef(true);
  const lastMsgIdRef = useRef(null);

  const handleJoinLive = (targetMsg, defaultTitle) => {
    const bodyText = typeof targetMsg.body === "string" ? targetMsg.body : "";
    const tagMatch = bodyText.match(/\[livestream:([\s\S]+?)\]/i);
    const streamIdFromTag = tagMatch ? tagMatch[1]?.trim() : targetMsg.streamId || null;

    const liveMatch =
      isPeerLive?.(peer) ||
      isPeerLive?.(targetMsg.sender) ||
      (streamIdFromTag
        ? activeLiveStreams?.find(
            (s) => s.id === streamIdFromTag || s.streamId === streamIdFromTag
          )
        : null);

    const isMine =
      targetMsg.sender === meId ||
      targetMsg.isMine === true ||
      targetMsg.mine === true;

    const finalStream = liveMatch || {
      id: streamIdFromTag || `stream_${peer?.id || Date.now()}`,
      streamId: streamIdFromTag || `stream_${peer?.id || Date.now()}`,
      title: defaultTitle || `${peer?.pseudonym || "Host"}'s Live Stream ✨`,
      hostName: peer?.pseudonym || "Host",
      hostId: peer?.id,
      hostPhoto: peer?.photo,
      hostPortrait: peer?.portrait ?? 0,
      viewerCount: 1,
      state: "live",
      status: "live",
    };

    openLiveStream?.(finalStream, isMine ? "host" : "viewer");
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isNearBottomRef.current = (scrollHeight - scrollTop - clientHeight) < 150;
  };

  useEffect(() => {
    if (scrollRef.current) {
      const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;
      
      const isNewMessage = lastMsg && lastMsg.id !== lastMsgIdRef.current;
      if (lastMsg) lastMsgIdRef.current = lastMsg.id;

      const isMine = lastMsg && (lastMsg.sender === meId || lastMsg.isMine === true || lastMsg.mine === true);
      
      if (isNearBottomRef.current || (isNewMessage && isMine) || loading) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, loading, meId]);

  useEffect(() => {
    const handler = () => { setShowDropdownMsgId(null); setHoverDrop(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [setShowDropdownMsgId]);

  if (loading && isInitialLoad) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", background: "#0b0510" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid rgba(233,22,113,0.2)", borderTopColor: "#e91671", animation: "jm-spin 0.8s linear infinite" }} />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Loading messages…</span>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", background: "#0b0510" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "linear-gradient(135deg, rgba(233,22,113,0.15), rgba(147,51,234,0.15))", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", marginBottom: "16px" }}>
          💬
        </div>
        <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 6px" }}>No messages yet</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textAlign: "center", margin: 0, maxWidth: "240px", lineHeight: 1.5 }}>
          Say hello to {peer?.pseudonym || "your match"} and start the spark! ✨
        </p>
      </div>
    );
  }

  let lastDate = null;

  return (
    <>
      <style>{`
        @keyframes jm-spin { to { transform: rotate(360deg); } }
        @keyframes jm-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes jm-wave {
          0% { transform: scaleY(0.4); opacity: 0.6; }
          100% { transform: scaleY(1.4); opacity: 1; }
        }
        .jm-msg-wrap { animation: jm-fadein 0.18s ease forwards; }
        .jm-msg-wrap:hover .jm-msg-hover-actions { opacity: 1 !important; pointer-events: auto !important; }
        .jm-msgscroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="jm-msgscroll"
        style={{
          flex: 1, overflowY: "auto", padding: "20px 24px 12px",
          display: "flex", flexDirection: "column", gap: "2px",
          backgroundColor: "#0b0510",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          scrollbarWidth: "none",
        }}
      >
        {messages.map((msg, index) => {
          const isMine = msg.sender === meId || msg.isMine === true || msg.mine === true;
          const ts = msg.createdAt || msg.created_at;
          const msgDate = ts ? fmtDate(ts) : null;
          const showDivider = msgDate && msgDate !== lastDate;
          if (showDivider) lastDate = msgDate;

          const isDeleted = msg.isDeletedForEveryone || msg.deleted_for_all;
          const voiceTagMatch = typeof msg.body === "string" && msg.body.match(/\[(voice|audio):([\s\S]+?)\]/i);
          const photoTagMatch = typeof msg.body === "string" && msg.body.match(/\[(photo|image|video|media):([\s\S]+?)\]/i);
          const isVoiceKind = msg.kind === "voice" || msg.kind === "audio" || !!voiceTagMatch || (typeof msg.body === "string" && msg.body.includes("Voice note"));
          const hasMedia = !!(msg.mediaUrl || msg.media_url || msg.mediaId || msg.media_id || isVoiceKind || photoTagMatch);
          let isEmoji = false;
          try {
            isEmoji = !hasMedia && !isDeleted && msg.body && /^\p{Emoji}+$/u.test((msg.body || "").trim()) && (msg.body || "").trim().length <= 8;
          } catch (_) { isEmoji = false; }

          return (
            <React.Fragment key={msg.id || `msg-${index}`}>
              {/* Date divider */}
              {showDivider && (
                <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 8px" }}>
                  <span style={{ padding: "4px 16px", background: "rgba(28,14,38,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.02em", backdropFilter: "blur(8px)" }}>
                    {msgDate}
                  </span>
                </div>
              )}

              {/* Row */}
              <div
                className="jm-msg-wrap"
                data-msg-id={msg.id}
                style={{
                  display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start",
                  margin: (msg.reaction || (msg.reactions && Object.keys(msg.reactions).length > 0)) ? "3px 0 10px" : "3px 0",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", maxWidth: "72%" }}>
                  {/* Peer avatar */}
                  {!isMine && (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginBottom: "2px", background: "linear-gradient(135deg,#e91671,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: 700, border: "1.5px solid rgba(255,255,255,0.1)" }}>
                      {peer?.photo ? (
                        <AuthImage src={peer.photo} alt={peer?.pseudonym} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        (peer?.pseudonym || "M").slice(0, 1).toUpperCase()
                      )}
                    </div>
                  )}

                  {/* Bubble + hover actions */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px", flexDirection: isMine ? "row-reverse" : "row" }}>

                    {/* EMOJI-ONLY MODE */}
                    {isEmoji ? (
                      <div style={{ position: "relative", padding: "4px 2px" }}>
                        <div style={{ fontSize: "38px", lineHeight: 1.1, userSelect: "none" }}>{msg.body}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: isMine ? "flex-end" : "flex-start", gap: "3px", marginTop: "2px" }}>
                          {(msg.edited || msg.isEdited || msg.is_edited) && (
                            <span style={{ fontSize: "11px", color: isMine ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.5)", fontStyle: "italic", marginRight: "3px" }}>
                              edited
                            </span>
                          )}
                          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{fmtTime(ts)}</span>
                          <Ticks msg={msg} read={msg.read} isMine={isMine} />
                        </div>
                        <ReactionBadge msg={msg} isMine={isMine} onReact={onReact} />
                      </div>
                    ) : (
                      /* REGULAR BUBBLE */
                      <div style={{
                        position: "relative", maxWidth: "100%",
                        padding: isDeleted ? "9px 14px" : hasMedia ? "6px 6px 8px" : "9px 14px 7px",
                        borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isMine ? "linear-gradient(135deg, #be123c 0%, #7c3aed 100%)" : "#1c0f26",
                        border: isMine ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: isMine ? "0 4px 18px rgba(190,18,60,0.3)" : "0 4px 14px rgba(0,0,0,0.4)",
                        wordBreak: "break-word", overflowWrap: "anywhere",
                      }}>
                        {/* Reply strip */}
                        {msg.replyTo && (
                          <ReplyStrip replyTo={msg.replyTo} meId={meId} peerName={peer?.pseudonym} isMine={isMine} />
                        )}

                        {/* Media */}
                        {hasMedia && <MediaContent msg={msg} onViewImage={onViewImage} onToggleAudio={onToggleAudio} playingAudioId={playingAudioId} />}

                        {/* Interactive Live Stream Broadcast Card */}
                        {!isDeleted && typeof msg.body === "string" && (msg.body.startsWith("🔴 I just went Live") || msg.body.includes("Come join my live broadcast room") || msg.body.includes("[livestream:") || msg.kind === "livestream") ? (
                          <LiveStreamMessageCard
                            msg={msg}
                            peer={peer}
                            isMine={isMine}
                            onJoinLive={handleJoinLive}
                          />
                        ) : (
                          /* Body text */
                          !isDeleted && msg.body && !isVoiceKind && !(msg.body.startsWith("[photo:") || msg.body.toLowerCase().trim() === "photo") && (
                            <div style={{ fontSize: "14.5px", lineHeight: 1.45, color: isMine ? "#fff" : "#f0eaf4", whiteSpace: "pre-wrap", padding: hasMedia ? "2px 8px 2px" : "0" }}>
                              {msg.body}
                            </div>
                          )
                        )}

                        {/* Deleted */}
                        {isDeleted && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontStyle: "italic", color: isMine ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)", fontSize: "14px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                            This message was deleted
                          </span>
                        )}

                        {/* Meta: time + ticks */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px", marginTop: "4px", padding: hasMedia ? "0 8px" : "0" }}>
                          {(msg.edited || msg.isEdited || msg.is_edited) && (
                            <span style={{ fontSize: "11px", color: isMine ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.5)", fontStyle: "italic", marginRight: "3px", fontWeight: 500 }}>
                              edited
                            </span>
                          )}
                          <span style={{ fontSize: "10px", color: isMine ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)", flexShrink: 0 }}>{fmtTime(ts)}</span>
                          <Ticks msg={msg} read={msg.read} isMine={isMine} />
                        </div>

                        {/* Reaction badge */}
                        <ReactionBadge msg={msg} isMine={isMine} onReact={onReact} />
                      </div>
                    )}

                    {/* Hover Actions */}
                    <HoverActions
                      msg={msg}
                      isMine={isMine}
                      onReply={onReply}
                      onReact={onReact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      showDropdown={showDropdownMsgId === msg.id ? hoverDrop : null}
                      setShowDropdown={(v) => {
                        setShowDropdownMsgId(v ? msg.id : null);
                        setHoverDrop(v);
                      }}
                    />
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}
