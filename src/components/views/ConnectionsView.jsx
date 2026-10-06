import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { chatService } from "../../services/chatService";
import { discoverService } from "../../services/discoverService";
import { portraitClass, title, getPeerPortraitIndex } from "../../utils/formatters";

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
    <div className="connections-view-container">
      <PageHead
        kicker={isMessages ? "Direct Messages" : "Your Connections"}
        heading={isMessages ? "Messages & Chat" : "Connections & Matches"}
        description={
          isMessages
            ? "Pick a conversation to start chatting with your mutual matches."
            : "View all your mutual sparks, sent requests, and members who liked your profile."
        }
        action={
          <div className="connections-top-actions">
            <button
              type="button"
              className="refresh-circle-btn"
              onClick={handleRefresh}
              aria-label="Refresh connections"
              title="Refresh"
              disabled={loading}
            >
              <Icon name="refresh" />
            </button>
          </div>
        }
      />

      {/* 3 Categories Navigation Bar */}
      <div className="connections-summary-bar" role="tablist" aria-label="Connection categories">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`summary-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.label}</span>
              <span className="summary-count-badge">{cat.count}</span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && displayedConnections.length === 0 ? (
        <Loader text="Loading your connections…" />
      ) : displayedConnections.length > 0 ? (
        <div className="connections-cards-grid">
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
                className={`connection-profile-card ${
                  isMutual ? "card-active" : isSent ? "card-sent" : "card-pending"
                }`}
              >
                {/* Image Banner */}
                <div className={`card-portrait-banner ${!photoUrl ? `portrait ${portraitClass(portraitIdx)}` : ""}`}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={peerName}
                      className="connection-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="card-top-badges">
                    {matchScore && (
                      <span className="card-match-badge">
                        ⚡ {matchScore}% Match
                      </span>
                    )}
                    {rawPeer.zone && (
                      <span className="card-zone-badge">
                        <Icon name="pin" /> {title(rawPeer.zone)}
                      </span>
                    )}
                  </div>
                  <div className="card-img-vignette"></div>
                </div>

                {/* Card Content Body */}
                <div className="card-content-body">
                  <div className="card-title-row">
                    <h3 className="card-peer-name">
                      {peerName}
                      {rawPeer.age && <span className="card-peer-age">, {rawPeer.age}</span>}
                    </h3>
                    {Boolean(c.unreadCount) && (
                      <span className="pill" style={{ background: "var(--pink)", color: "#fff", fontWeight: "700" }}>
                        {c.unreadCount} new
                      </span>
                    )}
                  </div>

                  <p className="card-message-snippet">
                    “{subtitleText}”
                  </p>

                  <div className="card-footer-action">
                    {isMutual ? (
                      <button
                        type="button"
                        className="button full-width primary card-primary-btn"
                        onClick={() => navigate(`chat/${c.id}`)}
                      >
                        <span>Open chat</span>
                        <Icon name="arrow" className="btn-arrow" />
                      </button>
                    ) : isLikedYou ? (
                      <button
                        type="button"
                        className="button full-width primary card-primary-btn"
                        onClick={() => handleAcceptInbound(c.id, peerName)}
                      >
                        <span>Accept & Chat</span>
                        <Icon name="arrow" className="btn-arrow" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button full-width quiet card-withdraw-btn"
                        disabled={withdrawingId === rawPeer.id}
                        onClick={() => handleWithdrawRequest(rawPeer.id, peerName)}
                        title="Withdraw sent request"
                      >
                        <span>{withdrawingId === rawPeer.id ? "Withdrawing…" : "Withdraw request"}</span>
                        <span className="btn-arrow">✕</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
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
      )}
    </div>
  );
}
