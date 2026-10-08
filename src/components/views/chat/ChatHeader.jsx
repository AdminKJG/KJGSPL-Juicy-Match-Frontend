import React from "react";
import Icon from "../../common/Icon";
import { getPeerOnlineStatus, getPeerPortraitIndex } from "./chatUtils";

export default function ChatHeader({
  activeConn,
  onBack,
  onAudioCall,
  onVideoCall,
  onSearchToggle,
  onInfoToggle,
}) {
  if (!activeConn) return null;

  const peer = activeConn.peer || activeConn;
  const peerName = peer.pseudonym || peer.name || "Match";
  const status = getPeerOnlineStatus(peer, activeConn.lastActive);
  
  // Basic mock function for portrait class if not globally available
  const portraitClass = (index) => `p-idx-${index}`;

  return (
    <header className="flex items-center justify-between p-3 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-10 shadow-sm h-16 shrink-0">
      <div className="flex items-center gap-3">
        {/* Back Button (Mobile) */}
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-2 -ml-1 text-muted hover:text-cream rounded-full hover:bg-surface-light transition-colors"
        >
          <Icon name="back" className="w-5 h-5" />
        </button>

        {/* Peer Avatar & Info */}
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onInfoToggle}
        >
          <div className="relative">
            <div className={`w-10 h-10 rounded-full overflow-hidden bg-plum border border-line flex items-center justify-center font-bold text-lilac ${portraitClass(getPeerPortraitIndex(peer))}`}>
              {peer.photo && typeof peer.photo === "string" ? (
                <img src={peer.photo} alt={peerName} className="w-full h-full object-cover" />
              ) : (
                <span>{peerName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-cream m-0 leading-tight">
                {peerName}
              </h2>
              {peer.isBot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-pink/20 text-pink border border-pink/30 font-semibold uppercase tracking-wider">
                  Bot
                </span>
              )}
              {peer.zone && !peer.isBot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-line text-muted flex items-center gap-1">
                  📍 {peer.zone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: status.color,
                  boxShadow: status.isOnline ? `0 0 6px ${status.color}` : "none"
                }}
              />
              <span className="text-xs text-muted font-medium">{status.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAudioCall}
          className="p-2 text-muted hover:text-pink hover:bg-surface-light rounded-full transition-colors"
          title="Voice Call"
        >
          <Icon name="phone" className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onVideoCall}
          className="p-2 text-muted hover:text-pink hover:bg-surface-light rounded-full transition-colors"
          title="Video Call"
        >
          <Icon name="video" className="w-5 h-5" />
        </button>
        <div className="w-px h-5 bg-line mx-1" />
        <button
          type="button"
          onClick={onSearchToggle}
          className="p-2 text-muted hover:text-cream hover:bg-surface-light rounded-full transition-colors hidden sm:block"
          title="Search in conversation"
        >
          <Icon name="search" className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onInfoToggle}
          className="p-2 text-muted hover:text-cream hover:bg-surface-light rounded-full transition-colors"
          title="Contact Info"
        >
          <Icon name="more" className="w-5 h-5 transform rotate-90" />
        </button>
      </div>
    </header>
  );
}
