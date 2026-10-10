import React, { useState, useEffect, useMemo } from "react";
import Icon from "../../common/Icon";
import EmptyState from "../../common/EmptyState";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { formatRelativeTime, formatDate } from "../../../utils/formatters";

/**
 * Intelligently resolve human-friendly metadata, titles, and preview descriptions
 * so users never see raw code paths like `/v1/livestreams/...` or generic fallbacks.
 */
function resolveNotificationDisplay(n) {
  const cat = (n?.category || "").toLowerCase();
  const route = (n?.route || "").toLowerCase();
  const rawTitle = (n?.title || "").trim();
  const rawBody = (n?.body || "").trim();

  // 1. Live stream broadcast
  if (cat.includes("live") || route.includes("livestream")) {
    const streamId = (n.route || "").split("/").filter(Boolean).pop();
    const isGeneric = !rawTitle || rawTitle.toLowerCase().includes("update in juicy match");
    return {
      type: "livestream",
      icon: "video",
      categoryLabel: "Live Stream",
      badgeColor: "text-red-400 bg-red-500/15 border-red-500/30",
      accentBg: "from-red-500/20 to-rose-600/10 text-red-400 border-red-500/30",
      title: isGeneric ? "Live Stream Started 🔴" : rawTitle,
      body: rawBody || "A member is currently broadcasting live. Tap to join the live room and chat.",
      actionLabel: "Join Stream",
      targetStreamId: streamId,
    };
  }

  // 2. Security & sign-in alert
  if (cat.includes("sec") || cat.includes("auth") || route.includes("settings") || rawTitle.toLowerCase().includes("login")) {
    return {
      type: "security",
      icon: "shield",
      categoryLabel: "Security",
      badgeColor: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      accentBg: "from-emerald-500/20 to-teal-600/10 text-emerald-400 border-emerald-500/30",
      title: rawTitle || "Security Alert 🔒",
      body: rawBody || "New account sign-in or security activity detected.",
      actionLabel: "View Settings",
    };
  }

  // 3. Mutual spark / connection
  if (cat.includes("conn") || cat.includes("spark") || cat.includes("match") || route.includes("connection")) {
    const isGeneric = !rawTitle || rawTitle.toLowerCase().includes("update in juicy match");
    return {
      type: "connections",
      icon: "heart",
      categoryLabel: "Mutual Spark",
      badgeColor: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      accentBg: "from-rose-500/20 to-pink-600/10 text-rose-400 border-rose-500/30",
      title: isGeneric ? "New Mutual Spark! 🔥" : rawTitle,
      body: rawBody || "Someone liked your profile and wants to connect with you.",
      actionLabel: "View Spark",
    };
  }

  // 4. Messages & chat
  if (cat.includes("msg") || cat.includes("chat") || route.includes("messages")) {
    const isGeneric = !rawTitle || rawTitle.toLowerCase().includes("update in juicy match");
    return {
      type: "messages",
      icon: "chat",
      categoryLabel: "Direct Message",
      badgeColor: "text-pink-400 bg-pink-500/15 border-pink-500/30",
      accentBg: "from-pink-500/20 to-purple-600/10 text-pink-400 border-pink-500/30",
      title: isGeneric ? "New Message Received 💬" : rawTitle,
      body: rawBody || "You have a new message waiting in your chat inbox.",
      actionLabel: "Open Chat",
    };
  }

  // 5. VIP Billing & Credits
  if (cat.includes("bill") || cat.includes("tier") || cat.includes("credit") || route.includes("membership")) {
    const isGeneric = !rawTitle || rawTitle.toLowerCase().includes("update in juicy match");
    return {
      type: "billing",
      icon: "crown",
      categoryLabel: "VIP & Billing",
      badgeColor: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      accentBg: "from-amber-500/20 to-orange-600/10 text-amber-400 border-amber-500/30",
      title: isGeneric ? "VIP Membership Update 👑" : rawTitle,
      body: rawBody || "Your membership tier or feature credits balance has been updated.",
      actionLabel: "View Wallet",
    };
  }

  // 6. Travel & Passport
  if (cat.includes("travel") || cat.includes("pass") || route.includes("passport")) {
    return {
      type: "travel",
      icon: "plane",
      categoryLabel: "Travel Mode",
      badgeColor: "text-sky-400 bg-sky-500/15 border-sky-500/30",
      accentBg: "from-sky-500/20 to-cyan-600/10 text-sky-400 border-sky-500/30",
      title: rawTitle || "Passport Travel Match ✈️",
      body: rawBody || "Active members found near your selected travel destination.",
      actionLabel: "Open Passport",
    };
  }

  // 7. General Notice
  const isGeneric = !rawTitle || rawTitle.toLowerCase().includes("update in juicy match");
  return {
    type: "system",
    icon: "bell",
    categoryLabel: "Notification",
    badgeColor: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    accentBg: "from-purple-500/20 to-indigo-600/10 text-purple-400 border-purple-500/30",
    title: isGeneric ? "Juicy Match Update ✨" : rawTitle,
    body: rawBody || "You have a new update in your Juicy Match account.",
    actionLabel: "View Details",
  };
}

