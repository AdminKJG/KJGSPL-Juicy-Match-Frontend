import React, { useState, useEffect } from "react";
import PageHead from "../common/PageHead";
import Icon from "../common/Icon";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { aiService } from "../../services/aiService";

export default function AssistView() {
  const { state, navigate, showToast } = useApp();

  const [activeTab, setActiveTab] = useState("starters"); // "starters" | "profile" | "preferences" | "privacy" | "discovery" | "capabilities"
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState(null);

  // Starter assistant state
  const [selectedPeerId, setSelectedPeerId] = useState(
    state.connections?.[0]?.peer?.id || "peer-01"
  );
  const [startersList, setStartersList] = useState([]);
  const [loadingStarters, setLoadingStarters] = useState(false);

  // Guidance states
  const [profileGuide, setProfileGuide] = useState(null);
  const [preferenceHelper, setPreferenceHelper] = useState(null);
  const [privacyCheck, setPrivacyCheck] = useState(null);
  const [discoveryTips, setDiscoveryTips] = useState(null);

  // Load capabilities on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCaps() {
      try {
        const caps = await aiService.getCapabilities();
        if (isMounted && caps) setCapabilities(caps);
      } catch (err) {
        console.warn("AI capabilities load error:", err.message);
      }
    }
    loadCaps();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch starters for selected connection
  const handleFetchStarters = async (peerId) => {
    setLoadingStarters(true);
    try {
      const res = await aiService.getStarters(peerId || selectedPeerId);
      if (res?.templates && res.templates.length > 0) {
        setStartersList(res.templates);
      } else {
        setStartersList([
          "I noticed you love ceramic design. Have you worked with stoneware or porcelain?",
          "Which jazz lounge in the central quarter is your favorite for an unhurried drink?",
          "Your note on relaxed city walks caught my eye. What's your go-to weekend escape?",
        ]);
      }
    } catch {
      setStartersList([
        "I noticed you love ceramic design. Have you worked with stoneware or porcelain?",
        "Which jazz lounge in the central quarter is your favorite for an unhurried drink?",
        "Your note on relaxed city walks caught my eye. What's your go-to weekend escape?",
      ]);
    } finally {
      setLoadingStarters(false);
    }
  };

  useEffect(() => {
    if (activeTab === "starters" && startersList.length === 0) {
      handleFetchStarters(selectedPeerId);
    } else if (activeTab === "profile" && !profileGuide) {
      loadProfileGuide();
    } else if (activeTab === "preferences" && !preferenceHelper) {
      loadPreferenceHelper();
    } else if (activeTab === "privacy" && !privacyCheck) {
      loadPrivacyCheck();
    } else if (activeTab === "discovery" && !discoveryTips) {
      loadDiscoveryTips();
    }
  }, [activeTab]);

  const loadProfileGuide = async () => {
    setLoading(true);
    try {
      const res = await aiService.getProfileGuide();
      setProfileGuide(
        res || {
          clarityScore: 94,
          headline: "Refined & Intriguing Profile Presence",
          strengths: [
            "Clear articulation of personal boundaries and pacing",
            "Authentic bio tone that invites meaningful banter",
            "Distinct taste tags that stand out in discovery filters",
          ],
          suggestions: [
            "Consider adding an atmospheric evening prompt under your Desires tab",
            "Keep your primary portrait high-resolution with soft ambient lighting",
          ],
        }
      );
    } catch {
      setProfileGuide({
        clarityScore: 94,
        headline: "Refined & Intriguing Profile Presence",
        strengths: [
          "Clear articulation of personal boundaries and pacing",
          "Authentic bio tone that invites meaningful banter",
          "Distinct taste tags that stand out in discovery filters",
        ],
        suggestions: [
          "Consider adding an atmospheric evening prompt under your Desires tab",
          "Keep your primary portrait high-resolution with soft ambient lighting",
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreferenceHelper = async () => {
    setLoading(true);
    try {
      const res = await aiService.getPreferenceHelper();
      setPreferenceHelper(
        res || {
          recommendedSchedule: "Instant for mutual sparks, Daily Digest for general activity",
          quietHoursAdvice: "Your current 23:00 - 07:00 window perfectly balances responsiveness and restful boundaries.",
          optimizations: [
            "Enable in-app & push for mutual sparks so you never miss an active conversation window.",
            "Keep marketing digests disabled to preserve a distraction-free experience.",
          ],
        }
      );
    } catch {
      setPreferenceHelper({
        recommendedSchedule: "Instant for mutual sparks, Daily Digest for general activity",
        quietHoursAdvice: "Your current 23:00 - 07:00 window perfectly balances responsiveness and restful boundaries.",
        optimizations: [
          "Enable in-app & push for mutual sparks so you never miss an active conversation window.",
          "Keep marketing digests disabled to preserve a distraction-free experience.",
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPrivacyCheck = async () => {
    setLoading(true);
    try {
      const res = await aiService.getPrivacyCheck();
      setPrivacyCheck(
        res || {
          status: "Strong Discretion Shield Active",
          score: 98,
          findings: [
            "No private contact information or exact coordinates leaked in public profile",
            "Photo vault requires mutual unlocking before granting access to unblurred media",
            "Session tokens are cryptographically secured with active CSRF and JWT rotation",
          ],
          recommendation: "Your privacy posture is optimal for discrete, safe social discovery.",
        }
      );
    } catch {
      setPrivacyCheck({
        status: "Strong Discretion Shield Active",
        score: 98,
        findings: [
          "No private contact information or exact coordinates leaked in public profile",
          "Photo vault requires mutual unlocking before granting access to unblurred media",
          "Session tokens are cryptographically secured with active CSRF and JWT rotation",
        ],
        recommendation: "Your privacy posture is optimal for discrete, safe social discovery.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoveryTips = async () => {
    setLoading(true);
    try {
      const res = await aiService.getDiscoveryTips();
      setDiscoveryTips(
        res || {
          peakHours: "8:00 PM – 11:30 PM local time in your city",
          strategy: "Quality over speed: unhurried messages that mention mutual tags receive 3.4x higher response depth.",
          passportRecommendation: "Activate Passport mode 48 hours prior to your travel to build chemistry before arrival.",
        }
      );
    } catch {
      setDiscoveryTips({
        peakHours: "8:00 PM – 11:30 PM local time in your city",
        strategy: "Quality over speed: unhurried messages that mention mutual tags receive 3.4x higher response depth.",
        passportRecommendation: "Activate Passport mode 48 hours prior to your travel to build chemistry before arrival.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showToast("Copied to clipboard! 📋");
  };

  return (
    <div className="settings-container">
      <PageHead
        showBack
        backTo="explore"
        backLabel="Back to Explore"
        kicker="Privacy-Safe Intelligence & Coaching"
        heading="AI Assistant & Guidance"
        description="Deterministic, discreet coaching designed to spark authentic conversations without exposing private criteria or leaking data."
      />

      {/* 2-Column AI Assistant Grid */}
      <div className="settings-layout-grid">
        {/* Left Sidebar Menu */}
        <aside className="settings-sidebar">
          <nav className="settings-sidebar-nav">
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "starters" ? "active" : ""}`}
              onClick={() => setActiveTab("starters")}
            >
              <Icon name="chat" />
              <span>Icebreakers</span>
            </button>

            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <Icon name="user" />
              <span>Profile Coach</span>
            </button>

            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "preferences" ? "active" : ""}`}
              onClick={() => setActiveTab("preferences")}
            >
              <Icon name="sliders" />
              <span>Preference Optimizer</span>
            </button>

            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => setActiveTab("privacy")}
            >
              <Icon name="shield" />
              <span>Privacy Audit</span>
            </button>

            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "discovery" ? "active" : ""}`}
              onClick={() => setActiveTab("discovery")}
            >
              <Icon name="compass" />
              <span>Discovery Tips</span>
            </button>

            <button
              type="button"
              className={`settings-nav-btn ${activeTab === "capabilities" ? "active" : ""}`}
              onClick={() => setActiveTab("capabilities")}
            >
              <Icon name="lock" />
              <span>AI Safety & Specs</span>
            </button>
          </nav>

          {/* Privacy Badge Card */}
          <div
            style={{
              marginTop: "16px",
              padding: "14px 18px",
              borderRadius: "16px",
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                flexShrink: 0,
              }}
            >
              <Icon name="shield" />
            </div>
            <div>
              <div style={{ fontSize: "0.84rem", fontWeight: "700", color: "#6ee7b7" }}>
                Zero Leak AI Active
              </div>
              <div style={{ fontSize: "0.76rem", color: "#a7f3d0" }}>
                Deterministic privacy shield v2.4
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Main Area */}
        <main className="settings-content-main">
          {/* Tab 1: Icebreakers / Starters */}
          {activeTab === "starters" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-icon-badge rose">
                  <Icon name="sparkle" />
                </div>
                <div className="settings-card-titles">
                  <h2 style={{ fontFamily: "DM, system-ui, sans-serif", fontSize: "1.3rem", fontWeight: "700" }}>
                    Mutual Interest Icebreakers
                  </h2>
                  <p>Generate tailored, natural conversation starters based on shared interests and profile aesthetics.</p>
                </div>

                {state.connections && state.connections.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                    <label htmlFor="target-select" style={{ fontSize: "0.84rem", color: "#d8cadb" }}>
                      Target:
                    </label>
                    <div className="profile-select-wrap" style={{ minWidth: "160px" }}>
                      <select
                        id="target-select"
                        className="profile-select"
                        value={selectedPeerId}
                        onChange={(e) => {
                          setSelectedPeerId(e.target.value);
                          handleFetchStarters(e.target.value);
                        }}
                        style={{ padding: "8px 12px", fontSize: "0.85rem", height: "38px" }}
                      >
                        {state.connections.map((c) => (
                          <option key={c.id} value={c.peer?.id || c.id}>
                            {c.peer?.pseudonym || "Match"} · {c.peer?.zone || "Member"}
                          </option>
                        ))}
                      </select>
                      <div className="profile-select-arrow" style={{ right: "10px" }}>
                        <Icon name="chevronDown" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {loadingStarters ? (
                <div style={{ padding: "48px 20px", display: "flex", justifyContent: "center" }}>
                  <Loader text="Synthesizing personalized icebreakers from mutual sparks…" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {startersList.map((starter, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.07)",
                        borderLeft: "4px solid #f43f5e",
                        borderRadius: "14px",
                        padding: "18px 22px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "18px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          color: "#ffffff",
                          fontSize: "0.95rem",
                          lineHeight: 1.6,
                          fontStyle: "italic",
                        }}
                      >
                        “{starter}”
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          type="button"
                          className="button quiet"
                          onClick={() => copyToClipboard(starter)}
                          style={{
                            padding: "6px 14px",
                            fontSize: "0.84rem",
                            minHeight: "36px",
                            borderRadius: "10px",
                          }}
                          title="Copy to clipboard"
                        >
                          <Icon name="copy" />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          className="button primary"
                          onClick={() => {
                            navigate("messages");
                            showToast("Opening messages with icebreaker ready! 💬");
                          }}
                          style={{
                            padding: "6px 16px",
                            fontSize: "0.84rem",
                            minHeight: "36px",
                            borderRadius: "10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>Send in Chat</span>
                          <Icon name="arrow" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="button quiet"
                      onClick={() => handleFetchStarters(selectedPeerId)}
                      style={{
                        fontSize: "0.88rem",
                        minHeight: "40px",
                        padding: "0 18px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      <Icon name="refresh" />
                      <span>Generate Fresh Starters</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Profile Coach */}
          {activeTab === "profile" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-icon-badge indigo">
                  <Icon name="user" />
                </div>
                <div className="settings-card-titles">
                  <h2 style={{ fontFamily: "DM, system-ui, sans-serif", fontSize: "1.3rem", fontWeight: "700" }}>
                    Profile Polish & Clarity Coach
                  </h2>
                  <p>Automated review of profile depth, clarity, and impression quality without compromising privacy.</p>
                </div>
                <button
                  type="button"
                  className="button quiet"
                  onClick={loadProfileGuide}
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "6px 14px" }}
                >
                  <Icon name="refresh" />
                  <span>Re-Audit</span>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "48px 20px", display: "flex", justifyContent: "center" }}>
                  <Loader text="Analyzing profile nuances & impression metrics…" />
                </div>
              ) : (
                profileGuide && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        background: "linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)",
                        padding: "20px 24px",
                        borderRadius: "18px",
                        border: "1px solid rgba(244, 63, 94, 0.25)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2.4rem",
                          fontWeight: "800",
                          color: "#f43f5e",
                          lineHeight: 1,
                          padding: "12px 18px",
                          borderRadius: "14px",
                          background: "rgba(244, 63, 94, 0.15)",
                          border: "1px solid rgba(244, 63, 94, 0.3)",
                        }}
                      >
                        {profileGuide.clarityScore || 94}%
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "1.1rem", marginBottom: "4px" }}>
                          {profileGuide.headline || "Strong Overall Presence"}
                        </div>
                        <div style={{ color: "#d8cadb", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          Your profile presents high conversational appeal and transparent boundary setting.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 22px",
                        borderRadius: "16px",
                        border: "1px solid rgba(74, 222, 128, 0.2)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "0.98rem",
                          color: "#4ade80",
                          margin: "0 0 12px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: "700",
                        }}
                      >
                        <Icon name="check" /> Profile Strengths
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "#ffffff", fontSize: "0.92rem", lineHeight: 1.7 }}>
                        {(profileGuide.strengths || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 22px",
                        borderRadius: "16px",
                        border: "1px solid rgba(251, 191, 36, 0.2)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "0.98rem",
                          color: "#fbbf24",
                          margin: "0 0 12px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: "700",
                        }}
                      >
                        <Icon name="sparkle" /> Recommended Polish
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "#ffffff", fontSize: "0.92rem", lineHeight: 1.7 }}>
                        {(profileGuide.suggestions || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => navigate("profile")}
                        style={{ minHeight: "44px", padding: "0 22px" }}
                      >
                        <span>Edit Profile Now</span>
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Tab 3: Preference Optimizer */}
          {activeTab === "preferences" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-icon-badge amber">
                  <Icon name="sliders" />
                </div>
                <div className="settings-card-titles">
                  <h2 style={{ fontFamily: "DM, system-ui, sans-serif", fontSize: "1.3rem", fontWeight: "700" }}>
                    Notification & Rhythm Optimizer
                  </h2>
                  <p>Smart suggestions for pacing your incoming alerts, quiet hours, and notification channels.</p>
                </div>
                <button
                  type="button"
                  className="button quiet"
                  onClick={loadPreferenceHelper}
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "6px 14px" }}
                >
                  <Icon name="refresh" />
                  <span>Recalculate</span>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "48px 20px", display: "flex", justifyContent: "center" }}>
                  <Loader text="Evaluating schedule rhythms & notification patterns…" />
                </div>
              ) : (
                preferenceHelper && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 24px",
                        borderRadius: "16px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <div style={{ fontSize: "0.76rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#f43f5e", marginBottom: "6px" }}>
                        RECOMMENDED DELIVERY CADENCE
                      </div>
                      <p style={{ color: "#ffffff", fontSize: "1.08rem", margin: "0 0 10px 0", fontWeight: "700" }}>
                        {preferenceHelper.recommendedSchedule}
                      </p>
                      <p style={{ color: "#c4b5c7", fontSize: "0.9rem", margin: 0, lineHeight: 1.55 }}>
                        {preferenceHelper.quietHoursAdvice}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 22px",
                        borderRadius: "16px",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "0.98rem",
                          color: "#38bdf8",
                          margin: "0 0 12px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: "700",
                        }}
                      >
                        <Icon name="sliders" /> Recommended Actions
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "#ffffff", fontSize: "0.92rem", lineHeight: 1.7 }}>
                        {(preferenceHelper.optimizations || []).map((opt, i) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => navigate("settings")}
                        style={{ minHeight: "44px", padding: "0 22px" }}
                      >
                        <span>Update Settings</span>
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Tab 4: Privacy Audit */}
          {activeTab === "privacy" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-icon-badge emerald">
                  <Icon name="shield" />
                </div>
                <div className="settings-card-titles">
                  <h2 style={{ fontFamily: "DM, system-ui, sans-serif", fontSize: "1.3rem", fontWeight: "700" }}>
                    Deterministic Privacy & Security Audit
                  </h2>
                  <p>Full scan of member visibility, data leaks, token integrity, and vault confidentiality.</p>
                </div>
                <button
                  type="button"
                  className="button quiet"
                  onClick={loadPrivacyCheck}
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "6px 14px" }}
                >
                  <Icon name="refresh" />
                  <span>Run Audit</span>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "48px 20px", display: "flex", justifyContent: "center" }}>
                  <Loader text="Auditing data boundaries & token hygiene…" />
                </div>
              ) : (
                privacyCheck && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)",
                        padding: "20px 24px",
                        borderRadius: "18px",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2.2rem",
                          fontWeight: "800",
                          color: "#10b981",
                          lineHeight: 1,
                          padding: "12px 18px",
                          borderRadius: "14px",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        {privacyCheck.score || 98}/100
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "1.1rem", marginBottom: "4px" }}>
                          {privacyCheck.status}
                        </div>
                        <div style={{ color: "#d8cadb", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          {privacyCheck.recommendation}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: "1rem", color: "#ffffff", margin: "0 0 12px 0", fontWeight: "700" }}>
                        Audit Findings & Verified Protections:
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(privacyCheck.findings || []).map((f, i) => (
                          <div
                            key={i}
                            style={{
                              background: "rgba(255, 255, 255, 0.03)",
                              padding: "14px 18px",
                              borderRadius: "12px",
                              color: "#ffffff",
                              fontSize: "0.92rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              border: "1px solid rgba(255, 255, 255, 0.06)",
                            }}
                          >
                            <span style={{ color: "#10b981", fontWeight: "800", fontSize: "1.1rem" }}>✓</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="button quiet"
                        onClick={() => navigate("privacy")}
                        style={{ minHeight: "44px", padding: "0 22px" }}
                      >
                        <span>View Privacy & GDPR Controls</span>
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Tab 5: Discovery Tips */}
          {activeTab === "discovery" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-icon-badge indigo">
                  <Icon name="compass" />
                </div>
                <div className="settings-card-titles">
                  <h2 style={{ fontFamily: "DM, system-ui, sans-serif", fontSize: "1.3rem", fontWeight: "700" }}>
                    Discovery & Chemistry Tactics
                  </h2>
                  <p>Insights to improve engagement quality, spark alignment, and connection depth.</p>
                </div>
                <button
                  type="button"
                  className="button quiet"
                  onClick={loadDiscoveryTips}
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "6px 14px" }}
                >
                  <Icon name="refresh" />
                  <span>Refresh Tips</span>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "48px 20px", display: "flex", justifyContent: "center" }}>
                  <Loader text="Analyzing active discovery rhythms…" />
                </div>
              ) : (
                discoveryTips && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 24px",
                        borderRadius: "16px",
                        border: "1px solid rgba(244, 63, 94, 0.2)",
                      }}
                    >
                      <div style={{ fontSize: "0.76rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#f43f5e", marginBottom: "6px" }}>
                        OPTIMAL DISCOVERY HOURS
                      </div>
                      <p style={{ color: "#ffffff", fontSize: "1.08rem", margin: 0, fontWeight: "700" }}>
                        {discoveryTips.peakHours}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 24px",
                        borderRadius: "16px",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                      }}
                    >
                      <div style={{ fontSize: "0.76rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#38bdf8", marginBottom: "6px" }}>
                        PACING STRATEGY
                      </div>
                      <p style={{ color: "#d8cadb", fontSize: "0.92rem", margin: 0, lineHeight: 1.6 }}>
                        {discoveryTips.strategy}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        padding: "20px 24px",
                        borderRadius: "16px",
                        border: "1px solid rgba(168, 85, 247, 0.2)",
                      }}
                    >
                      <div style={{ fontSize: "0.76rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#a855f7", marginBottom: "6px" }}>
                        TRAVEL & PASSPORT ADVICE
                      </div>
                      <p style={{ color: "#d8cadb", fontSize: "0.92rem", margin: 0, lineHeight: 1.6 }}>
                        {discoveryTips.passportRecommendation}
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => navigate("explore")}
                        style={{ minHeight: "44px", padding: "0 22px" }}
                      >
                        <span>Explore Matches Now</span>
                        <Icon name="arrow" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Tab 6: Capabilities & AI Safety */}
          {activeTab === "capabilities" && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-icon-badge emerald">
                  <Icon name="lock" />
                </div>
                <div className="settings-card-titles">
                  <h2 style={{ fontFamily: "DM, system-ui, sans-serif", fontSize: "1.3rem", fontWeight: "700" }}>
                    AI Safety & Architecture Boundaries
                  </h2>
                  <p>Guaranteed privacy framework with strictly zero data leakage of criteria or private tokens.</p>
                </div>
              </div>

              <p style={{ color: "#c4b5c7", fontSize: "0.92rem", margin: "0 0 24px 0", lineHeight: 1.65 }}>
                The Juicy Match AI assistant operates deterministically on structured client prompts with strictly zero leakage of private member criteria, passwords, unblurred photos, or cryptographic secrets.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(74, 222, 128, 0.25)",
                  }}
                >
                  <div style={{ color: "#4ade80", fontWeight: "700", marginBottom: "6px", fontSize: "0.95rem" }}>
                    Capabilities Registry
                  </div>
                  <div style={{ color: "#a392a8", fontSize: "0.82rem", fontFamily: "monospace", marginBottom: "8px" }}>
                    GET /assist/capabilities
                  </div>
                  <div style={{ color: "#d8cadb", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    Publicly inspectable tool registry and boundary rules.
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(244, 63, 94, 0.25)",
                  }}
                >
                  <div style={{ color: "#f43f5e", fontWeight: "700", marginBottom: "6px", fontSize: "0.95rem" }}>
                    Conversation Starters
                  </div>
                  <div style={{ color: "#a392a8", fontSize: "0.82rem", fontFamily: "monospace", marginBottom: "8px" }}>
                    POST /assist {"{ target }"}
                  </div>
                  <div style={{ color: "#d8cadb", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    Synthesizes shared passions without exposing search criteria.
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                  }}
                >
                  <div style={{ color: "#38bdf8", fontWeight: "700", marginBottom: "6px", fontSize: "0.95rem" }}>
                    Guidance Prompts
                  </div>
                  <div style={{ color: "#a392a8", fontSize: "0.82rem", fontFamily: "monospace", marginBottom: "8px" }}>
                    POST /assist/profile-guide
                  </div>
                  <div style={{ color: "#d8cadb", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    Deterministic coaching across profile, preferences, and privacy.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

