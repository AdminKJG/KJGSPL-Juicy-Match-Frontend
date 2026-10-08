import React, { useState, useEffect } from "react";
import PageHead from "../../common/PageHead";
import Icon from "../../common/Icon";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { desiresService } from "../../../services/desiresService";
import { title } from "../../../utils/formatters";

export default function DesiresView() {
  const { state, togglePolicyConsent, navigate, showToast } = useApp();
  const sensitivePolicy = state.policies.find((p) => p.kind?.includes("sensitive"));

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [revision, setRevision] = useState(1);
  const [sensitiveConsent, setSensitiveConsent] = useState(true);
  const [audioFile, setAudioFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load desires questions and saved answers from backend
  useEffect(() => {
    async function loadDesires() {
      setLoading(true);
      try {
        const res = await desiresService.getDesires();
        if (res) {
          if (res.questions) setQuestions(res.questions);
          if (res.answers) setAnswers(res.answers);
          if (res.revision) setRevision(res.revision);
        }
      } catch (err) {
        console.warn("Desires load error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDesires();
  }, []);

  const handleChoiceToggle = (questionId, option, max = 3) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(option);
      let next;
      if (exists) {
        next = current.filter((x) => x !== option);
      } else {
        if (max === 1) {
          next = [option];
        } else {
          if (current.length >= max) {
            showToast(`Choose up to ${max} options.`);
            return prev;
          }
          next = [...current, option];
        }
      }
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sensitiveConsent) {
      showToast("Please accept the sensitive information processing notice.");
      return;
    }

    setSaving(true);
    try {
      const res = await desiresService.saveDesires(revision, answers);
      if (res?.revision) setRevision(res.revision);
      showToast("Your desires answers are securely saved. ✨");
    } catch (err) {
      showToast(err.message || "Failed to save desires.");
    } finally {
      setSaving(false);
    }
  };

  const handleTranscribe = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      showToast("Please choose an audio voice file first.");
      return;
    }

    setTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Audio = reader.result;
          const res = await desiresService.transcribeAudio(base64Audio, true);
          if (res?.text) {
            setAnswers((prev) => ({ ...prev, note: res.text }));
            showToast("AI Transcription complete! Review it and click Save. 🎙️");
          }
        } catch (err) {
          showToast(err.message || "Transcription failed.");
        } finally {
          setTranscribing(false);
        }
      };
      reader.readAsDataURL(audioFile);
    } catch (err) {
      showToast("Error reading audio file.");
      setTranscribing(false);
    }
  };

  const displayQuestions =
    questions.length > 0
      ? questions
      : [
          {
            id: "spark",
            title: "What kind of dynamic draws you in?",
            options: ["slow-burn", "playful-chemistry", "deep-conversation", "shared-adventure"],
            max: 2,
          },
          {
            id: "pace",
            title: "Your ideal communication rhythm?",
            options: ["spontaneous", "thoughtful-deliberate", "frequent-checkins", "weekend-focused"],
            max: 1,
          },
        ];

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen">
      <PageHead
        showBack
        backTo="settings"
        backLabel="Back to Settings"
        kicker="Consent & Chemistry"
        heading="Intimacy & Desires Quiz."
        description="Share what turns your curiosity on, at your own rhythm. Answers remain strictly confidential."
      />

      {loading ? (
        <Loader text="Loading intimacy & chemistry preferences…" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.75fr)", gap: "28px", alignItems: "start" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {displayQuestions.map((q, idx) => {
              const selectedList = answers[q.id] || [];
              return (
                <div key={q.id} className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-pink bg-pink/10 border border-pink/20">
                      <Icon name="heart" />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="profile-step-badge" style={{ marginBottom: "6px" }}>
                        <span>0{idx + 1}</span> · COMPATIBILITY FACTOR
                      </div>
                      <h2>{q.title}</h2>
                      <p>
                        {q.max === 1
                          ? "Select your top 1 preferred dynamic"
                          : `Choose up to ${q.max || 3} options that resonate with you`}
                      </p>
                    </div>
                  </div>

                  <div className="profile-chips-group" style={{ marginTop: "16px" }}>
                    <div className="profile-chips-container">
                      {(q.options || []).map((opt) => {
                        const isSelected = selectedList.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`profile-chip-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleChoiceToggle(q.id, opt, q.max || 3)}
                          >
                            <span className="chip-bullet"></span>
                            <span>{title(opt.replace(/-/g, " "))}</span>
                            {isSelected && (
                              <svg className="chip-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Private Intimacy Note Card */}
            <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
                <div className="settings-icon-badge indigo">
                  <Icon name="sparkle" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <h2>Private Intimacy Note</h2>
                  <p>A personal note about what you are looking for. Never published publicly.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 relative" style={{ marginTop: "14px" }}>
                <textarea
                  className="profile-textarea"
                  value={answers.note || ""}
                  onChange={(e) => setAnswers({ ...answers, note: e.target.value })}
                  placeholder="e.g. Looking for intentional conversations, shared Sunday coffee, and authentic emotional resonance..."
                  rows={4}
                />
              </div>
            </div>

            {/* Consent Toggle Card */}
            <div
              className={`settings-toggle-card ${sensitiveConsent ? "checked" : ""}`}
              onClick={() => setSensitiveConsent(!sensitiveConsent)}
              style={{ cursor: "pointer" }}
            >
              <div className="settings-toggle-left">
                <div className="settings-toggle-icon">
                  <Icon name="shield" />
                </div>
                <div className="settings-toggle-info">
                  <span className="settings-toggle-title">Sensitive Information Processing Notice</span>
                  <span className="settings-toggle-desc">
                    I agree to the processing of my intimate preferences for deterministic compatibility matching.
                  </span>
                </div>
              </div>
              <div className="settings-switch-control"></div>
            </div>

            <div className="settings-save-action-bar" style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="settings-status-indicator"></span>
                <span style={{ fontSize: "0.88rem", color: "#d1c1d4" }}>
                  Answers protected by confidential zero-leak vaults
                </span>
              </div>
              <button type="submit" className="settings-save-primary-btn" disabled={saving}>
                <span>{saving ? "Saving answers…" : "Save My Desires"}</span>
                <Icon name="sparkle" />
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* AI Speech-to-Text Transcription Box */}
            <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ background: "linear-gradient(180deg, #24112c 0%, #17091d 100%)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-pink bg-pink/10 border border-pink/20">
                  <Icon name="sparkle" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="profile-step-badge" style={{ color: "#f43f5e", marginBottom: "4px" }}>
                    WHISPER AI VOICE
                  </div>
                  <h2>Speak your desires.</h2>
                  <p>Record or upload a voice clip. Whisper AI transcribes your voice note into your private note.</p>
                </div>
              </div>

              <form onSubmit={handleTranscribe} style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="flex flex-col gap-2 relative">
                  <label className="flex justify-between items-end mb-1">
                    <span>Voice recording (WAV / MP3)</span>
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      type="file"
                      className="profile-input"
                      accept="audio/wav,audio/mp3,audio/m4a,audio/webm"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      style={{ padding: "10px" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
                  disabled={transcribing || !audioFile}
                  style={{ width: "100%", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <Icon name="sparkle" />
                  <span>{transcribing ? "Transcribing voice…" : "Transcribe Voice Note"}</span>
                </button>
              </form>
            </div>

            <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", margin: "0 0 8px" }}>
                Consent is revocable.
              </h3>
              <p style={{ fontSize: "0.86rem", color: "#bfaabf", lineHeight: "1.5", margin: "0 0 16px" }}>
                Your desires quiz answers are solely used for deterministic compatibility matching. You can delete or modify answers at any time.
              </p>
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
                onClick={() => navigate("privacy")}
                style={{ width: "100%", minHeight: "38px", fontSize: "0.84rem" }}
              >
                Review privacy policies ↗
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
