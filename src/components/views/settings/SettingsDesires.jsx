import React from "react";
import Icon from "../../common/Icon";

export default function SettingsDesires({ navigate }) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-pink/15 text-pink flex items-center justify-center shrink-0 border border-pink/30 shadow-inner">
          <Icon name="heart" className="w-6 h-6" />
        </div>
        <div>
          <div className="text-[0.72rem] font-extrabold uppercase tracking-widest text-pink mb-1">
            GET TO KNOW YOURSELF · CONFIDENTIAL QUIZ
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">What draws you in?</h2>
          <p className="text-cream text-[0.95rem] leading-relaxed">
            Explore your intimacy, pace, and romantic preferences. Your choices help craft deeper compatibility with mutual sparks.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/5 border border-pink/20 p-6 rounded-2xl">
        <p className="text-cream text-[0.9rem] leading-relaxed max-w-xl m-0">
          Answer curated questions regarding attraction chemistry, dating pace, and first date atmospheres. Your responses remain confidential and help match you with truly compatible connections.
        </p>
        <button
          type="button"
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-pink hover:bg-[#ff2a85] text-white font-bold py-3 px-6 rounded-xl transition-transform hover:-translate-y-0.5 shadow-lg shadow-pink/30 shrink-0 whitespace-nowrap"
          onClick={() => navigate("desires")}
        >
          <span>Explore desires</span>
          <Icon name="arrow" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
