import React, { useState, useEffect } from "react";
import PageHead from "../../common/PageHead";
import Icon from "../../common/Icon";
import { useApp } from "../../../context/AppContext";
import { preferenceService } from "../../../services/preferenceService";
import { title, formatDate } from "../../../utils/formatters";

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
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen">
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
            className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
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
              <div key={p.id} className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" style={{ width: "36px", height: "36px" }}>
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
            <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ marginTop: "10px" }}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
                <div className="settings-icon-badge indigo">
                  <Icon name="sparkle" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
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
          <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ background: "linear-gradient(180deg, #24112c 0%, #17091d 100%)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-pink bg-pink/10 border border-pink/20">
                <Icon name="shield" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <h2>Your Data, Your Choice</h2>
                <p>Initiate formal data archive export, rectification, or restriction.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitRequest} style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="flex flex-col gap-2 relative">
                <label className="flex justify-between items-end mb-1">
                  <span>Request Type</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white appearance-none focus:outline-none focus:border-pink/60 focus:bg-black/60 transition-all"
                    value={requestKind}
                    onChange={(e) => setRequestKind(e.target.value)}
                  >
                    <option value="access">Access — Export personal data archive</option>
                    <option value="correction">Correction — Request record rectification</option>
                    <option value="erasure">Erasure — Request data deletion</option>
                    <option value="restriction">Restriction — Pause processing</option>
                    <option value="objection">Objection — Object to specific processing</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
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
                className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
                disabled={!confirmReq || submitting}
                style={{ width: "100%", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Icon name="shield" />
                <span>{submitting ? "Submitting request…" : "Submit Formal Request"}</span>
              </button>
            </form>
          </div>

          <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", margin: "0 0 8px" }}>
              Notification Preferences
            </h3>
            <p style={{ fontSize: "0.86rem", color: "#bfaabf", lineHeight: "1.5", margin: "0 0 16px" }}>
              Want to adjust push notifications, quiet hours, or batch frequencies instead?
            </p>
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
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
