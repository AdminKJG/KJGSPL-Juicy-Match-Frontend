import React, { useState, useEffect } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import EmptyState from "../../common/EmptyState";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { preferenceService } from "../../../services/preferenceService";
import { formatDate, title } from "../../../utils/formatters";

const formatNotificationTitle = (n) => {
  if (n.title && n.title !== "You have an update in Juicy Match") {
    return n.title;
  }
  const cat = (n.category || "").toLowerCase();
  if (cat.includes("conn") || cat.includes("spark") || cat.includes("match")) {
    return "New Spark & Connection Interest";
  }
  if (cat.includes("travel") || cat.includes("passport")) {
    return "Passport Travel Update";
  }
  if (cat.includes("sec") || cat.includes("auth")) {
    return "Security & Privacy Activity Notice";
  }
  if (n.body) {
    return n.body.length > 50 ? `${n.body.slice(0, 50)}…` : n.body;
  }
  return "Juicy Match Member Alert";
};

export default function NotificationsView() {
  const { state, navigate, showToast } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "unread" | "connections" | "messages" | "travel" | "security"

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await preferenceService.getNotifications();
      if (res?.items) setNotifications(res.items);
    } catch (err) {
      console.warn("Notifications load error:", err.message);
      if (state.notifications?.length > 0) setNotifications(state.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleOpen = async (n) => {
    try {
      await preferenceService.markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
      );
    } catch {}

    if (n.route) {
      navigate(n.route.replace(/^\//, ""));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read_at)
          .map((n) => preferenceService.markNotificationRead(n.id).catch(() => {}))
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      showToast("All notifications marked as read! ✓");
    } catch {
      showToast("Updated notifications.");
    }
  };

  const filteredNotifications = notifications
    .filter((n) => {
      const cat = (n.category || "").toLowerCase();
      // Exclude chat/messages from general notification inbox
      return !cat.includes("msg") && !cat.includes("chat");
    })
    .filter((n) => {
      if (activeFilter === "unread") return !n.read_at;
      if (activeFilter !== "all") {
        const cat = (n.category || "").toLowerCase();
        return cat.includes(activeFilter);
      }
      return true;
    });

  const generalNotifications = notifications.filter((n) => {
    const cat = (n.category || "").toLowerCase();
    return !cat.includes("msg") && !cat.includes("chat");
  });
  const unreadCount = generalNotifications.filter((n) => !n.read_at).length;

  const getCategoryIcon = (category) => {
    const c = (category || "").toLowerCase();
    if (c.includes("match") || c.includes("conn")) return "heart";
    if (c.includes("travel") || c.includes("pass")) return "compass";
    if (c.includes("sec") || c.includes("auth")) return "shield";
    if (c.includes("bill") || c.includes("order")) return "discover";
    return "bell";
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen">
      <PageHead
        showBack
        backTo="discover"
        backLabel="Back to Discovery"
        kicker="Notifications"
        heading="All Notifications"
        description="Stay updated on new sparks, profile views, security alerts, and system notices."
        action={
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10"
                onClick={handleMarkAllRead}
                style={{ fontSize: "0.86rem", minHeight: "38px", padding: "0 16px" }}
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10"
              onClick={() => navigate("settings")}
              style={{ fontSize: "0.86rem", minHeight: "38px", padding: "0 16px" }}
            >
              <Icon name="settings" />
              <span>Preferences</span>
            </button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full shrink-0 font-semibold text-[0.9rem] transition-all duration-200 border ${activeFilter === "all" ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]" : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"}`}
          onClick={() => setActiveFilter("all")}
        >
          <span>All ({generalNotifications.length})</span>
        </button>

        {unreadCount > 0 && (
          <button
            type="button"
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full shrink-0 font-semibold text-[0.9rem] transition-all duration-200 border ${activeFilter === "unread" ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]" : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"}`}
            onClick={() => setActiveFilter("unread")}
          >
            <span style={{ color: "#f43f5e", fontWeight: "800" }}>●</span>
            <span>Unread ({unreadCount})</span>
          </button>
        )}

        <button
          type="button"
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full shrink-0 font-semibold text-[0.9rem] transition-all duration-200 border ${activeFilter === "connections" ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]" : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"}`}
          onClick={() => setActiveFilter("connections")}
        >
          <Icon name="heart" />
          <span>Connections</span>
        </button>

        <button
          type="button"
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full shrink-0 font-semibold text-[0.9rem] transition-all duration-200 border ${activeFilter === "travel" ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]" : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"}`}
          onClick={() => setActiveFilter("travel")}
        >
          <Icon name="compass" />
          <span>Travel</span>
        </button>

        <button
          type="button"
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full shrink-0 font-semibold text-[0.9rem] transition-all duration-200 border ${activeFilter === "security" ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]" : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"}`}
          onClick={() => setActiveFilter("security")}
        >
          <Icon name="shield" />
          <span>Security</span>
        </button>
      </div>

      {loading ? (
        <Loader text="Refreshing your notifications…" />
      ) : filteredNotifications.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredNotifications.map((n) => {
            const isUnread = !n.read_at;
            const iconName = getCategoryIcon(n.category);

            return (
              <div
                key={n.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isUnread ? "border-pink/30 bg-pink/5" : "border-white/10 bg-black/20"}`}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  borderLeft: isUnread ? "3px solid #f43f5e" : undefined,
                }}
                onClick={() => handleOpen(n)}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-muted shrink-0"
                  style={{
                    background: isUnread ? "rgba(244, 63, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    borderColor: isUnread ? "rgba(244, 63, 94, 0.4)" : "rgba(255, 255, 255, 0.1)",
                    color: isUnread ? "#f43f5e" : "#d1bfd4",
                  }}
                >
                  <Icon name={iconName} />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span className="text-[0.95rem] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontWeight: isUnread ? "700" : "500", margin: 0 }}>
                      {formatNotificationTitle(n)}
                    </span>
                    {isUnread && (
                      <span className="text-[0.65rem] uppercase tracking-wider font-bold text-white rounded-full" style={{ background: "#f43f5e", fontSize: "0.68rem", padding: "1px 6px" }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-[0.8rem] text-muted">
                    {formatDate(n.created_at || n.createdAt, state.prefs?.timezone)} · {title(n.category || "Alert")}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: "0.86rem", color: "#e5d8e7", marginTop: "4px", lineHeight: "1.4" }}>
                      {n.body}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.82rem] font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-white" style={{ fontSize: "0.76rem" }}>
                    <span>Open</span>
                    <Icon name="arrow" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          heading="A quiet moment."
          text="No notifications matching this filter."
          link="settings"
          label="Adjust notification settings"
        />
      )}
    </div>
  );
}