export default function NotificationsView() {
  const {
    state,
    navigate,
    showToast,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    refreshNotifications,
    openLiveStream,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const notifications = useMemo(() => {
    return Array.isArray(state?.notifications) ? state.notifications : [];
  }, [state?.notifications]);

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      setLoading(true);
      try {
        await refreshNotifications?.();
      } catch (err) {
        console.warn("[NotificationsView] Refresh error:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLatest();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute category counts
  const counts = useMemo(() => {
    const c = {
      all: notifications.length,
      unread: 0,
      livestream: 0,
      security: 0,
      connections: 0,
      messages: 0,
      billing: 0,
      travel: 0,
    };
    notifications.forEach((n) => {
      const isUnread = !n.read_at && !n.read;
      if (isUnread) c.unread++;
      const resolved = resolveNotificationDisplay(n);
      if (c[resolved.type] !== undefined) {
        c[resolved.type]++;
      }
    });
    return c;
  }, [notifications]);

  const totalUnread = typeof state?.unreadNotificationCount === "number"
    ? state.unreadNotificationCount
    : counts.unread;

  // Filter list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isUnread = !n.read_at && !n.read;
      const resolved = resolveNotificationDisplay(n);

      if (activeFilter === "unread" && !isUnread) return false;
      if (activeFilter !== "all" && activeFilter !== "unread" && resolved.type !== activeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = resolved.title.toLowerCase().includes(q);
        const matchesBody = resolved.body.toLowerCase().includes(q);
        const matchesCat = resolved.categoryLabel.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody && !matchesCat) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  // Open & Deep-link Handler
  const handleOpen = (n) => {
    // 1. Mark as read on backend
    if (!n.read_at && !n.read) {
      markNotificationRead?.(n.id);
    }

    const resolved = resolveNotificationDisplay(n);

    // 2. If it's a live stream broadcast, open livestream directly!
    if (resolved.type === "livestream" && resolved.targetStreamId) {
      if (openLiveStream) {
        openLiveStream({ id: resolved.targetStreamId, streamId: resolved.targetStreamId });
        return;
      }
      navigate("explore");
      return;
    }

    // 3. Otherwise navigate via cleaned route
    if (n.route) {
      let target = n.route.replace(/^\/+/, "");
      if (target.startsWith("v1/")) target = target.slice(3);
      if (target.startsWith("livestreams/")) {
        navigate("explore");
        return;
      }
      navigate(target);
    }
  };

  const handleMarkSingleRead = (e, n) => {
    e.stopPropagation();
    markNotificationRead?.(n.id);
    showToast("Notification marked as read. ✓", "info");
  };

  const handleDeleteItem = (e, notifId) => {
    e.stopPropagation();
    deleteNotification?.(notifId);
    showToast("Notification removed.", "info");
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead?.();
      showToast("All notifications marked as read! ✓", "success");
    } catch {
      showToast("Updated notifications.", "info");
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 min-h-screen">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight m-0">
              Notifications
            </h1>
            {totalUnread > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink/20 text-pink border border-pink/30 shadow-[0_2px_8px_rgba(233,22,113,0.3)]">
                <span className="w-2 h-2 rounded-full bg-pink animate-pulse" />
                {totalUnread} new
              </span>
            )}
          </div>
          <p className="text-sm text-cream/70 mt-1 m-0">
            Real-time updates on sparks, live streams, messages, and security.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold border border-white/10 transition-all shadow-sm"
              title="Mark all notifications as read"
            >
              <Icon name="check" className="w-3.5 h-3.5 text-pink" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refreshNotifications?.()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/10 transition-all"
            title="Refresh notifications"
          >
            <Icon name="refresh" className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate("settings")}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/10 transition-all"
            title="Notification Preferences"
          >
            <Icon name="settings" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Icon
          name="search"
          className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notifications by keyword…"
          className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-muted/60 focus:outline-none focus:border-pink/50 focus:bg-white/[0.07] transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
          >
            <Icon name="close" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-5 select-none">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
            activeFilter === "all"
              ? "bg-pink border-pink text-white shadow-[0_2px_12px_rgba(233,22,113,0.35)]"
              : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <span>All</span>
          <span className="opacity-75 text-[11px]">({counts.all})</span>
        </button>

        {counts.unread > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              activeFilter === "unread"
                ? "bg-pink border-pink text-white shadow-[0_2px_12px_rgba(233,22,113,0.35)]"
                : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Unread</span>
            <span className="opacity-75 text-[11px]">({counts.unread})</span>
          </button>
        )}

        {counts.livestream > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilter("livestream")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              activeFilter === "livestream"
                ? "bg-red-500 border-red-500 text-white shadow-[0_2px_12px_rgba(239,68,68,0.35)]"
                : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span>Live Streams</span>
            <span className="opacity-75 text-[11px]">({counts.livestream})</span>
          </button>
        )}

        {counts.security > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilter("security")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              activeFilter === "security"
                ? "bg-emerald-600 border-emerald-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.35)]"
                : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <Icon name="shield" className="w-3.5 h-3.5" />
            <span>Security</span>
            <span className="opacity-75 text-[11px]">({counts.security})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveFilter("connections")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
            activeFilter === "connections"
              ? "bg-pink border-pink text-white shadow-[0_2px_12px_rgba(233,22,113,0.35)]"
              : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Icon name="heart" className="w-3.5 h-3.5" />
          <span>Sparks</span>
          {counts.connections > 0 && <span className="opacity-75 text-[11px]">({counts.connections})</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("messages")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
            activeFilter === "messages"
              ? "bg-pink border-pink text-white shadow-[0_2px_12px_rgba(233,22,113,0.35)]"
              : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Icon name="chat" className="w-3.5 h-3.5" />
          <span>Messages</span>
          {counts.messages > 0 && <span className="opacity-75 text-[11px]">({counts.messages})</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("billing")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
            activeFilter === "billing"
              ? "bg-amber-500 border-amber-500 text-white shadow-[0_2px_12px_rgba(245,158,11,0.35)]"
              : "bg-white/[0.03] border-white/[0.08] text-muted hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Icon name="crown" className="w-3.5 h-3.5" />
          <span>VIP & Billing</span>
          {counts.billing > 0 && <span className="opacity-75 text-[11px]">({counts.billing})</span>}
        </button>
      </div>

      {/* ── Notification List ─────────────────────────────────── */}
      {loading && notifications.length === 0 ? (
        <Loader text="Loading your notifications…" />
      ) : filteredNotifications.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {filteredNotifications.map((n) => {
            const isUnread = !n.read_at && !n.read;
            const meta = resolveNotificationDisplay(n);
            const relativeTime = formatRelativeTime(n.created_at || n.createdAt) || "recently";

            return (
              <div
                key={n.id || `notif-${Math.random()}`}
                onClick={() => handleOpen(n)}
                role="button"
                tabIndex="0"
                className={`group relative flex items-start sm:items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                  isUnread
                    ? "bg-[#1f1225]/85 border-pink/30 hover:border-pink/60 hover:bg-[#25152c] shadow-[0_4px_16px_rgba(233,22,113,0.08)]"
                    : "bg-[#140b17]/60 border-white/[0.06] hover:border-white/20 hover:bg-[#1a0f1f]/80 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Visual Icon Avatar */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br border transition-transform duration-200 group-hover:scale-105 ${meta.accentBg}`}
                >
                  <Icon name={meta.icon} className="w-5 h-5" />
                </div>

                {/* Body Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className={`text-[0.93rem] ${
                        isUnread ? "font-bold text-white" : "font-semibold text-white/90"
                      } truncate`}
                    >
                      {meta.title}
                    </span>

                    {/* Clean Category Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${meta.badgeColor}`}
                    >
                      {meta.categoryLabel}
                    </span>

                    {/* Relative Time Stamp */}
                    <span className="text-[11px] text-muted ml-auto sm:ml-0">
                      {relativeTime}
                    </span>
                  </div>

                  {/* Human-friendly description preview */}
                  <p className="text-[0.85rem] text-cream/80 line-clamp-2 leading-relaxed m-0">
                    {meta.body}
                  </p>
                </div>

                {/* Right Actions & Unread Status */}
                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  {/* Subtle Action Pill */}
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.05] group-hover:bg-pink/20 text-cream/70 group-hover:text-pink border border-white/10 group-hover:border-pink/30 transition-all">
                    <span>{meta.actionLabel}</span>
                    <Icon name="arrow" className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>

                  {/* Mark single as read */}
                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkSingleRead(e, n)}
                      title="Mark as read"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Icon name="check" className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Dismiss / Delete */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, n.id)}
                    title="Dismiss notification"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>

                  {/* Unread Glow Dot */}
                  {isUnread && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-pink shadow-[0_0_8px_rgba(233,22,113,0.8)] ml-0.5"
                      title="Unread"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          heading={activeFilter === "unread" ? "All caught up!" : "No notifications"}
          text={
            activeFilter === "unread"
              ? "You have zero unread notifications. Check back later for fresh updates!"
              : searchQuery
              ? `No notifications found matching "${searchQuery}".`
              : "You don't have any notifications in this section right now."
          }
          link="discover"
          label="Explore Sparks"
        />
      )}
    </div>
  );
}
