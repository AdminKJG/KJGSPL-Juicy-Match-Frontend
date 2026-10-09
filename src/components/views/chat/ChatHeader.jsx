import React, { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { getPeerOnlineStatus, getPeerPortraitIndex } from "./chatUtils";

export default function ChatHeader({
  activeConn,
  isPeerTyping = false,
  onBack,
  onAudioCall,
  onVideoCall,
  onInfoToggle,
}) {
  const [avatarError, setAvatarError] = useState(false);
  const { isPeerLive, openLiveStream } = useApp();
  if (!activeConn) return null;

  const peer = activeConn.peer || activeConn;
  const peerName = peer.pseudonym || peer.name || "Match";
  const status = getPeerOnlineStatus(peer, activeConn.lastActive);
  const liveStream = isPeerLive?.(peer.id || activeConn.id);
  const isLive = Boolean(liveStream);

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 18px", height: "62px", flexShrink: 0,
      background: "rgba(18,9,28,0.96)", borderBottom: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      position: "sticky", top: 0, zIndex: 10,
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    }}>
      {/* Left: back btn + avatar + info */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        {/* Back (mobile only) */}
        <button
          type="button"
          onClick={onBack}
          style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "none", border: "none", color: "rgba(255,255,255,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
          }}
          className="md-hidden-header-back"
          title="Back"
          onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.08)"; ev.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(ev) => { ev.currentTarget.style.background = "none"; ev.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Avatar + Info */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "11px", cursor: "pointer", padding: "4px 8px 4px 2px", borderRadius: "12px", transition: "background 0.15s", minWidth: 0 }}
          onClick={isLive ? () => openLiveStream?.(liveStream, "viewer") : onInfoToggle}
          onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {isLive ? (
              <div className="live-avatar-ring" style={{ width: "44px", height: "44px" }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                  background: "linear-gradient(135deg, #e91671 0%, #7c3aed 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "15px", fontWeight: 800,
                  border: "2px solid #1a0d20",
                }}>
                  {peer.photo && !avatarError ? (
                    <img
                      src={peer.photo}
                      alt={peerName}
                      onError={() => setAvatarError(true)}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    peerName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="absolute -bottom-1 live-badge-pill">
                  LIVE
                </span>
              </div>
            ) : (
              <>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden",
                  background: "linear-gradient(135deg, #e91671 0%, #7c3aed 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "15px", fontWeight: 800,
                  border: "2px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}>
                  {peer.photo && !avatarError ? (
                    <img
                      src={peer.photo}
                      alt={peerName}
                      onError={() => setAvatarError(true)}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    peerName.slice(0, 2).toUpperCase()
                  )}
                </div>
                {/* Online dot */}
                <span style={{
                  position: "absolute", bottom: "1px", right: "1px",
                  width: "10px", height: "10px", borderRadius: "50%",
                  backgroundColor: status.color,
                  border: "2px solid #12091c",
                  boxShadow: status.isOnline ? `0 0 6px ${status.color}` : "none",
                  transition: "all 0.3s",
                }} title={status.text} />
              </>
            )}
          </div>

          {/* Name + Status */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                {peerName}
              </span>
              {isLive && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    openLiveStream?.(liveStream, "viewer");
                  }}
                  className="px-1.5 py-0.2 bg-red-600/90 hover:bg-red-500 text-white text-[9px] font-extrabold rounded-full tracking-wider uppercase flex items-center gap-1 shadow-sm cursor-pointer"
                  title="Click to watch live broadcast"
                >
                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
              )}
              {peer.zone && (
                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", fontWeight: 600, flexShrink: 0 }}>
                  📍 {peer.zone}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "1px" }}>
              {isPeerTyping ? (
                <span style={{ fontSize: "11.5px", color: "#f472b6", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ display: "inline-block", transform: "translateY(-1px)" }}>✍️</span>
                  <span style={{ fontStyle: "italic", letterSpacing: "0.02em" }}>typing...</span>
                </span>
              ) : isLive ? (
                <span style={{ fontSize: "11.5px", color: "#f43f5e", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>🎥 Broadcasting Live Now</span>
                </span>
              ) : (
                <>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: status.color, flexShrink: 0, boxShadow: status.isOnline ? `0 0 5px ${status.color}` : "none" }} />
                  <span style={{ fontSize: "11.5px", color: status.isOnline ? "#34d399" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                    {status.text}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {/* Watch Live Stream Button (Pulsing Red Pill) */}
        {isLive && (
          <button
            type="button"
            onClick={() => openLiveStream?.(liveStream, "viewer")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-pink text-white font-extrabold text-xs shadow-[0_0_14px_rgba(220,38,38,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer mr-1 animate-pulse"
            title={`Watch ${peerName}'s live broadcast`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Watch Live</span>
          </button>
        )}

        {/* Voice Call */}
        <HeaderBtn onClick={onAudioCall} title="Voice Call (5 FC / min · Caller Billed)" accent>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.53 2 2 0 0 1 3.18 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
          </svg>
        </HeaderBtn>

        {/* Video Call */}
        <HeaderBtn onClick={onVideoCall} title="Video Call (15 FC / min · Caller Billed)" accent>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </HeaderBtn>

        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />

        {/* Info / More */}
        <HeaderBtn onClick={onInfoToggle} title="Contact Info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1" fill="currentColor"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="12" cy="19" r="1" fill="currentColor"/>
          </svg>
        </HeaderBtn>
      </div>

      <style>{`
        @media (min-width: 768px) { .md-hidden-header-back { display: none !important; } }
      `}</style>
    </header>
  );
}

function HeaderBtn({ children, onClick, title, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.18s", flexShrink: 0,
      }}
      onMouseEnter={(ev) => {
        ev.currentTarget.style.background = accent ? "rgba(233,22,113,0.15)" : "rgba(255,255,255,0.1)";
        ev.currentTarget.style.borderColor = accent ? "rgba(233,22,113,0.4)" : "rgba(255,255,255,0.15)";
        ev.currentTarget.style.color = accent ? "#e91671" : "#fff";
        ev.currentTarget.style.transform = "scale(1.06)";
      }}
      onMouseLeave={(ev) => {
        ev.currentTarget.style.background = "rgba(255,255,255,0.05)";
        ev.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        ev.currentTarget.style.color = "rgba(255,255,255,0.55)";
        ev.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}
