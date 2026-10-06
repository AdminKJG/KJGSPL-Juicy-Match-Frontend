import React from "react";
import Icon from "../common/Icon";
import Avatar from "../common/Avatar";
import { useApp } from "../../context/AppContext";
import { title } from "../../utils/formatters";

export default function Topbar() {
  const { state, navigate } = useApp();

  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem("jm_theme") || "dark";
  });

  const toggleTheme = (e) => {
    e.stopPropagation();
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("jm_theme", next);
  };

  const pseudonym = state?.me?.profile?.pseudonym || "Member";
  const plan = title(state?.entitlement?.plan || "free");
  const notificationsCount = state?.notifications?.filter((n) => !n.read).length || 47;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-search-wrap">
          <Icon name="search" className="topbar-search-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Search connections, sparks, messages…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate("explore");
              }
            }}
          />
        </div>
      </div>

      <div className="top-actions">
        {/* AI Assistant Button */}
        <button
          type="button"
          className="button quiet topbar-action-btn"
          onClick={() => navigate("assist")}
          title="AI Coach & Match Guidance"
        >
          <Icon name="sparkle" className="icon-gold" />
          <span className="topbar-btn-text">AI Coach</span>
        </button>

        {/* Notifications Trigger */}
        <button
          type="button"
          className="button quiet topbar-action-btn notif-bell-btn"
          onClick={() => navigate("notifications")}
          title="Notifications"
        >
          <Icon name="bell" />
          {notificationsCount > 0 && (
            <span className="topbar-notif-badge">{notificationsCount > 99 ? "99+" : notificationsCount}</span>
          )}
        </button>



        {/* User Profile Pill */}
        <div
          className="topbar-user-pill"
          onClick={() => navigate("profile")}
          role="button"
          tabIndex="0"
          title="View Your Profile"
        >
          <Avatar profile={state?.me?.profile} className="topbar-avatar" />
          <div className="topbar-user-details">
            <span className="topbar-user-name">{pseudonym}</span>
            <span className="topbar-plan-badge">✦ {plan}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
