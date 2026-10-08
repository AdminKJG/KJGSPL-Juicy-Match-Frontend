import React from "react";
import Icon from "../../common/Icon";

export default function DiscoverDetailsAside({
  currentProfile,
  navigate,
  handleSafetyReport,
}) {
  return (
    <aside className="flex flex-col gap-5 w-full md:w-[320px] lg:w-[360px] flex-shrink-0">
      {/* World / Bio Card */}
      <div className="bg-surface rounded-2xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[0.71rem] font-semibold tracking-[0.19em] uppercase text-lilac">
          <span className="w-2 h-2 rounded-full bg-lilac/70" />
          <span>A Glimpse of Their World</span>
        </div>
        <blockquote className="m-0 text-[1.1rem] leading-relaxed font-serif italic text-cream border-l-2 border-pink/30 pl-4 py-1">
          “{currentProfile.bio || "There’s a story here. Start with a hello."}”
        </blockquote>
      </div>

      {/* Alignment / Shared Chemistry Card */}
      <div className="bg-surface rounded-2xl p-6 border border-white/5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[0.71rem] font-semibold tracking-[0.19em] uppercase text-[#14b8a6]">
          <span className="w-2 h-2 rounded-full bg-[#14b8a6]/70 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
          <span>The Little Things That Align</span>
        </div>
        <div className="flex flex-col gap-3">
          {currentProfile.reasons && currentProfile.reasons.length > 0 ? (
            currentProfile.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-[#14b8a6] flex-shrink-0">
                  <Icon name="sparkle" className="w-[15px] h-[15px]" />
                </span>
                <span className="text-sm text-muted leading-snug pt-0.5">{reason}</span>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-[#14b8a6] flex-shrink-0">
                <Icon name="sparkle" className="w-[15px] h-[15px]" />
              </span>
              <span className="text-sm text-muted leading-snug pt-0.5">
                Shared interests: {(currentProfile.interests || ["music", "travel", "art"]).slice(0, 4).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Boundaries & Safety Card */}
      <div className="bg-surface rounded-2xl p-5 border border-white/5 shadow-lg flex flex-col gap-4">
        <div>
          <h4 className="m-0 text-[1.05rem] font-semibold text-white mb-1.5">Curiosity, with boundaries.</h4>
          <p className="m-0 text-sm text-muted">A like opens possibility. Chat begins only when you both agree.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 border border-white/10 text-muted hover:text-white rounded-lg py-2.5 px-3 text-[0.82rem] font-semibold transition-all"
            onClick={() => navigate("desires")}
          >
            <Icon name="compass" className="w-4 h-4" /> Explore desires
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-[#4a1321] border border-white/10 hover:border-[#79253c] text-muted hover:text-[#ffa7ba] rounded-lg py-2.5 px-3 text-[0.82rem] font-semibold transition-all"
            onClick={() => handleSafetyReport(currentProfile)}
          >
            <Icon name="shield" className="w-4 h-4" /> Safety & report
          </button>
        </div>
      </div>
    </aside>
  );
}
