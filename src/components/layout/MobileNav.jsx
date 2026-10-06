import React from "react";
import Icon from "../common/Icon";
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

export default function MobileNav() {
  const { activeRoute, navigate } = useApp();

  const currentTab = activeRoute.split("/")[0];
  const activeNavId =
    currentTab === "chat"
      ? "messages"
      : ["passport", "events", "desires"].includes(currentTab)
      ? "explore"
      : ["privacy", "album", "membership"].includes(currentTab)
      ? "profile"
      : currentTab;

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {mainNav.map((item) => {
        const isActive = activeNavId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={isActive ? "active" : ""}
            onClick={() => navigate(item.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
