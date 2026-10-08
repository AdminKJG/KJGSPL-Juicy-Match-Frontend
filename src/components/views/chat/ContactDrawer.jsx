import React from "react";
import Icon from "../../common/Icon";

export default function ContactDrawer({
  peer,
  activeConn,
  onClose,
  onBlock,
  onReport,
  onClearChat,
}) {
  if (!peer) return null;

  const peerName = peer.pseudonym || peer.name || "Match";
  const bio = peer.bio || "No bio provided.";
  const desires = peer.desires || [];
  
  // Basic mock function for portrait class if not globally available
  const getPeerPortraitIndex = (p) => {
    const idStr = String(p?.id || "0");
    let num = 0;
    for (let i = 0; i < idStr.length; i++) num += idStr.charCodeAt(i);
    return num % 6;
  };
  const portraitClass = (index) => `p-idx-${index}`;

  return (
    <aside className="w-80 flex-shrink-0 bg-surface border-l border-line flex flex-col h-full overflow-hidden absolute md:relative right-0 top-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] md:shadow-none transition-transform duration-300">
      {/* Drawer Header */}
      <div className="flex items-center gap-3 p-4 border-b border-line bg-night/50">
        <button
          onClick={onClose}
          className="p-1.5 text-muted hover:text-cream rounded-full hover:bg-surface-light transition-colors"
        >
          <Icon name="back" className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-cream m-0">Contact Info</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Hero */}
        <div className="p-6 flex flex-col items-center border-b border-line/50 bg-night/20 text-center">
          <div className={`w-32 h-32 rounded-full overflow-hidden bg-plum border-2 border-line mb-4 shadow-glow ${portraitClass(getPeerPortraitIndex(peer))}`}>
            {peer.photo && typeof peer.photo === "string" ? (
              <img src={peer.photo} alt={peerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-lilac">
                {peerName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-cream mb-1 flex items-center justify-center gap-2">
            {peerName}
            {peer.age && <span className="text-muted font-medium">, {peer.age}</span>}
          </h3>
          <p className="text-sm text-muted mb-3">{peer.zone || "World Traveler"}</p>
          
          {peer.isBot && (
            <span className="px-3 py-1 bg-pink/20 text-pink text-xs font-bold rounded-full uppercase tracking-wider mb-4 border border-pink/30">
              Juicy Match AI
            </span>
          )}

          {activeConn?.compatibility && (
            <div className="flex flex-col items-center gap-1 mt-2 p-3 bg-surface rounded-xl border border-line w-full">
              <span className="text-xs text-muted font-medium uppercase tracking-wider">Match Score</span>
              <div className="flex items-center gap-2">
                <Icon name="heart" className="w-4 h-4 text-pink" />
                <span className="text-lg font-bold text-cream">{activeConn.compatibility}%</span>
              </div>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="p-5 border-b border-line/50">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">About</h4>
          <p className="text-sm text-cream leading-relaxed">{bio}</p>
        </div>

        {/* Desires Section */}
        {desires.length > 0 && (
          <div className="p-5 border-b border-line/50">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Desires & Interests</h4>
            <div className="flex flex-wrap gap-2">
              {desires.map((d, i) => (
                <span key={i} className="px-2.5 py-1 bg-surface-light border border-line rounded-lg text-xs font-medium text-lilac shadow-sm">
                  {d.label || d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-5 flex flex-col gap-2">
          {!peer.isBot && (
            <>
              <button
                onClick={onBlock}
                className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium text-cream hover:bg-surface-light transition-colors border border-transparent hover:border-line"
              >
                <span className="flex items-center gap-3"><Icon name="ban" className="w-4 h-4 text-muted" /> Block {peerName}</span>
              </button>
              <button
                onClick={onReport}
                className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium text-pink hover:bg-pink/10 transition-colors border border-transparent hover:border-pink/30"
              >
                <span className="flex items-center gap-3"><Icon name="flag" className="w-4 h-4" /> Report {peerName}</span>
              </button>
            </>
          )}
          <button
            onClick={onClearChat}
            className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium text-cream hover:bg-surface-light transition-colors border border-transparent hover:border-line mt-2"
          >
            <span className="flex items-center gap-3"><Icon name="trash" className="w-4 h-4 text-muted" /> Clear Chat History</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
