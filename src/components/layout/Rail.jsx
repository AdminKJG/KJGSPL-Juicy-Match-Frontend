import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import Avatar from "../common/Avatar";
import { useApp } from "../../context/AppContext";

const mainNav = [
  { id: "discover", label: "Discover", icon: "discover" },
  { id: "connections", label: "Connections", icon: "heart" },
  { id: "explore", label: "Explore", icon: "compass" },
  { id: "messages", label: "Messages", icon: "chat" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "profile", label: "Me", icon: "user" },
];

export default function Rail() {
  const { state, activeRoute, navigate, logout } = useApp();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("jm_theme") || "dark";
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("jm_rail_collapsed") === "true";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("jm_theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-rail-collapsed", isCollapsed ? "true" : "false");
    localStorage.setItem("jm_rail_collapsed", isCollapsed ? "true" : "false");
  }, [isCollapsed]);

  const toggleTheme = (e) => {
    e.stopPropagation();
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleCollapse = (e) => {
    e.stopPropagation();
    setIsCollapsed((prev) => !prev);
  };

  const currentTab = activeRoute.split("/")[0];
  const activeNavId =
    currentTab === "chat"
      ? "messages"
      : ["passport", "events", "desires"].includes(currentTab)
        ? "explore"
        : ["privacy", "album", "membership"].includes(currentTab)
          ? "profile"
          : currentTab;

  const pseudonym = state?.me?.profile?.pseudonym || "Member";
  const planRaw = (state?.entitlement?.plan || "free").toLowerCase();
  const isFree = planRaw === "free" || planRaw === "explore";
  const isPlus = planRaw === "plus";
  const isPremium = planRaw === "premium";

  const planBadge = isPremium ? "PREMIUM VIP" : "UPGRADE";
  const planName = isFree ? "Free Plan" : isPlus ? "Plus Plan" : "Premium Plan";
  const planSubtitle = isFree
    ? "Upgrade to Plus or Premium"
    : isPlus
      ? "Upgrade to Premium for VIP perks"
      : "All privileges active";

  return (
    <aside className={`rail ${isCollapsed ? "collapsed" : ""}`}>
      <div className="brand-header-row">
        <a
          className="brand"
          href="/discover"
          onClick={(e) => {
            e.preventDefault();
            navigate("discover");
          }}
          title="Juicy Match Home"
        >
          <img src="/assets/logo.jpg" alt="Juicy Match" className="brand-logo-only" />
          {!isCollapsed && <span className="brand-title">Juicy Match</span>}
        </a>
        <button
          type="button"
          className="rail-collapse-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="sidebar" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="nav-menu">
        {mainNav.map((item) => {
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-icon-wrap">
                <Icon name={item.icon} />
              </span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="rail-bottom">
        {/* Free Plan Upgrade Card */}
        <div
          className="plan-card"
          onClick={() => navigate("membership")}
          role="button"
          tabIndex="0"
          aria-label="Membership plans"
          title={isCollapsed ? planName : undefined}
        >
          <div className="plan-card-header">
            <span className="plan-badge">
              <span className="spark-symbol">✦</span> {isCollapsed ? "VIP" : planBadge}
            </span>
            {!isCollapsed && <span className="plan-arrow">↗</span>}
          </div>
          {!isCollapsed && <div className="plan-title">{planName}</div>}
          {!isCollapsed && <div className="plan-subtitle">{planSubtitle}</div>}
        </div>

        {/* Member Footer */}
        <div
          className="member-footer"
          onClick={() => navigate("profile")}
          role="button"
          tabIndex="0"
          title={isCollapsed ? pseudonym : undefined}
        >
          <Avatar profile={state?.me?.profile} className="member-avatar" />
          {!isCollapsed && (
            <div className="member-info">
              <div className="member-name">{pseudonym}</div>
              <div className="member-desc">Your private space</div>
            </div>
          )}
          <div className="member-footer-actions">
            <button
              type="button"
              className="member-theme-btn"
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
