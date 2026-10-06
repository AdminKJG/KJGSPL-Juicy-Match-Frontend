import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { preferenceService } from "../../services/preferenceService";
import { formatDate, title } from "../../utils/formatters";

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
    <div className="settings-container">
      <PageHead
        showBack
        backTo="discover"
        backLabel="Back to Discovery"
        kicker="Activity & Inbox"
        heading="Your Notifications"
        description="A discreet inbox for the moments, mutual sparks, and updates you chose to hear about."
        action={
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="button quiet"
                onClick={handleMarkAllRead}
                style={{ fontSize: "0.86rem", minHeight: "38px", padding: "0 16px" }}
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              className="button quiet"
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
      <div className="settings-nav-tabs" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className={`settings-nav-btn ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <span>All ({generalNotifications.length})</span>
        </button>

        {unreadCount > 0 && (
          <button
            type="button"
            className={`settings-nav-btn ${activeFilter === "unread" ? "active" : ""}`}
            onClick={() => setActiveFilter("unread")}
          >
            <span style={{ color: "#f43f5e", fontWeight: "800" }}>●</span>
            <span>Unread ({unreadCount})</span>
          </button>
        )}

        <button
          type="button"
          className={`settings-nav-btn ${activeFilter === "connections" ? "active" : ""}`}
          onClick={() => setActiveFilter("connections")}
        >
          <Icon name="heart" />
          <span>Connections</span>
        </button>

        <button
          type="button"
          className={`settings-nav-btn ${activeFilter === "travel" ? "active" : ""}`}
          onClick={() => setActiveFilter("travel")}
        >
          <Icon name="compass" />
          <span>Travel</span>
        </button>

        <button
          type="button"
          className={`settings-nav-btn ${activeFilter === "security" ? "active" : ""}`}
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
                className={`settings-session-card ${isUnread ? "is-current" : ""}`}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  borderLeft: isUnread ? "3px solid #f43f5e" : undefined,
                }}
                onClick={() => handleOpen(n)}
              >
                <div
                  className="settings-session-icon"
                  style={{
                    background: isUnread ? "rgba(244, 63, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    borderColor: isUnread ? "rgba(244, 63, 94, 0.4)" : "rgba(255, 255, 255, 0.1)",
                    color: isUnread ? "#f43f5e" : "#d1bfd4",
                  }}
                >
                  <Icon name={iconName} />
                </div>

                <div className="settings-session-body">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span className="settings-session-title" style={{ fontWeight: isUnread ? "700" : "500", margin: 0 }}>
                      {n.title}
                    </span>
                    {isUnread && (
                      <span className="save-badge" style={{ background: "#f43f5e", fontSize: "0.68rem", padding: "1px 6px" }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="settings-session-time">
                    {formatDate(n.created_at || n.createdAt, state.prefs?.timezone)} · {title(n.category || "Alert")}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: "0.86rem", color: "#e5d8e7", marginTop: "4px", lineHeight: "1.4" }}>
                      {n.body}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="profile-pill" style={{ fontSize: "0.76rem" }}>
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
