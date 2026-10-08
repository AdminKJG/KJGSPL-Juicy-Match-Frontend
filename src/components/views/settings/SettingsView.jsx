import React, { useState, useEffect } from "react";
import PageHead from "../../common/PageHead";
import Icon from "../../common/Icon";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { profileService } from "../../../services/profileService";
import { authService } from "../../../services/authService";
import { preferenceService } from "../../../services/preferenceService";

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-[50px] h-[28px] rounded-full border-2 transition-all duration-300 shrink-0 focus:outline-none ${
        value ? "bg-pink border-pink" : "bg-white/10 border-white/20"
      }`}
    >
      <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-all duration-300 ${value ? "left-[25px]" : "left-[3px]"}`} />
    </button>
  );
}

function SettingsCard({ icon, iconColor, iconBg, kicker, title: cardTitle, description, children, danger }) {
  return (
    <div className={`bg-[#1a0d20] rounded-3xl border p-6 lg:p-8 flex flex-col gap-6 shadow-xl ${danger ? "border-red-500/25" : "border-white/[0.08]"}`}>
      <div className="flex items-start gap-5 pb-5 border-b border-white/[0.08]">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconColor} ${iconBg} border border-white/10`}>
          <Icon name={icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {kicker && <div className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-pink mb-1">{kicker}</div>}
          <h2 className="text-[1.2rem] font-serif font-bold text-white m-0 leading-tight">{cardTitle}</h2>
          {description && <p className="text-[0.88rem] text-muted mt-1 m-0 leading-relaxed">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ icon, title: rowTitle, desc, value, onChange }) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all select-none ${
        value ? "border-pink/30 bg-pink/5" : "border-white/[0.08] bg-black/20 hover:border-white/20 hover:bg-white/[0.03]"
      }`}
      onClick={() => onChange(!value)}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
        value ? "bg-pink/20 text-pink border-pink/30" : "bg-white/5 text-muted border-white/10"
      }`}>
        <Icon name={icon} className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.95rem] font-semibold text-white">{rowTitle}</div>
        <div className="text-[0.8rem] text-muted mt-0.5 leading-snug">{desc}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

const NAV_ITEMS = [
  { id: "all",           label: "Overview",           icon: "settings"  },
  { id: "appearance",   label: "Appearance & Sound",  icon: "sparkle"   },
  { id: "schedule",     label: "Quiet Hours",         icon: "compass"   },
  { id: "notifications",label: "Notifications",       icon: "bell"      },
  { id: "security",     label: "Security & Password", icon: "lock"      },
  { id: "account",      label: "Account Management",  icon: "user"      },
];

export default function SettingsView() {
  const { state, updateSettings, deleteAccount, logout, showToast, navigate } = useApp();
  const p = state.prefs || {};

  const [activeTab, setActiveTab] = useState("all");
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    sound: p.sound ?? true,
    reducedMotion: p.reducedMotion ?? false,
    timezone: p.timezone || "UTC",
    frequency: p.frequency || "instant",
    quietStart: p.quietStart ?? 23,
    quietEnd: p.quietEnd ?? 8,
    channels: { inApp: true, email: true, push: true, whatsapp: false, ...p.channels },
    categories: { connections: true, messages: true, travel: true, billing: true, security: true, marketing: false, ...p.categories },
  });

  const toggleChannel = (key) => setSettings(prev => ({ ...prev, channels: { ...prev.channels, [key]: !prev.channels[key] } }));
  const toggleCategory = (key) => setSettings(prev => ({ ...prev, categories: { ...prev.categories, [key]: !prev.categories[key] } }));

  useEffect(() => {
    let mounted = true;
    preferenceService.getPreferences().then(remote => {
      if (mounted && remote) {
        setSettings(prev => ({
          ...prev, ...remote,
          channels: { ...prev.channels, ...remote.channels },
          categories: { ...prev.categories, ...remote.categories },
        }));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const defaultSessions = [{ id: "sess-current", device: "Current Web Browser (Windows)", current: true, lastActive: new Date().toISOString() }];
  const [sessions, setSessions] = useState(defaultSessions);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("Found someone");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const zones = ["UTC", "Asia/Dubai", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Kolkata"];

  useEffect(() => {
    let mounted = true;
    profileService.getSessions().then(res => {
      if (mounted && res?.items?.length > 0) setSessions(res.items);
    }).catch(() => {}).finally(() => { if (mounted) setLoadingSessions(false); });
    return () => { mounted = false; };
  }, []);

  const handleRevokeOthers = async () => {
    setRevoking(true);
    try {
      const res = await profileService.revokeOtherSessions();
      showToast(`Logged out from ${res.revokedCount || 0} other device(s).`);
      setSessions(prev => prev.filter(s => s.current));
    } catch (err) {
      showToast(err.message || "Failed to revoke sessions.");
    } finally { setRevoking(false); }
  };

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword || !newPassword) { showToast("Please enter both passwords."); return; }
    if (newPassword.length < 8) { showToast("New password must be at least 8 characters."); return; }
    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast("Password updated! 🔒");
      setCurrentPassword(""); setNewPassword("");
    } catch (err) { showToast(err.message || "Failed to change password."); }
    finally { setIsChangingPassword(false); }
  };

  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    if (!confirmDelete) return;
    setIsDeleting(true);
    try { await deleteAccount(deleteReason); }
    catch (err) { showToast(err.message || "Failed to delete account."); setIsDeleting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    updateSettings(settings);
    try {
      await preferenceService.updatePreferences(settings);
      showToast("Preferences saved! ✨");
    } catch { showToast("Saved locally. ✨"); }
    finally { setSaving(false); }
  };

  const show = (tab) => activeTab === "all" || activeTab === tab;

  const SessionRow = ({ sess }) => (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${sess.current ? "border-pink/30 bg-pink/5" : "border-white/[0.08] bg-black/20"}`}>
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted shrink-0">
        <Icon name="user" className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.9rem] font-semibold text-white truncate">{sess.device || "Web Browser"}</div>
        <div className="text-[0.78rem] text-muted">
          {sess.current ? "Active now · Verified" : `Last seen: ${sess.lastActive ? new Date(sess.lastActive).toLocaleString() : "Recently"}`}
        </div>
      </div>
      <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${
        sess.current ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-muted bg-white/5 border border-white/[0.08]"
      }`}>
        {sess.current ? "Active" : "Other"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <PageHead
        showBack backTo="profile" backLabel="Back to Profile"
        kicker="Settings & Preferences"
        heading="Account Settings"
        description="Manage display preferences, notification channels, security credentials, and active devices."
        action={
          <button type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors text-sm font-semibold border border-white/10"
            onClick={() => navigate("assist")}
          >
            <Icon name="sparkle" className="w-4 h-4 text-amber-400" />
            <span>AI Optimizer</span>
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start mt-8">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-60 flex-shrink-0 lg:sticky lg:top-24 flex flex-col gap-3">
          <div className="bg-[#1a0d20] rounded-2xl border border-white/[0.08] p-2 flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[0.92rem] font-semibold transition-all w-full text-left ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-pink to-[#e11d48] text-white shadow-lg shadow-pink/25"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => navigate("notifications")}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[0.88rem] font-semibold text-muted hover:text-white hover:bg-white/5 transition-all border border-white/[0.08] bg-[#1a0d20]"
            >
              <Icon name="bell" className="w-4 h-4" /> Notification Inbox
            </button>
            <button type="button" onClick={() => navigate("privacy")}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[0.88rem] font-semibold text-muted hover:text-white hover:bg-white/5 transition-all border border-white/[0.08] bg-[#1a0d20]"
            >
              <Icon name="shield" className="w-4 h-4" /> Privacy & Consent
            </button>
          </div>
        </aside>

        {/* Right Content */}
        <main className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Overview Quick Cards */}
            {activeTab === "all" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "desires", icon: "heart", label: "Intimacy & Desires", sub: "Private compatibility quiz", color: "from-pink/15 to-rose-600/10", border: "border-pink/20 hover:border-pink/40", ic: "bg-pink/20 text-pink" },
                  { id: "passport", icon: "plane", label: "Passport & Travel", sub: "Plan trips & meet travelers", color: "from-purple-500/15 to-indigo-600/10", border: "border-purple-500/20 hover:border-purple-400/40", ic: "bg-purple-500/20 text-purple-400" },
                ].map(({ id, icon, label, sub, color, border, ic }) => (
                  <button key={id} type="button" onClick={() => navigate(id)}
                    className={`flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br ${color} border ${border} transition-all text-left group`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${ic} flex items-center justify-center shrink-0`}>
                      <Icon name={icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-[0.95rem]">{label}</div>
                      <div className="text-muted text-[0.8rem] mt-0.5">{sub}</div>
                    </div>
                    <Icon name="arrow" className="w-4 h-4 text-muted ml-auto group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Appearance */}
            {show("appearance") && (
              <SettingsCard icon="sparkle" iconColor="text-rose-400" iconBg="bg-rose-500/10"
                title="Appearance & Sound" description="Customize audio feedback and visual motion effects.">
                <div className="flex flex-col gap-3">
                  <ToggleRow icon="sparkle" title="Subtle Sound Effects"
                    desc="Play acoustic chimes on likes, matches, and messages"
                    value={settings.sound}
                    onChange={(v) => setSettings(prev => ({ ...prev, sound: v }))} />
                  <ToggleRow icon="compass" title="Reduce Motion & Animations"
                    desc="Minimize transitions and glowing effects for a quieter view"
                    value={settings.reducedMotion}
                    onChange={(v) => setSettings(prev => ({ ...prev, reducedMotion: v }))} />
                </div>
              </SettingsCard>
            )}

            {/* Quiet Hours */}
            {show("schedule") && (
              <SettingsCard icon="compass" iconColor="text-indigo-400" iconBg="bg-indigo-500/10"
                title="Quiet Hours & Schedule" description="Set your timezone, quiet hours, and notification cadence.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[0.82rem] font-bold text-muted uppercase tracking-wide">Your Timezone</label>
                      <span className="text-[0.72rem] text-white/30">Local standard</span>
                    </div>
                    <div className="relative">
                      <select className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white appearance-none focus:outline-none focus:border-pink/60 transition-all"
                        value={settings.timezone} onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}>
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted"><Icon name="chevronDown" className="w-4 h-4" /></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[0.82rem] font-bold text-muted uppercase tracking-wide">Notification Frequency</label>
                      <span className="text-[0.72rem] text-white/30">Delivery mode</span>
                    </div>
                    <div className="relative">
                      <select className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white appearance-none focus:outline-none focus:border-pink/60 transition-all"
                        value={settings.frequency} onChange={(e) => setSettings(prev => ({ ...prev, frequency: e.target.value }))}>
                        <option value="instant">Instant Realtime</option>
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly Summary</option>
                        <option value="off">Mute Non-Essential</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted"><Icon name="chevronDown" className="w-4 h-4" /></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[0.82rem] font-bold text-muted uppercase tracking-wide">Quiet Hours Start</label>
                      <span className="text-[0.72rem] text-white/30">24h, e.g. 23 = 11 PM</span>
                    </div>
                    <input type="number" min="0" max="23" className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white focus:outline-none focus:border-pink/60 transition-all"
                      value={settings.quietStart} onChange={(e) => setSettings(prev => ({ ...prev, quietStart: Number(e.target.value) }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[0.82rem] font-bold text-muted uppercase tracking-wide">Quiet Hours End</label>
                      <span className="text-[0.72rem] text-white/30">24h, e.g. 8 = 8 AM</span>
                    </div>
                    <input type="number" min="0" max="23" className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white focus:outline-none focus:border-pink/60 transition-all"
                      value={settings.quietEnd} onChange={(e) => setSettings(prev => ({ ...prev, quietEnd: Number(e.target.value) }))} />
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* Notifications */}
            {show("notifications") && (
              <SettingsCard icon="bell" iconColor="text-emerald-400" iconBg="bg-emerald-500/10"
                title="Notification Channels" description="Choose where you want to receive updates and alerts.">
                <div className="flex flex-col gap-3">
                  {[
                    { key: "inApp", icon: "chat", title: "In-App Alerts", desc: "Real-time badges and floating notifications" },
                    { key: "email", icon: "sparkle", title: "Email Digests", desc: "Curated summaries to your registered email" },
                    { key: "push", icon: "bell", title: "Browser Push", desc: "Push banners for incoming calls and matches" },
                    { key: "whatsapp", icon: "chat", title: "WhatsApp Alerts", desc: "Event verification and time-sensitive reminders" },
                  ].map(({ key, icon, title: t, desc }) => (
                    <ToggleRow key={key} icon={icon} title={t} desc={desc}
                      value={settings.channels[key]} onChange={() => toggleChannel(key)} />
                  ))}

                  <div className="pt-5 mt-2 border-t border-white/[0.08]">
                    <div className="text-[0.95rem] font-bold text-white mb-1">Notification Categories</div>
                    <div className="text-[0.82rem] text-muted mb-4">Choose which activity types trigger alerts.</div>
                    <div className="flex flex-col gap-3">
                      {[
                        { key: "connections", icon: "heart", title: "Connections & Sparks", desc: "When someone matches or likes your profile" },
                        { key: "travel", icon: "compass", title: "Passport & Travel", desc: "Destination matches and overlapping trips" },
                        { key: "billing", icon: "discover", title: "Membership & Invoices", desc: "Subscription renewals and payment receipts" },
                        { key: "security", icon: "shield", title: "Security & Device Alerts", desc: "New logins, password changes, session alerts" },
                        { key: "marketing", icon: "sparkle", title: "Announcements & Offers", desc: "Feature releases, tips, and seasonal perks" },
                      ].map(({ key, icon, title: t, desc }) => (
                        <ToggleRow key={key} icon={icon} title={t} desc={desc}
                          value={settings.categories[key]} onChange={() => toggleCategory(key)} />
                      ))}
                    </div>
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* Active Sessions */}
            {show("security") && (
              <SettingsCard icon="discover" iconColor="text-amber-400" iconBg="bg-amber-500/10"
                title="Active Device Sessions" description="Browsers and devices currently logged into your account.">
                <div className="flex flex-col gap-3">
                  {loadingSessions ? <Loader text="Loading sessions…" size="small" /> : sessions.slice(0, 4).map(sess => <SessionRow key={sess.id} sess={sess} />)}
                </div>
                {sessions.length > 1 && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <button type="button" disabled={revoking} onClick={handleRevokeOthers}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white font-semibold text-[0.85rem] transition-all border border-white/10">
                      {revoking ? "Revoking…" : "Revoke Other Devices"}
                    </button>
                    {sessions.length > 4 && (
                      <button type="button" onClick={() => setShowSessionsModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white font-semibold text-[0.85rem] transition-all border border-white/10">
                        View All ({sessions.length}) <Icon name="arrow" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </SettingsCard>
            )}

            {/* Password */}
            {show("security") && (
              <SettingsCard icon="lock" iconColor="text-emerald-400" iconBg="bg-emerald-500/10"
                title="Security & Password" description="Update your authentication credentials securely.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.82rem] font-bold text-muted uppercase tracking-wide">Current Password</label>
                    <div className="relative">
                      <input type={showCurrentPassword ? "text" : "password"}
                        className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 pr-11 text-white focus:outline-none focus:border-pink/60 transition-all placeholder-white/20"
                        value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" />
                      <button type="button" onClick={() => setShowCurrentPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-white transition-colors">
                        <Icon name={showCurrentPassword ? "eyeOff" : "eye"} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[0.82rem] font-bold text-muted uppercase tracking-wide">New Password</label>
                      <span className="text-[0.72rem] text-white/30">Min 8 characters</span>
                    </div>
                    <div className="relative">
                      <input type={showNewPassword ? "text" : "password"}
                        className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 pr-11 text-white focus:outline-none focus:border-pink/60 transition-all placeholder-white/20"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••••••" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowNewPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-white transition-colors">
                        <Icon name={showNewPassword ? "eyeOff" : "eye"} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={handleChangePasswordSubmit}
                  disabled={!currentPassword || !newPassword || isChangingPassword}
                  className="self-start flex items-center gap-2 h-11 px-6 rounded-xl bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] disabled:opacity-40 disabled:cursor-not-allowed">
                  <Icon name="lock" className="w-4 h-4" />
                  {isChangingPassword ? "Updating…" : "Update Password"}
                </button>
              </SettingsCard>
            )}

            {/* Account */}
            {show("account") && (
              <SettingsCard icon="user" iconColor="text-red-400" iconBg="bg-red-500/10"
                title="Account Management" description="Manage your session or permanently remove your account." danger>
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                  <Icon name="shield" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[0.85rem] text-red-200/80 m-0 leading-relaxed">
                    Closing your account permanently removes your identity, photo albums, and conversation history. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" onClick={logout}
                    className="flex items-center gap-2 h-11 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10">
                    <Icon name="logout" className="w-4 h-4" /> Sign Out
                  </button>
                  <button type="button" onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 h-11 px-6 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold transition-all border border-red-500/20">
                    <Icon name="close" className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </SettingsCard>
            )}

            {/* Save Bar */}
            <div className="sticky bottom-4 z-30 mt-2">
              <div className="flex items-center justify-between p-4 bg-[#1a0d20]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <p className="text-[0.82rem] text-muted m-0">Changes apply immediately after saving.</p>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 h-11 px-7 rounded-xl bg-pink hover:bg-[#ff2a85] text-white font-bold transition-all shadow-[0_4px_20px_rgba(233,22,113,0.4)] disabled:opacity-60">
                  <Icon name="check" className="w-4 h-4" />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
          <div className="bg-[#1c1028] border border-red-500/30 rounded-3xl p-7 w-full max-w-[500px] shadow-2xl flex flex-col gap-5 relative">
            <button type="button" onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors border border-white/10">
              <Icon name="close" className="w-4 h-4" />
            </button>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 mb-4">
                <Icon name="user" className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-red-300 m-0">Delete your account?</h2>
              <p className="text-muted text-[0.88rem] mt-2 m-0 leading-relaxed">
                Your profile, connections, and all data will be permanently erased.
              </p>
            </div>
            <form onSubmit={handleDeleteAccountSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-bold text-muted uppercase tracking-wide">Reason for leaving</label>
                <div className="relative">
                  <select className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white appearance-none focus:outline-none transition-all"
                    value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}>
                    <option value="Found someone">Found someone</option>
                    <option value="Taking a break">Taking a break</option>
                    <option value="Privacy preference">Privacy preference</option>
                    <option value="Other">Other reason</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted"><Icon name="chevronDown" className="w-4 h-4" /></div>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                  <input type="checkbox" required checked={confirmDelete} onChange={(e) => setConfirmDelete(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded bg-black/40 checked:bg-red-500 checked:border-red-500 transition-colors cursor-pointer" />
                  <Icon name="check" className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <span className="text-[0.84rem] text-cream/80 leading-relaxed">
                  I understand this action is irreversible and all my data will be permanently removed.
                </span>
              </label>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowDeleteModal(false)}
                  className="h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 text-[0.9rem]">
                  Cancel
                </button>
                <button type="submit" disabled={!confirmDelete || isDeleting}
                  className="h-11 px-6 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold transition-all border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-[0.9rem]">
                  {isDeleting ? "Deleting…" : "Confirm & Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSessionsModal(false); }}>
          <div className="bg-[#1c1028] border border-white/10 rounded-3xl p-7 w-full max-w-[560px] shadow-2xl flex flex-col gap-5 relative max-h-[85vh]">
            <button type="button" onClick={() => setShowSessionsModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors border border-white/10">
              <Icon name="close" className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-serif font-bold text-white m-0">Active Sessions ({sessions.length})</h2>
              <p className="text-muted text-[0.85rem] mt-1 m-0">All authorized browsers and devices.</p>
            </div>
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
              {sessions.map(sess => <SessionRow key={sess.id} sess={sess} />)}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/[0.08] gap-3 flex-wrap">
              {sessions.length > 1 ? (
                <button type="button" disabled={revoking}
                  onClick={async () => { await handleRevokeOthers(); setShowSessionsModal(false); }}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-[0.85rem] transition-all border border-red-500/20">
                  {revoking ? "Revoking…" : "Revoke All Other Devices"}
                </button>
              ) : <div />}
              <button type="button" onClick={() => setShowSessionsModal(false)}
                className="h-10 px-5 rounded-xl bg-pink hover:bg-[#ff2a85] text-white font-semibold text-[0.88rem] transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)]">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
