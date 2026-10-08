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
      : ["events", "desires"].includes(currentTab)
      ? "explore"
      : ["privacy", "album", "membership"].includes(currentTab)
      ? "profile"
      : currentTab;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-[#120d16]/95 backdrop-blur-xl border-t border-white/10 flex md:hidden items-center justify-around px-2 z-50 pb-[env(safe-area-inset-bottom)]" aria-label="Mobile navigation">
      {mainNav.map((item) => {
        const isActive = activeNavId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`flex flex-col items-center justify-center gap-1 min-w-[56px] h-full transition-all duration-200 ${isActive ? "text-pink" : "text-[#a595a8] hover:text-white"}`}
            onClick={() => navigate(item.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={item.icon} className={`w-6 h-6 ${isActive ? "scale-110" : ""}`} />
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
