import React from "react";
import Icon from "../../common/Icon";

export default function SettingsPassport({ navigate }) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#a855f7]/15 text-[#a855f7] flex items-center justify-center shrink-0 border border-[#a855f7]/30 shadow-inner">
          <Icon name="plane" className="w-6 h-6" />
        </div>
        <div>
          <div className="text-[0.72rem] font-extrabold uppercase tracking-widest text-[#a855f7] mb-1">
            A CHANGE OF SCENERY · OVERLAPPING VISITS
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Possibility has a Passport.</h2>
          <p className="text-cream text-[0.95rem] leading-relaxed">
            Choose a destination city and plan trips in advance. Connect with fellow travelers visiting at the same time while keeping your location private.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/5 border border-[#a855f7]/25 p-6 rounded-2xl">
        <p className="text-cream text-[0.9rem] leading-relaxed max-w-xl m-0">
          Explore global interactive world maps, schedule travel itineraries, view overlapping city visits with sparks, and maintain total privacy of your live GPS coordinates.
        </p>
        <button
          type="button"
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#c084fc] hover:to-[#f472b6] text-white font-bold py-3 px-6 rounded-xl transition-transform hover:-translate-y-0.5 shadow-lg shadow-[#a855f7]/30 shrink-0 whitespace-nowrap"
          onClick={() => navigate("passport")}
        >
          <span>Open Passport</span>
          <Icon name="plane" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
