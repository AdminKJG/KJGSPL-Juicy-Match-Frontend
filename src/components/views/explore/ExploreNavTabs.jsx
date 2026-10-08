import React from "react";
import Icon from "../../common/Icon";

export default function ExploreNavTabs({ activeTab, setActiveTab, zonesCount, eventsCount }) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
      <button
        type="button"
        className={`flex items-center gap-2.5 px-5 py-3 rounded-full font-semibold transition-all duration-200 border ${
          activeTab === "areas"
            ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(225,29,72,0.35)]"
            : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"
        }`}
        onClick={() => setActiveTab("areas")}
      >
        <Icon name="compass" className={`w-4 h-4 ${activeTab === "areas" ? "text-white" : "text-muted"}`} />
        <span>Areas</span>
        <span className={`text-[0.75rem] px-2 py-0.5 rounded-full ${activeTab === "areas" ? "bg-white/20 text-white" : "bg-white/10 text-muted"}`}>
          {zonesCount}
        </span>
      </button>

      <button
        type="button"
        className={`flex items-center gap-2.5 px-5 py-3 rounded-full font-semibold transition-all duration-200 border ${
          activeTab === "events"
            ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(225,29,72,0.35)]"
            : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"
        }`}
        onClick={() => setActiveTab("events")}
      >
        <Icon name="arrow" className={`w-4 h-4 ${activeTab === "events" ? "text-white" : "text-muted"}`} />
        <span>Events</span>
        <span className={`text-[0.75rem] px-2 py-0.5 rounded-full ${activeTab === "events" ? "bg-white/20 text-white" : "bg-white/10 text-muted"}`}>
          {eventsCount}
        </span>
      </button>

      <button
        type="button"
        className={`flex items-center gap-2.5 px-5 py-3 rounded-full font-semibold transition-all duration-200 border ${
          activeTab === "live"
            ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(225,29,72,0.35)]"
            : "bg-surface border-white/5 text-muted hover:bg-white/5 hover:text-white"
        }`}
        onClick={() => setActiveTab("live")}
      >
        <span className="relative flex h-3 w-3">
          {activeTab === "live" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${activeTab === "live" ? "bg-white" : "bg-pink"}`}></span>
        </span>
        <span>Live</span>
      </button>
    </div>
  );
}
