import React from "react";
import Icon from "../../common/Icon";

export default function SettingsSchedule({ settings, setSettings, zones }) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-lilac/15 text-lilac flex items-center justify-center shrink-0 border border-lilac/30 shadow-inner">
          <Icon name="compass" className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Quiet Hours & Schedule</h2>
          <p className="text-cream text-[0.95rem] leading-relaxed m-0">
            Set your local timezone, quiet hours, and automated delivery cadence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
        <div className="flex flex-col gap-2">
          <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider flex justify-between">
            <span>Your Timezone</span>
            <span className="font-normal normal-case text-muted/70">Local standard</span>
          </label>
          <div className="relative">
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none focus:outline-none focus:border-pink transition-colors cursor-pointer"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            >
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <Icon name="chevronDown" className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider flex justify-between">
            <span>Notification Frequency</span>
            <span className="font-normal normal-case text-muted/70">Delivery mode</span>
          </label>
          <div className="relative">
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none focus:outline-none focus:border-pink transition-colors cursor-pointer"
              value={settings.frequency}
              onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}
            >
              <option value="instant">Instant Realtime Delivery</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Summary</option>
              <option value="off">Mute Non-Essential</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <Icon name="chevronDown" className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider flex justify-between">
            <span>Quiet Hours Start</span>
            <span className="font-normal normal-case text-muted/70">24h format</span>
          </label>
          <input
            type="number"
            min="0"
            max="23"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-pink transition-colors"
            value={settings.quietStart}
            onChange={(e) => setSettings({ ...settings, quietStart: Number(e.target.value) })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider flex justify-between">
            <span>Quiet Hours End</span>
            <span className="font-normal normal-case text-muted/70">24h format</span>
          </label>
          <input
            type="number"
            min="0"
            max="23"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-pink transition-colors"
            value={settings.quietEnd}
            onChange={(e) => setSettings({ ...settings, quietEnd: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
