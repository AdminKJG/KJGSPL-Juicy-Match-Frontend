import React, { useState, useEffect } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import EmptyState from "../../common/EmptyState";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { chatService } from "../../../services/chatService";
import { discoverService } from "../../../services/discoverService";
import { portraitClass, title, getPeerPortraitIndex } from "../../../utils/formatters";

export default function ConnectionsView({ isMessages = false }) {
  const { state, navigate, showToast } = useApp();
  const [activeCategory, setActiveCategory] = useState("mutual");
  const [loading, setLoading] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [connectionsData, setConnectionsData] = useState({
    items: [],
    inbound: [],
    outbound: [],
  });

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await chatService.getConnections();
      if (res) {
        setConnectionsData({
          items: res.items || [],
          inbound: res.inbound || [],
          outbound: res.outbound || [],
        });
      }
    } catch (err) {
      console.warn("Connections fetch failed:", err.message);
      setConnectionsData({ items: [], inbound: [], outbound: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleRefresh = async () => {
    await loadConnections();
    showToast("Connections refreshed.");
  };

  const handleAcceptInbound = async (connId, peerName) => {
    try {
      await chatService.giveConsent(connId, true);
      showToast(`Spark accepted! You and ${peerName || "this member"} can now chat.`);
      await loadConnections();
      navigate(`chat/${connId}`);
    } catch (err) {
      showToast(err.message || "Failed to accept connection.");
    }
  };

  const handleWithdrawRequest = async (targetId, peerName) => {
    if (!targetId) {
      showToast("Unable to identify target member to withdraw.");
      return;
    }
    setWithdrawingId(targetId);
    try {
      await discoverService.swipe(targetId, "withdraw");
      showToast(`Connection request to ${peerName || "member"} withdrawn.`);
      await loadConnections();
    } catch (err) {
      showToast(err.message || "Failed to withdraw request.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const mutualConnections = connectionsData.items || [];
  const sentConnections = connectionsData.outbound || [];
  const likedYouConnections = connectionsData.inbound || [];

  const categories = [
    {
      id: "mutual",
      label: "Mutual Connections",
      count: mutualConnections.length,
      dotColor: "green-dot",
    },
    {
      id: "sent",
      label: "Sent Requests",
      count: sentConnections.length,
      dotColor: "blue-dot",
    },
    {
      id: "liked_you",
      label: "Liked You",
      count: likedYouConnections.length,
      dotColor: "rose-dot",
    },
  ];

  const displayedConnections =
    activeCategory === "mutual"
      ? mutualConnections
      : activeCategory === "sent"
      ? sentConnections
      : likedYouConnections;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen">
      <PageHead
        kicker={isMessages ? "Direct Messages" : "Your Connections"}
        heading={isMessages ? "Messages & Chat" : "Connections & Matches"}
        description={
          isMessages
            ? "Pick a conversation to start chatting with your mutual matches."
            : "View all your mutual sparks, sent requests, and members who liked your profile."
        }
        action={
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-transparent hover:bg-white/5 border border-white/10 text-white transition-colors disabled:opacity-50"
            onClick={handleRefresh}
            aria-label="Refresh connections"
            title="Refresh"
            disabled={loading}
          >
            <Icon name="refresh" className={`w-[18px] h-[18px] ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* 3 Categories Navigation Bar */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 sm:gap-4 mb-6 border-b border-white/10 pb-4" role="tablist" aria-label="Connection categories">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`flex items-center gap-3 px-5 py-3 rounded-full font-semibold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? "bg-pink/10 border-pink/30 text-pink shadow-inner"
                  : "bg-transparent border-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.label}</span>
              <span className={`text-[0.75rem] px-2 py-0.5 rounded-full ${isActive ? "bg-pink text-white shadow-[0_2px_8px_rgba(233,22,113,0.3)]" : "bg-white/10 text-muted"}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && displayedConnections.length === 0 ? (
        <div className="mt-12 flex justify-center">
          <Loader text="Loading your connections…" />
        </div>
      ) : displayedConnections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedConnections.map((c) => {
            const isMutual = activeCategory === "mutual";
            const isSent = activeCategory === "sent";
            const isLikedYou = activeCategory === "liked_you";

            const rawPeer = c.peer || {};
            const portraitIdx = getPeerPortraitIndex(rawPeer);
            const peerName = rawPeer.pseudonym || "Member";
            const photoUrl =
              rawPeer.profilePhoto ||
              rawPeer.avatarUrl ||
              rawPeer.profile_photo ||
              (Array.isArray(rawPeer.photos) && rawPeer.photos[0]);

            const subtitleText = isMutual
              ? typeof c.lastMessage === "string"
                ? c.lastMessage
                : c.lastMessage?.body || rawPeer.bio || "Mutual connection active. Open chat to send a note."
              : rawPeer.bio || (isSent ? "Waiting for their response." : "They liked your profile!");

            const matchScore = rawPeer.matchPercentage || rawPeer.match_percentage || 88;

            return (
              <article
                key={c.id}
                className={`bg-surface rounded-3xl overflow-hidden shadow-lg border transition-transform hover:-translate-y-1 group flex flex-col ${
                  isMutual ? "border-pink/30" : isSent ? "border-white/5" : "border-lilac/30"
                }`}
              >
                {/* Image Banner */}
                <div className={`h-48 w-full relative bg-gradient-to-br from-pink/20 to-lilac/20 flex items-center justify-center ${!photoUrl ? portraitClass(portraitIdx) : ""}`}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={peerName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-5xl font-serif font-bold text-white shadow-lg">{peerName[0]?.toUpperCase()}</span>
                  )}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20 pointer-events-none">
                    {matchScore && (
                      <span className="bg-black/60 backdrop-blur border border-white/10 text-white text-[0.7rem] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <span className="text-yellow-400">⚡</span> {matchScore}% Match
                      </span>
                    )}
                    {rawPeer.zone && (
                      <span className="bg-black/60 backdrop-blur border border-white/10 text-white text-[0.7rem] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md max-w-[120px] truncate">
                        <Icon name="pin" className="w-3 h-3 text-pink" /> {title(rawPeer.zone)}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent pointer-events-none"></div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 pt-2 flex flex-col flex-1 relative z-10">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h3 className="m-0 text-white font-bold text-xl truncate flex items-baseline gap-1.5">
                      {peerName}
                      {rawPeer.age && <span className="text-[0.95rem] text-muted font-medium">, {rawPeer.age}</span>}
                    </h3>
                    {Boolean(c.unreadCount) && (
                      <span className="bg-pink text-white text-[0.7rem] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-[0_2px_8px_rgba(233,22,113,0.4)]">
                        {c.unreadCount} new
                      </span>
                    )}
                  </div>

                  <p className="m-0 text-cream text-[0.88rem] leading-snug line-clamp-2 italic mb-5 flex-1">
                    “{subtitleText}”
                  </p>

                  <div className="mt-auto pt-4 border-t border-white/10">
                    {isMutual ? (
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 bg-pink hover:bg-[#ff2a85] text-white font-bold py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-pink/20"
                        onClick={() => navigate(`chat/${c.id}`)}
                      >
                        <span>Open chat</span>
                        <Icon name="arrow" className="w-4 h-4" />
                      </button>
                    ) : isLikedYou ? (
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-white font-bold py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg"
                        onClick={() => handleAcceptInbound(c.id, peerName)}
                      >
                        <span>Accept & Chat</span>
                        <Icon name="arrow" className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-muted hover:text-red-400 font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
                        disabled={withdrawingId === rawPeer.id}
                        onClick={() => handleWithdrawRequest(rawPeer.id, peerName)}
                        title="Withdraw sent request"
                      >
                        <span>{withdrawingId === rawPeer.id ? "Withdrawing…" : "Withdraw request"}</span>
                        {!withdrawingId && <span className="text-lg leading-none">✕</span>}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState
            heading={
              activeCategory === "mutual"
                ? "No mutual connections yet"
                : activeCategory === "sent"
                ? "No sent requests"
                : "No incoming likes yet"
            }
            text={
              activeCategory === "mutual"
                ? "When both members accept, mutual connections will appear here ready to chat."
                : activeCategory === "sent"
                ? "Profiles you reach out to will appear here until they reply."
                : "When other members like your profile, they will appear here for your review."
            }
            link="discover"
            label="Explore new sparks"
          />
        </div>
      )}
    </div>
  );
}
