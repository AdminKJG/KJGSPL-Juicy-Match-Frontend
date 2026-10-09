import React from "react";
import Icon from "../common/Icon";
import Avatar from "../common/Avatar";
import { useApp } from "../../context/AppContext";
import { title } from "../../utils/formatters";

import WalletBadge from "./WalletBadge";

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
  const plan = title(state?.subscription?.name || state?.subscription?.planKey || state?.entitlement?.plan || "free");
  const notificationsCount = state?.notifications?.filter((n) => !n.read).length || 47;

  return (
    <header className="sticky top-0 z-40 h-[72px] bg-night/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6">
      <div className="flex items-center flex-1" />

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dual-Credit Wallet Badge */}
        <WalletBadge />
        {/* AI Assistant Button */}
        <button
          type="button"
          className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-200 hover:bg-amber-500/20 transition-all text-sm font-semibold"
          onClick={() => navigate("assist")}
          title="AI Coach & Match Guidance"
        >
          <Icon name="sparkle" className="w-4 h-4 text-amber-400" />
          <span>AI Coach</span>
        </button>

        {/* Notifications Trigger */}
        <button
          type="button"
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-muted hover:bg-white/10 hover:text-white transition-all"
          onClick={() => navigate("notifications")}
          title="Notifications"
        >
          <Icon name="bell" className="w-5 h-5" />
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-pink text-white text-[10px] font-bold rounded-full shadow-[0_2px_4px_rgba(233,22,113,0.4)] border-2 border-night">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div
          className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all select-none"
          onClick={() => navigate("profile")}
          role="button"
          tabIndex="0"
          title="View Your Profile"
        >
          <Avatar profile={state?.me?.profile} className="w-8 h-8 rounded-full bg-pink text-white flex items-center justify-center font-bold text-sm shadow-sm" />
          <div className="hidden lg:flex flex-col">
            <span className="text-[0.9rem] font-bold text-white leading-tight">{pseudonym}</span>
            <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-pink mt-0.5">✦ {plan}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
