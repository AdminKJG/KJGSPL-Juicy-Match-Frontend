import React from "react";
import Icon from "../../common/Icon";
import { title } from "../../../utils/formatters";

export default function SettingsNotifications({ settings, setSettings }) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-green/15 text-green flex items-center justify-center shrink-0 border border-green/30 shadow-inner">
          <Icon name="bell" className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Notification Channels</h2>
          <p className="text-cream text-[0.95rem] leading-relaxed m-0">
            Select the channels where you wish to receive updates and alerts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Object.entries(settings.channels).map(([k, v]) => {
          const channelDetails = {
            inApp: {
              title: "In-App Inbox & Realtime Alerts",
              desc: "Instant badges and in-app message notifications",
              icon: "chat",
            },
            email: {
              title: "Email Dispatch & Digests",
              desc: "Curated connection summaries sent to your registered email",
              icon: "sparkle",
            },
            push: {
              title: "Mobile / Desktop Browser Push",
              desc: "Direct push banners on incoming mutual calls & matches",
              icon: "bell",
            },
            whatsapp: {
              title: "WhatsApp Security & Event Alerts",
              desc: "Exclusive event verification and time-sensitive reminders",
              icon: "chat",
            },
          }[k] || { title: title(k), desc: `Manage ${k} delivery`, icon: "bell" };

          return (
            <div
              key={k}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
                v ? "bg-white/10 border-white/20 shadow-md" : "bg-white/5 border-white/5 hover:bg-white/10"
              }`}
              onClick={() =>
                setSettings({
                  ...settings,
                  channels: { ...settings.channels, [k]: !v },
                })
              }
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${v ? "bg-green text-surface shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-black/40 text-muted"}`}>
                <Icon name={channelDetails.icon} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-[0.95rem] mb-1">{channelDetails.title}</div>
                <div className="text-muted text-[0.8rem] leading-snug">{channelDetails.desc}</div>
              </div>
              <div className="shrink-0 relative">
                <div className={`w-12 h-6 rounded-full transition-colors ${v ? "bg-green" : "bg-black/50 border border-white/20"}`}>
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${v ? "translate-x-6" : ""}`}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-white/10">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1">Notification Categories</h3>
          <p className="text-muted text-[0.9rem] m-0">Customize the specific types of activity that trigger notifications.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(settings.categories)
            .filter(([k]) => k !== "messages")
            .map(([k, v]) => {
              const categoryInfo = {
                connections: {
                  title: "Connections & Mutual Sparks",
                  desc: "Alerts when someone mutually matches or likes your profile",
                  icon: "heart",
                },
                travel: {
                  title: "Passport & Travel Mode",
                  desc: "Destination matches, overlapping trips, and city invites",
                  icon: "compass",
                },
                billing: {
                  title: "Membership & Invoices",
                  desc: "Subscription renewal, payment receipts, and boost credits",
                  icon: "discover",
                },
                security: {
                  title: "Security & Device Alerts",
                  desc: "New logins, password updates, and session verifications",
                  icon: "shield",
                },
                marketing: {
                  title: "Announcements & Special Offers",
                  desc: "New feature releases, product tips, and seasonal perks",
                  icon: "sparkle",
                },
              }[k] || { title: title(k), desc: `Receive alerts for ${k}`, icon: "bell" };

              return (
                <div
                  key={k}
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
                    v ? "bg-white/10 border-white/20 shadow-md" : "bg-white/5 border-white/5 hover:bg-white/10"
                  }`}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      categories: { ...settings.categories, [k]: !v },
                    })
                  }
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${v ? "bg-pink text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]" : "bg-black/40 text-muted"}`}>
                    <Icon name={categoryInfo.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-[0.95rem] mb-1">{categoryInfo.title}</div>
                    <div className="text-muted text-[0.8rem] leading-snug">{categoryInfo.desc}</div>
                  </div>
                  <div className="shrink-0 relative">
                    <div className={`w-12 h-6 rounded-full transition-colors ${v ? "bg-pink" : "bg-black/50 border border-white/20"}`}>
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${v ? "translate-x-6" : ""}`}></div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
