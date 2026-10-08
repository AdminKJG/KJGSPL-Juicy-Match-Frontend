import React from "react";
import Icon from "../../common/Icon";

export default function SettingsSidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "all", label: "All Settings", icon: "settings" },
    { id: "desires", label: "Intimacy & Desires", icon: "heart" },
    { id: "passport", label: "Passport & Travel", icon: "plane" },
    { id: "appearance", label: "Appearance & Sound", icon: "sparkle" },
    { id: "schedule", label: "Quiet Hours", icon: "compass" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    { id: "security", label: "Security & Password", icon: "lock" },
    { id: "account", label: "Account Management", icon: "user" },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar pb-4 md:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-pink/15 text-pink border border-pink/30 shadow-inner"
                : "bg-transparent text-muted hover:bg-white/5 hover:text-white border border-transparent"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} className={`w-5 h-5 ${activeTab === tab.id ? "text-pink" : "text-muted"}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
