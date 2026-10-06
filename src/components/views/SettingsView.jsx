import React, { useState, useEffect } from "react";
import PageHead from "../common/PageHead";
import Icon from "../common/Icon";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { profileService } from "../../services/profileService";
import { authService } from "../../services/authService";
import { preferenceService } from "../../services/preferenceService";
import { title } from "../../utils/formatters";

export default function SettingsView() {
  const { state, updateSettings, deleteAccount, logout, showToast, navigate } = useApp();
  const p = state.prefs || {};

  const [activeTab, setActiveTab] = useState("all"); // "all" | "appearance" | "schedule" | "notifications" | "security" | "account"

  const [settings, setSettings] = useState({
    sound: p.sound ?? true,
    reducedMotion: p.reducedMotion ?? false,
    timezone: p.timezone || "UTC",
    frequency: p.frequency || "instant",
    quietStart: p.quietStart ?? 23,
    quietEnd: p.quietEnd ?? 8,
    channels: {
      inApp: true,
      email: true,
      push: true,
      whatsapp: false,
      ...p.channels,
    },
    categories: {
      connections: true,
      messages: true,
      travel: true,
      billing: true,
      security: true,
      marketing: false,
      ...p.categories,
    },
  });

  // Hydrate preferences from backend
  useEffect(() => {
    let isMounted = true;
    async function loadBackendPrefs() {
      try {
        const remote = await preferenceService.getPreferences();
        if (isMounted && remote) {
          setSettings((prev) => ({
            ...prev,
            ...remote,
            channels: { ...prev.channels, ...remote.channels },
            categories: { ...prev.categories, ...remote.categories },
          }));
        }
      } catch (err) {
        console.warn("Backend preferences fetch error:", err.message);
      }
    }
    loadBackendPrefs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Security & Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sessions state with instant fallback so user is NEVER stuck on loading
  const defaultSessions = [
    {
      id: "sess-current",
      device: "Current Web Browser (Windows)",
      current: true,
      lastActive: new Date().toISOString(),
    },
  ];
  const [sessions, setSessions] = useState(defaultSessions);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("Found someone");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const zones = [
    "UTC",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Kolkata",
  ];

  // Fetch active sessions with quick timeout fallback
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const res = await Promise.race([profileService.getSessions(), timeoutPromise]);
        if (isMounted && res?.items && res.items.length > 0) {
          setSessions(res.items);
        }
      } catch (err) {
        console.warn("Sessions fetch error, using default active session:", err.message);
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    }
    loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRevokeOthers = async () => {
    setRevoking(true);
    try {
      const res = await profileService.revokeOtherSessions();
      showToast(`Logged out from ${res.revokedCount || 0} other device(s).`);
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      showToast(err.message || "Failed to revoke sessions.");
    } finally {
      setRevoking(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast("Please enter both current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast("Password updated successfully! 🔒");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      showToast(err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteAccount(deleteReason);
    } catch (err) {
      showToast(err.message || "Failed to delete account.");
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    updateSettings(settings);
    try {
      await preferenceService.updatePreferences(settings);
      showToast("Preferences saved successfully! ✨");
    } catch (err) {
      console.warn("Preferences save warning:", err.message);
      showToast("Preferences saved locally. ✨");
    }
  };

  return (
    <div className="settings-container">
      <PageHead
        showBack
        backTo="profile"
        backLabel="Back to Profile"
        kicker="Settings & Preferences"
        heading="Account Settings"
        description="Manage your display preferences, notification channels, security credentials, and active devices."
        action={
          <button
            type="button"
            className="button quiet"
            onClick={() => navigate("assist")}
            style={{ fontSize: "0.86rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="sparkle" />
            <span>AI Rhythm Optimizer</span>
          </button>
        }
      />

      {/* 2-Column Settings Layout (Left Sidebar Menu + Right Content) */}
      <div className="settings-layout-grid">
        {/* Left Sidebar Menu */}
        <aside className="settings-sidebar">
          <nav className="settings-sidebar-nav">
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <Icon name="settings" />
              <span>All Settings</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "desires" ? "active" : ""}`}
              onClick={() => setActiveTab("desires")}
            >
              <Icon name="heart" />
              <span>Intimacy & Desires</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "passport" ? "active" : ""}`}
              onClick={() => setActiveTab("passport")}
            >
              <Icon name="plane" />
              <span>Passport & Travel</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "appearance" ? "active" : ""}`}
              onClick={() => setActiveTab("appearance")}
            >
              <Icon name="sparkle" />
              <span>Appearance & Sound</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              <Icon name="compass" />
              <span>Quiet Hours</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <Icon name="bell" />
              <span>Notifications</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <Icon name="lock" />
              <span>Security & Password</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <Icon name="user" />
              <span>Account Management</span>
            </button>
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="settings-content-main">
          <form onSubmit={handleSubmit}>
        {/* Section: Intimacy & Desires Quiz */}
        {(activeTab === "all" || activeTab === "desires") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge rose">
                <Icon name="heart" />
              </div>
              <div className="settings-card-titles">
                <div style={{ fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#f43f5e", marginBottom: "4px" }}>
                  GET TO KNOW YOURSELF · CONFIDENTIAL QUIZ
                </div>
                <h2>What draws you in?</h2>
                <p>Explore your intimacy, pace, and romantic preferences. Your choices help craft deeper compatibility with mutual sparks.</p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                padding: "20px",
                borderRadius: "16px",
              }}
            >
              <div style={{ maxWidth: "560px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#e2d2e6", lineHeight: 1.55 }}>
                  Answer curated questions regarding attraction chemistry, dating pace, and first date atmospheres. Your responses remain confidential and help match you with truly compatible connections.
                </p>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => navigate("desires")}
                style={{
                  minHeight: "44px",
                  padding: "0 22px",
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 16px rgba(244, 63, 94, 0.35)",
                }}
              >
                <span>Explore desires</span>
                <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}

        {/* Section: Passport & Travel Mode */}
        {(activeTab === "all" || activeTab === "passport") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge indigo">
                <Icon name="plane" />
              </div>
              <div className="settings-card-titles">
                <div style={{ fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#a855f7", marginBottom: "4px" }}>
                  A CHANGE OF SCENERY · OVERLAPPING VISITS
                </div>
                <h2>Possibility has a Passport.</h2>
                <p>Choose a destination city and plan trips in advance. Connect with fellow travelers visiting at the same time while keeping your location private.</p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                padding: "20px",
                borderRadius: "16px",
              }}
            >
              <div style={{ maxWidth: "560px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#e2d2e6", lineHeight: 1.55 }}>
                  Explore global interactive world maps, schedule travel itineraries, view overlapping city visits with sparks, and maintain total privacy of your live GPS coordinates.
                </p>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => navigate("passport")}
                style={{
                  minHeight: "44px",
                  padding: "0 22px",
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  boxShadow: "0 4px 16px rgba(168, 85, 247, 0.35)",
                }}
              >
                <span>Open Passport</span>
                <Icon name="plane" />
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Appearance & Sound */}
        {(activeTab === "all" || activeTab === "appearance") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge rose">
                <Icon name="sparkle" />
              </div>
              <div className="settings-card-titles">
                <h2>Appearance & Sound Effects</h2>
                <p>Customize audio feedback and visual motion effects across the application.</p>
              </div>
            </div>

            <div className="settings-toggles-grid">
              <div
                className={`settings-toggle-card ${settings.sound ? "checked" : ""}`}
                onClick={() => setSettings({ ...settings, sound: !settings.sound })}
              >
                <div className="settings-toggle-left">
                  <div className="settings-toggle-icon">
                    <Icon name="sparkle" />
                  </div>
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Subtle Sound Effects</span>
                    <span className="settings-toggle-desc">
                      Play acoustic chimes on likes, mutual matches, and outgoing messages
                    </span>
                  </div>
                </div>
                <div className="settings-switch-control"></div>
              </div>

              <div
                className={`settings-toggle-card ${settings.reducedMotion ? "checked" : ""}`}
                onClick={() => setSettings({ ...settings, reducedMotion: !settings.reducedMotion })}
              >
                <div className="settings-toggle-left">
                  <div className="settings-toggle-icon">
                    <Icon name="compass" />
                  </div>
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Reduce Movement & Animations</span>
                    <span className="settings-toggle-desc">
                      Minimize motion transitions and glowing aura effects for a quieter view
                    </span>
                  </div>
                </div>
                <div className="settings-switch-control"></div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Timezone & Quiet Hours */}
        {(activeTab === "all" || activeTab === "schedule") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge indigo">
                <Icon name="compass" />
              </div>
              <div className="settings-card-titles">
                <h2>Quiet Hours & Schedule</h2>
                <p>Set your local timezone, quiet hours, and automated delivery cadence.</p>
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Your Timezone</span>
                  <span className="profile-field-hint">Local standard</span>
                </label>
                <div className="profile-select-wrap">
                  <select
                    className="profile-select"
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  >
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                  <div className="profile-select-arrow">
                    <Icon name="chevronDown" />
                  </div>
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Notification Frequency</span>
                  <span className="profile-field-hint">Delivery mode</span>
                </label>
                <div className="profile-select-wrap">
                  <select
                    className="profile-select"
                    value={settings.frequency}
                    onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}
                  >
                    <option value="instant">Instant Realtime Delivery</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Summary</option>
                    <option value="off">Mute Non-Essential</option>
                  </select>
                  <div className="profile-select-arrow">
                    <Icon name="chevronDown" />
                  </div>
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Quiet Hours Start</span>
                  <span className="profile-field-hint">24-hour format (e.g. 23 = 11 PM)</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type="number"
                    className="profile-input"
                    min="0"
                    max="23"
                    value={settings.quietStart}
                    onChange={(e) =>
                      setSettings({ ...settings, quietStart: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Quiet Hours End</span>
                  <span className="profile-field-hint">24-hour format (e.g. 8 = 8 AM)</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type="number"
                    className="profile-input"
                    min="0"
                    max="23"
                    value={settings.quietEnd}
                    onChange={(e) =>
                      setSettings({ ...settings, quietEnd: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Notification Channels & Preferences */}
        {(activeTab === "all" || activeTab === "notifications") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge emerald">
                <Icon name="bell" />
              </div>
              <div className="settings-card-titles">
                <h2>Notification Channels</h2>
                <p>Select the channels where you wish to receive updates and alerts.</p>
              </div>
            </div>

            <div className="settings-toggles-grid">
              {Object.entries(settings.channels).map(([k, v]) => {
                const channelDetails = {
                  inApp: {
                    title: "In-App Inbox & Realtime Floating Alerts",
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
                    className={`settings-toggle-card ${v ? "checked" : ""}`}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          [k]: !v,
                        },
                      })
                    }
                  >
                    <div className="settings-toggle-left">
                      <div className="settings-toggle-icon">
                        <Icon name={channelDetails.icon} />
                      </div>
                      <div className="settings-toggle-info">
                        <span className="settings-toggle-title">{channelDetails.title}</span>
                        <span className="settings-toggle-desc">{channelDetails.desc}</span>
                      </div>
                    </div>
                    <div className="settings-switch-control"></div>
                  </div>
                );
              })}
            </div>

            {/* Section 4: Notification Preferences */}
            <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div className="profile-section-titles" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ffffff", margin: "0 0 4px 0" }}>
                  Notification Categories
                </h3>
                <p style={{ fontSize: "0.86rem", color: "#bfaabf", margin: 0 }}>
                  Customize the specific types of activity that trigger notifications.
                </p>
              </div>

              <div className="settings-toggles-grid">
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
                      className={`settings-toggle-card ${v ? "checked" : ""}`}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          categories: {
                            ...settings.categories,
                            [k]: !v,
                          },
                        })
                      }
                    >
                      <div className="settings-toggle-left">
                        <div className="settings-toggle-icon">
                          <Icon name={categoryInfo.icon} />
                        </div>
                        <div className="settings-toggle-info">
                          <span className="settings-toggle-title">{categoryInfo.title}</span>
                          <span className="settings-toggle-desc">{categoryInfo.desc}</span>
                        </div>
                      </div>
                      <div className="settings-switch-control"></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Active Sessions */}
        {(activeTab === "all" || activeTab === "security") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge amber">
                <Icon name="discover" />
              </div>
              <div className="settings-card-titles">
                <h2>Active Device Sessions</h2>
                <p>Devices and browsers currently logged into your account.</p>
              </div>
              {sessions.length > 1 && (
                <button
                  type="button"
                  className="button quiet"
                  style={{ fontSize: "0.82rem", minHeight: "36px", padding: "6px 16px" }}
                  disabled={revoking}
                  onClick={handleRevokeOthers}
                >
                  {revoking ? "Revoking…" : "Revoke Other Devices"}
                </button>
              )}
            </div>

            <div className="settings-sessions-list">
              {loadingSessions ? (
                <Loader text="Refreshing active sessions…" size="small" />
              ) : (
                sessions.slice(0, 4).map((sess) => (
                  <div
                    key={sess.id}
                    className={`settings-session-card ${sess.current ? "is-current" : ""}`}
                  >
                    <div className="settings-session-icon">
                      <Icon name="user" />
                    </div>
                    <div className="settings-session-body">
                      <div className="settings-session-title">
                        {sess.device || "Current Web Browser"}
                      </div>
                      <div className="settings-session-time">
                        {sess.current
                          ? "Active now • Verified Device"
                          : `Last activity: ${
                              sess.lastActive
                                ? new Date(sess.lastActive).toLocaleString()
                                : "Recently"
                            }`}
                      </div>
                    </div>
                    <span
                      className={`settings-session-badge ${
                        sess.current ? "online" : "other"
                      }`}
                    >
                      {sess.current ? "Active Now" : "Other Session"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* View More Sessions Button */}
            {sessions.length > 4 && (
              <div style={{ marginTop: "14px", display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => setShowSessionsModal(true)}
                  style={{
                    fontSize: "0.86rem",
                    minHeight: "38px",
                    padding: "0 18px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <span>View More Devices ({sessions.length})</span>
                  <Icon name="arrow" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 6: Security & Password */}
        {(activeTab === "all" || activeTab === "security") && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge emerald">
                <Icon name="lock" />
              </div>
              <div className="settings-card-titles">
                <h2>Security & Password</h2>
                <p>Update your authentication credentials securely.</p>
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Current Password</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type="password"
                    className="profile-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>New Password</span>
                  <span className="profile-field-hint">Min 8 characters</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type="password"
                    className="profile-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <button
                type="button"
                className="button quiet"
                onClick={handleChangePasswordSubmit}
                disabled={!currentPassword || !newPassword || isChangingPassword}
                style={{
                  minHeight: "44px",
                  padding: "0 22px",
                  fontSize: "0.9rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {isChangingPassword ? "Updating password…" : "Update Password"}
              </button>
            </div>
          </div>
        )}

        {/* Section 7: Account Management */}
        {(activeTab === "all" || activeTab === "account") && (
          <div className="settings-card danger-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge crimson">
                <Icon name="user" />
              </div>
              <div className="settings-card-titles">
                <h2 style={{ color: "#ffffff" }}>Account Management</h2>
                <p>Manage your login session or permanently delete your account profile.</p>
              </div>
            </div>

            <p style={{ color: "#d8bac4", fontSize: "0.92rem", margin: "0 0 18px 0" }}>
              Closing your account permanently removes your identity, encrypted photo albums, and conversation history.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button quiet"
                onClick={logout}
                style={{ minHeight: "44px", padding: "0 20px" }}
              >
                Sign Out
              </button>

              <button
                type="button"
                className="button danger"
                onClick={() => setShowDeleteModal(true)}
                style={{ minHeight: "44px", padding: "0 22px" }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="settings-save-action-bar">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button quiet"
              onClick={() => navigate("notifications")}
              style={{ minHeight: "42px", padding: "0 18px", fontSize: "0.88rem" }}
            >
              <Icon name="bell" />
              <span>Inbox Alerts</span>
            </button>
            <button
              type="button"
              className="button quiet"
              onClick={() => navigate("privacy")}
              style={{ minHeight: "42px", padding: "0 18px", fontSize: "0.88rem" }}
            >
              <Icon name="shield" />
              <span>Privacy & Consent</span>
            </button>
          </div>

          <button type="submit" className="settings-save-primary-btn">
            <span>Save Changes</span>
            <Icon name="check" />
          </button>
        </div>
      </form>
        </main>
      </div>

      {/* Delete Account Modal Dialog */}
      {showDeleteModal && (
        <div
          className="modal-backdrop"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 110 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteModal(false);
          }}
        >
          <div
            className="modal-dialog"
            style={{
              maxWidth: "520px",
              background: "rgba(28, 17, 33, 0.96)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "24px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
            }}
          >
            <button
              type="button"
              className="round quiet close"
              onClick={() => setShowDeleteModal(false)}
            >
              <Icon name="close" />
            </button>

            <h2 style={{ color: "#ffa7ba", fontSize: "1.7rem", marginBottom: "8px" }}>
              Delete your account?
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              Your profile visibility will terminate immediately and your personal data will be scheduled for irreversible retention cleanup.
            </p>

            <form onSubmit={handleDeleteAccountSubmit} style={{ marginTop: "16px" }}>
              <div className="profile-field-group" style={{ marginBottom: "16px" }}>
                <label className="profile-field-label">
                  <span>Reason for leaving</span>
                </label>
                <div className="profile-select-wrap">
                  <select
                    className="profile-select"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  >
                    <option value="Found someone">Found someone</option>
                    <option value="Taking a break">Taking a break</option>
                    <option value="Privacy preference">Privacy preference</option>
                    <option value="Other">Other reason</option>
                  </select>
                  <div className="profile-select-arrow">
                    <Icon name="chevronDown" />
                  </div>
                </div>
              </div>

              <label className="check" style={{ marginBottom: "20px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  required
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                />
                <span style={{ fontSize: "0.86rem", color: "var(--cream)" }}>
                  I understand that my account, connections, and data will be permanently removed.
                </span>
              </label>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button danger"
                  disabled={!confirmDelete || isDeleting}
                >
                  {isDeleting ? "Deleting…" : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View All Sessions Modal Dialog */}
      {showSessionsModal && (
        <div
          className="modal-backdrop"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 110 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSessionsModal(false);
          }}
        >
          <div
            className="modal-dialog"
            style={{
              maxWidth: "580px",
              width: "100%",
              background: "rgba(28, 17, 33, 0.96)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "24px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <h2 style={{ color: "#ffffff", fontSize: "1.4rem", margin: "0 0 4px" }}>
                  Active Device Sessions ({sessions.length})
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>
                  Authorized browsers and devices currently logged into your account.
                </p>
              </div>
              <button
                type="button"
                className="round quiet close"
                onClick={() => setShowSessionsModal(false)}
              >
                <Icon name="close" />
              </button>
            </div>

            <div
              className="settings-sessions-list"
              style={{
                overflowY: "auto",
                maxHeight: "420px",
                paddingRight: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`settings-session-card ${sess.current ? "is-current" : ""}`}
                  style={{ margin: 0 }}
                >
                  <div className="settings-session-icon">
                    <Icon name="user" />
                  </div>
                  <div className="settings-session-body">
                    <div className="settings-session-title">
                      {sess.device || "Current Web Browser"}
                    </div>
                    <div className="settings-session-time">
                      {sess.current
                        ? "Active now • Verified Device"
                        : `Last activity: ${
                            sess.lastActive
                              ? new Date(sess.lastActive).toLocaleString()
                              : "Recently"
                          }`}
                    </div>
                  </div>
                  <span
                    className={`settings-session-badge ${
                      sess.current ? "online" : "other"
                    }`}
                  >
                    {sess.current ? "Active Now" : "Other Session"}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px" }}>
              {sessions.length > 1 ? (
                <button
                  type="button"
                  className="button quiet danger"
                  disabled={revoking}
                  onClick={async () => {
                    await handleRevokeOthers();
                    setShowSessionsModal(false);
                  }}
                  style={{ fontSize: "0.84rem", minHeight: "38px" }}
                >
                  {revoking ? "Revoking…" : "Revoke All Other Devices"}
                </button>
              ) : <div />}

              <button
                type="button"
                className="button primary"
                onClick={() => setShowSessionsModal(false)}
                style={{ minHeight: "38px", padding: "0 20px" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


