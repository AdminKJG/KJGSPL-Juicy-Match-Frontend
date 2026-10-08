import React from "react";
import Icon from "../../common/Icon";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { formatConversationTime, getLastMessageSnippet, getPeerOnlineStatus } from "./chatUtils";

export default function ChatSidebar({
  connections,
  selectedConnId,
  onSelectConn,
  onSelectConnection,
  loading,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  onRefresh,
  onNavigateDiscover,
  isMobileHidden,
}) {
  const handleSelect = (id) => {
    if (typeof onSelectConn === "function") onSelectConn(id);
    if (typeof onSelectConnection === "function") onSelectConnection(id);
  };
  const filteredConnections = connections.filter((conn) => {
    if (!conn) return false;
    const name = conn.peer?.pseudonym || conn.peer?.name || conn.pseudonym || "Match";
    const lastMsg = getLastMessageSnippet(conn.lastMessage);
    const matchesQuery =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;
    if (activeTab === "unread") return (Number(conn.unreadCount) || 0) > 0;
    if (activeTab === "mutual") return conn.state === "active" || conn.status === "active" || conn.mutualSpark;
    return true;
  });

  const unreadCount = connections.filter(c => c && Number(c.unreadCount) > 0).length;
  const mutualCount = connections.filter(c => c && (c.state === "active" || c.status === "active" || c.mutualSpark)).length;

  const tabs = [
    { id: "all", label: "All", count: connections.length },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "mutual", label: "Mutual Sparks", count: mutualCount },
  ];

  const { isPeerLive, openLiveStream } = useApp();

  // Active live streams among connections
  const liveConnections = (connections || []).filter((conn) => {
    if (!conn) return false;
    const peerId = conn.peer?.id || conn.id;
    return Boolean(isPeerLive?.(peerId));
  });

  return (
    <aside
      className={`w-full md:w-[260px] lg:w-[280px] flex-shrink-0 flex flex-col h-full bg-[#1a0d20] border-r border-white/[0.08] transition-all duration-200 ${
        isMobileHidden ? "hidden md:flex" : "flex"
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight m-0">Chats</h2>
            {connections.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-pink/20 text-pink border border-pink/30">
                {connections.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh chats"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/8 transition-all"
            >
              <Icon name="refresh" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onNavigateDiscover}
              title="Find new matches"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-pink hover:bg-pink/10 transition-all"
            >
              <Icon name="discover" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-muted/60 focus:outline-none focus:border-pink/50 focus:ring-1 focus:ring-pink/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-2.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 flex-1 justify-center py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-pink text-white shadow-[0_2px_10px_rgba(233,22,113,0.3)]"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
              {tab.count > 0 && activeTab !== tab.id && (
                <span className="min-w-[14px] h-3.5 px-1 rounded-full bg-white/10 text-[9px] flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Instagram-Style Live Connections Story Tray ── */}
      {liveConnections.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-white/[0.08] bg-black/25">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-pink tracking-wider flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-pink animate-ping" />
              Live Now ({liveConnections.length})
            </span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {liveConnections.map((conn) => {
              const peerId = conn.peer?.id || conn.id;
              const stream = isPeerLive?.(peerId);
              const peerName = conn.peer?.pseudonym || conn.peer?.name || "Match";
              return (
                <button
                  key={`story-${conn.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (stream) openLiveStream?.(stream, "viewer");
                  }}
                  className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
                  title={`Watch ${peerName}'s live stream`}
                >
                  <div className="live-avatar-ring">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border-2 border-[#1a0d20]">
                      {conn.peer?.photo ? (
                        <img src={conn.peer.photo} alt={peerName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-pink to-purple-600">
                          {peerName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 live-badge-pill">
                      LIVE
                    </span>
                  </div>
                  <span className="text-[10px] text-white/90 font-medium truncate max-w-[54px] text-center">
                    {peerName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <Loader text="Loading chats…" size="small" />
          </div>
        ) : filteredConnections.length > 0 ? (
          <div className="py-1.5">
            {filteredConnections.map((conn) => {
              const isSelected = conn.id === selectedConnId;
              const peerName = conn.peer?.pseudonym || conn.peer?.name || "Match";
              const lastMsg = getLastMessageSnippet(conn.lastMessage);
              const status = getPeerOnlineStatus(conn.peer, conn.lastActive);
              // Check if this peer is live broadcasting
              const liveStream = isPeerLive?.(conn.peer?.id || conn.id);
              const isLive = Boolean(liveStream);
              // Only show unread if NOT currently selected
              const hasUnread = !isSelected && Boolean(conn.unreadCount && conn.unreadCount > 0);

              return (
                <div
                  key={conn.id}
                  onClick={() => handleSelect(conn.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all duration-150 relative ${
                    isSelected
                      ? "bg-pink/10 border-l-2 border-pink"
                      : "hover:bg-white/[0.04] border-l-2 border-transparent"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="relative flex-shrink-0"
                    onClick={(e) => {
                      if (isLive && liveStream) {
                        e.stopPropagation();
                        openLiveStream?.(liveStream, "viewer");
                      }
                    }}
                  >
                    {isLive ? (
                      /* Instagram-style live glowing ring */
                      <div className="live-avatar-ring">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink/30 to-purple-600/30 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                          {conn.peer?.photo && typeof conn.peer.photo === "string" ? (
                            <img src={conn.peer.photo} alt={peerName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{peerName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-1 live-badge-pill">
                          LIVE
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink/30 to-purple-600/30 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                          {conn.peer?.photo && typeof conn.peer.photo === "string" ? (
                            <img src={conn.peer.photo} alt={peerName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{peerName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <span
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1a0d20] transition-colors"
                          style={{ backgroundColor: status.color, boxShadow: status.isOnline ? "0 0 6px #10b981" : "none" }}
                          title={status.text}
                        />
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className={`text-xs font-semibold truncate ${isSelected ? "text-pink" : hasUnread ? "text-white" : "text-cream"}`}>
                          {peerName}
                        </h3>
                        {isLive && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (liveStream) openLiveStream?.(liveStream, "viewer");
                            }}
                            className="px-1.5 py-0.2 bg-red-600/90 hover:bg-red-500 text-white text-[9px] font-extrabold rounded-full tracking-wider uppercase flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Click to watch live stream"
                          >
                            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted flex-shrink-0 ml-1.5">
                        {conn.lastActive ? formatConversationTime(conn.lastActive) : "Now"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-[11px] truncate ${hasUnread ? "text-white/90 font-medium" : "text-muted"}`}>
                        {conn.peer?.isBot && "🤖 "}
                        {lastMsg}
                      </p>
                      {hasUnread && (
                        <span className="flex-shrink-0 min-w-[18px] h-4 px-1 rounded-full bg-pink text-white text-[9px] font-bold flex items-center justify-center shadow-[0_2px_8px_rgba(233,22,113,0.5)]">
                          {conn.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center gap-3 mt-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
              💬
            </div>
            <p className="text-sm font-semibold text-muted">
              {activeTab === "unread" ? "No unread messages" : activeTab === "mutual" ? "No mutual sparks yet" : "No conversations yet"}
            </p>
            <button
              type="button"
              onClick={onNavigateDiscover}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink/10 hover:bg-pink/20 text-pink text-sm font-semibold transition-all border border-pink/25"
            >
              <Icon name="discover" className="w-4 h-4" /> Discover Sparks
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
