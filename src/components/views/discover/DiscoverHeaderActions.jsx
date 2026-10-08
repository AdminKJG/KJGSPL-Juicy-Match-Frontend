import React from "react";
import Icon from "../../common/Icon";
import { title } from "../../../utils/formatters";

export default function DiscoverHeaderActions({
  navigate,
  isCategoryOpen,
  setIsCategoryOpen,
  activeFilter,
  setActiveFilter,
  categoryList,
  dropdownRef,
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="hidden sm:flex items-center gap-2 h-[42px] px-4 rounded-full bg-transparent border border-white/10 text-muted hover:bg-white/5 hover:text-white transition-colors font-semibold text-[0.9rem]"
        onClick={() => navigate("profile")}
      >
        <Icon name="tune" className="w-[18px] h-[18px]" /> Preferences
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`flex items-center gap-2 h-[42px] px-4 rounded-full border transition-colors font-semibold text-[0.9rem] ${
            isCategoryOpen || (activeFilter !== "all" && activeFilter !== "liked" && activeFilter !== "saved")
              ? "bg-pink/10 border-pink/30 text-pink"
              : "bg-transparent border-white/10 text-muted hover:bg-white/5 hover:text-white"
          }`}
          onClick={() => setIsCategoryOpen((prev) => !prev)}
          aria-haspopup="true"
          aria-expanded={isCategoryOpen}
        >
          <Icon name="category" className="w-[18px] h-[18px]" />
          <span className="max-w-[120px] whitespace-nowrap overflow-hidden text-ellipsis">
            {activeFilter === "all"
              ? "Category"
              : activeFilter === "liked"
              ? "Liked"
              : activeFilter === "saved"
              ? "Saved"
              : categoryList.find((c) => c.id === activeFilter)?.label || title(activeFilter)}
          </span>
          <Icon
            name="chevronDown"
            className={`w-[14px] h-[14px] transition-transform duration-200 ${isCategoryOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isCategoryOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-surface border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden" role="menu">
            <div className="px-4 py-3 border-b border-white/10 text-[0.74rem] font-semibold text-muted uppercase tracking-wider">
              Browse categories
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2 flex flex-col gap-1">
              {categoryList.map((cat) => {
                const isSelected = activeFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-pink/15 text-pink font-semibold"
                        : "bg-transparent text-cream hover:bg-white/5"
                    }`}
                    onClick={() => {
                      setActiveFilter(cat.id);
                      setIsCategoryOpen(false);
                    }}
                    role="menuitem"
                  >
                    <span>{cat.label}</span>
                    {isSelected && <Icon name="check" className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
