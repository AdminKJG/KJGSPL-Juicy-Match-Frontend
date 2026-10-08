import React from "react";

export default function DiscoverFilterBar({ primaryFilterTabs, activeFilter, setActiveFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-3 my-6 pb-2 border-b border-white/5" aria-label="Filter today’s introductions">
      {primaryFilterTabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-[0.92rem]
              transition-all duration-200 border
              ${isActive 
                ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(225,29,72,0.35)]" 
                : "bg-surface border-white/10 text-muted hover:bg-white/5 hover:border-white/20"}
            `}
            aria-pressed={isActive}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`
                flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[0.7rem]
                ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-cream"}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
