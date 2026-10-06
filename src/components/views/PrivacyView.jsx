import React, { useState, useEffect } from "react";
import PageHead from "../common/PageHead";
import Icon from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { preferenceService } from "../../services/preferenceService";
import { title, formatDate } from "../../utils/formatters";

export default function PrivacyView() {
  const { state, togglePolicyConsent, showToast, navigate } = useApp();
  const [requestKind, setRequestKind] = useState("access");
  const [confirmReq, setConfirmReq] = useState(false);
  const [requestsList, setRequestsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    try {
      const res = await preferenceService.getPrivacyRequests();
      if (res?.items) setRequestsList(res.items);
    } catch (err) {
      console.warn("Privacy requests load error:", err.message);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!confirmReq) {
      showToast("Please confirm the privacy request agreement.");
      return;
    }

    setSubmitting(true);
    try {
      await preferenceService.submitPrivacyRequest(requestKind);
      showToast(`Privacy request for '${title(requestKind)}' submitted for operational review. 🛡️`);
      setConfirmReq(false);
      loadRequests();
    } catch (err) {
      showToast(err.message || "Failed to submit privacy request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-container">
      <PageHead
        showBack
        backTo="settings"
        backLabel="Back to Settings"
        kicker="Consent is an ongoing choice"
        heading="Your boundaries belong to you."
        description="Read the published legal notices, manage your choices, and request a full review of your personal data."
        action={
          <button
            type="button"
            className="button quiet"
            onClick={() => navigate("assist")}
            style={{ fontSize: "0.86rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="sparkle" />
            <span>AI Privacy Audit</span>
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.75fr)", gap: "28px", alignItems: "start" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {state.policies && state.policies.length > 0 ? (
            state.policies.map((p) => (
              <div key={p.id} className="settings-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="settings-icon-badge emerald" style={{ width: "36px", height: "36px" }}>
                      <Icon name="shield" />
                    </div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                      {p.title}
                    </h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="profile-pill" style={{ fontSize: "0.72rem" }}>
                      {p.jurisdiction || "GLOBAL"} · v{p.version || "1.0"}
                    </span>
                    <span className={`settings-session-badge ${p.accepted ? "online" : "other"}`}>
                      {p.accepted ? "Consent Granted" : "Pending Consent"}
                    </span>
                  </div>
                </div>

                <div style={{ padding: "10px 0 16px", color: "#d8cadb", fontSize: "0.9rem", lineHeight: 1.65, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  {p.body}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                  <button
                    type="button"
                    className={`button ${p.accepted ? "quiet" : "primary"}`}
                    style={{ minHeight: "38px", padding: "6px 20px", fontSize: "0.86rem" }}
                    onClick={() => togglePolicyConsent(p.id, !p.accepted)}
                  >
                    {p.accepted ? "Revoke Consent" : "Review & Accept Notice"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No policies available.</p>
          )}

          {requestsList.length > 0 && (
            <div className="settings-card" style={{ marginTop: "10px" }}>
              <div className="settings-card-header">
                <div className="settings-icon-badge indigo">
                  <Icon name="sparkle" />
                </div>
                <div className="settings-card-titles">
                  <h2>Your Submitted Privacy Requests</h2>
                  <p>Track the audit status of your formal GDPR / CCPA data requests.</p>
                </div>
              </div>

              <div className="settings-sessions-list">
                {requestsList.map((req) => (
                  <div key={req.id} className="settings-session-card">
                    <div className="settings-session-icon">
                      <Icon name="shield" />
                    </div>
                    <div className="settings-session-body">
                      <div className="settings-session-title">
                        Data {title(req.kind)} Request
                      </div>
                      <div className="settings-session-time">
                        Submitted {formatDate(req.created_at || req.createdAt, state.prefs?.timezone)}
                      </div>
                    </div>
                    <span className="settings-session-badge online">
                      {req.status || "Under Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="settings-card" style={{ background: "linear-gradient(180deg, #24112c 0%, #17091d 100%)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
            <div className="settings-card-header">
              <div className="settings-icon-badge rose">
                <Icon name="shield" />
              </div>
              <div className="settings-card-titles">
                <h2>Your Data, Your Choice</h2>
                <p>Initiate formal data archive export, rectification, or restriction.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitRequest} style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Request Type</span>
                </label>
                <div className="profile-select-wrap">
                  <select
                    className="profile-select"
                    value={requestKind}
                    onChange={(e) => setRequestKind(e.target.value)}
                  >
                    <option value="access">Access — Export personal data archive</option>
                    <option value="correction">Correction — Request record rectification</option>
                    <option value="erasure">Erasure — Request data deletion</option>
                    <option value="restriction">Restriction — Pause processing</option>
                    <option value="objection">Objection — Object to specific processing</option>
                  </select>
                  <div className="profile-select-arrow">
                    <Icon name="chevronDown" />
                  </div>
                </div>
              </div>

              <div
                className={`settings-toggle-card ${confirmReq ? "checked" : ""}`}
                onClick={() => setConfirmReq(!confirmReq)}
                style={{ cursor: "pointer", padding: "12px 14px" }}
              >
                <div className="settings-toggle-left">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title" style={{ fontSize: "0.86rem" }}>
                      Formal Request Confirmation
                    </span>
                    <span className="settings-toggle-desc" style={{ fontSize: "0.76rem" }}>
                      I authorize processing under Global Privacy framework.
                    </span>
                  </div>
                </div>
                <div className="settings-switch-control" style={{ transform: "scale(0.85)" }}></div>
              </div>

              <button
                type="submit"
                className="button primary"
                disabled={!confirmReq || submitting}
                style={{ width: "100%", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Icon name="shield" />
                <span>{submitting ? "Submitting request…" : "Submit Formal Request"}</span>
              </button>
            </form>
          </div>

          <div className="settings-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", margin: "0 0 8px" }}>
              Notification Preferences
            </h3>
            <p style={{ fontSize: "0.86rem", color: "#bfaabf", lineHeight: "1.5", margin: "0 0 16px" }}>
              Want to adjust push notifications, quiet hours, or batch frequencies instead?
            </p>
            <button
              type="button"
              className="button quiet"
              onClick={() => navigate("settings")}
              style={{ width: "100%", minHeight: "38px", fontSize: "0.84rem" }}
            >
              Adjust notification settings ↗
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
