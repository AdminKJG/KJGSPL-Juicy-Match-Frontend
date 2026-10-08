import React from "react";
import Icon from "../../common/Icon";

export default function SettingsAppearance({ settings, setSettings }) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-pink/15 text-pink flex items-center justify-center shrink-0 border border-pink/30 shadow-inner">
          <Icon name="sparkle" className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Appearance & Sound Effects</h2>
          <p className="text-cream text-[0.95rem] leading-relaxed m-0">
            Customize audio feedback and visual motion effects across the application.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sound Toggle */}
        <div
          className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
            settings.sound ? "bg-white/10 border-white/20 shadow-md" : "bg-white/5 border-white/5 hover:bg-white/10"
          }`}
          onClick={() => setSettings({ ...settings, sound: !settings.sound })}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${settings.sound ? "bg-pink text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]" : "bg-black/40 text-muted"}`}>
            <Icon name="sparkle" className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-[0.95rem] mb-1">Subtle Sound Effects</div>
            <div className="text-muted text-[0.8rem] leading-snug">Play acoustic chimes on likes, mutual matches, and outgoing messages</div>
          </div>
          <div className="shrink-0 relative">
             <div className={`w-12 h-6 rounded-full transition-colors ${settings.sound ? "bg-pink" : "bg-black/50 border border-white/20"}`}>
               <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.sound ? "translate-x-6" : ""}`}></div>
             </div>
          </div>
        </div>

        {/* Reduced Motion Toggle */}
        <div
          className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
            settings.reducedMotion ? "bg-white/10 border-white/20 shadow-md" : "bg-white/5 border-white/5 hover:bg-white/10"
          }`}
          onClick={() => setSettings({ ...settings, reducedMotion: !settings.reducedMotion })}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${settings.reducedMotion ? "bg-pink text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]" : "bg-black/40 text-muted"}`}>
            <Icon name="compass" className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-[0.95rem] mb-1">Reduce Movement & Animations</div>
            <div className="text-muted text-[0.8rem] leading-snug">Minimize motion transitions and glowing aura effects for a quieter view</div>
          </div>
          <div className="shrink-0 relative">
             <div className={`w-12 h-6 rounded-full transition-colors ${settings.reducedMotion ? "bg-pink" : "bg-black/50 border border-white/20"}`}>
               <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.reducedMotion ? "translate-x-6" : ""}`}></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
