import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import Avatar from "../common/Avatar";
import { useApp } from "../../context/AppContext";
import { normalizePlanKey, getPlanBadge } from "../../utils/planUtils";

const mainNav = [
  { id: "discover", label: "Discover", icon: "discover" },
  { id: "connections", label: "Connections", icon: "heart" },
  { id: "explore", label: "Explore", icon: "compass" },
  { id: "passport", label: "Passport", icon: "plane" },
  { id: "messages", label: "Messages", icon: "chat" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "membership", label: "Subscription", icon: "crown" },
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      : ["events", "desires"].includes(currentTab)
        ? "explore"
        : ["privacy", "album"].includes(currentTab)
          ? "profile"
          : currentTab;

  const pseudonym = state?.me?.profile?.pseudonym || "Member";
  const planRaw = state?.subscription?.planKey || state?.subscription?.plan || state?.subscription?.name || state?.entitlement?.plan || "explore";
  const activePlanKey = normalizePlanKey(planRaw);
  const isPremium = activePlanKey === "premium";
  const isConnect = activePlanKey === "connect";
  const planBadge = getPlanBadge(activePlanKey);

  const notificationsCount =
    typeof state?.unreadNotificationCount === "number"
      ? state.unreadNotificationCount
      : Array.isArray(state?.notifications)
      ? state.notifications.filter((n) => !n.read_at && !n.read).length
      : 0;

  return (
    <aside className={`sticky top-0 h-screen m-0 flex flex-col bg-gradient-to-b from-[#1e0d26] to-[#120718] border-r border-white/10 rounded-r-[32px] shadow-[12px_0_40px_rgba(0,0,0,0.42),0_0_0_1px_rgba(244,63,94,0.06)] backdrop-blur-xl z-50 overflow-y-auto no-scrollbar transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? "w-[76px] px-2 py-5 rounded-r-[20px] items-center" : "w-[240px] pt-6 pb-5 pl-5 pr-5"}`}>
      <div className={`flex items-center justify-between gap-2 mb-6 ${isCollapsed ? "flex-col w-full !mb-5" : ""}`}>
        <a
          className={`flex items-center gap-3 font-serif text-[1.4rem] font-bold text-white no-underline px-1.5 py-1 m-0 ${isCollapsed ? "justify-center p-0" : ""}`}
          href="/discover"
          onClick={(e) => {
            e.preventDefault();
            navigate("discover");
          }}
          title="Juicy Match Home"
        >
          <img src="/assets/logo.jpg" alt="Juicy Match" className={`rounded-xl object-cover shadow-[0_4px_16px_rgba(225,29,72,0.35)] shrink-0 transition-transform duration-200 hover:scale-105 ${isCollapsed ? "w-9 h-9" : "w-11 h-11"}`} />
          {!isCollapsed && <span className="font-serif font-bold text-[1.2rem] text-white tracking-tight whitespace-nowrap">Juicy Match</span>}
        </a>
        <button
          type="button"
          className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg cursor-pointer transition-all duration-200 ${
            isCollapsed
              ? "mt-2 bg-[#e91671]/20 border border-[#e91671]/50 text-[#ff70a6] hover:bg-[#e91671] hover:text-white shadow-[0_0_12px_rgba(233,22,113,0.3)]"
              : "bg-white/10 border border-white/15 text-white/85 hover:text-white hover:bg-[#e91671]/25 hover:border-[#e91671]/50"
          }`}
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex flex-col gap-2">
        {mainNav.map((item) => {
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`relative flex items-center gap-3.5 h-[50px] px-4.5 rounded-2xl text-[1.02rem] font-semibold bg-transparent border-none cursor-pointer w-full text-left transition-all duration-200 select-none ${isCollapsed ? "justify-center px-0 w-11 h-11 rounded-[14px]" : ""} ${isActive ? "bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white shadow-[0_6px_20px_rgba(225,29,72,0.4)]" : "text-[#a595a8] hover:bg-white/5 hover:text-white"}`}
              onClick={() => navigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="flex items-center justify-center w-6 h-6 shrink-0 relative">
                <Icon name={item.icon} className={`w-[21px] h-[21px] stroke-[2] transition-transform duration-150 group-hover:scale-105 ${isActive ? "stroke-white stroke-[2.2]" : "stroke-currentColor"}`} />
                {isCollapsed && item.id === "notifications" && notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-pink border-2 border-[#1e0d26]" />
                )}
              </span>
              {!isCollapsed && <span className="flex items-center flex-1 leading-none tracking-tight">{item.label}</span>}
              {!isCollapsed && item.id === "notifications" && notificationsCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink text-white shrink-0 shadow-[0_2px_8px_rgba(233,22,113,0.4)]">
                  {notificationsCount > 99 ? "99+" : notificationsCount}
                </span>
              )}
              {!isCollapsed && Boolean(planBadge) && item.id === "membership" && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  isActive 
                    ? "bg-white/20 text-white" 
                    : isPremium 
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                }`}>
                  {planBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 flex flex-col gap-3">

        {/* Member Footer */}
        <div
          className={`flex items-center gap-3.5 p-2 rounded-2xl cursor-pointer transition-colors duration-150 hover:bg-white/5 ${isCollapsed ? "justify-center flex-col gap-1.5 w-full" : ""}`}
          onClick={() => navigate("profile")}
          role="button"
          tabIndex="0"
          title={isCollapsed ? pseudonym : undefined}
        >
          <Avatar profile={state?.me?.profile} className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white grid place-items-center font-serif font-bold text-[1.25rem] shrink-0 shadow-[0_4px_14px_rgba(225,29,72,0.35)] overflow-hidden relative" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="text-white font-bold text-[1.02rem] whitespace-nowrap overflow-hidden text-ellipsis leading-tight">{pseudonym}</div>
              <div className="text-[#8c7b8e] text-[0.82rem] whitespace-nowrap overflow-hidden text-ellipsis mt-[3px] leading-tight">Your private space</div>
            </div>
          )}
          <div className={`flex items-center gap-1.5 ${isCollapsed ? "flex-col" : ""}`}>
            <button
              type="button"
              className="w-[38px] h-[38px] rounded-full bg-[#1c0e20] border border-white/10 grid place-items-center cursor-pointer p-0 text-[#ff9ec7] shrink-0 transition-all duration-200 hover:bg-pink/15 hover:border-pink/40 hover:text-white hover:rotate-15 hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" className="w-[19px] h-[19px] stroke-currentColor stroke-[2.2]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
