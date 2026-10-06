import React, { useState } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { title, portraitClass } from "../../utils/formatters";

export default function ProfileView() {
  const { state, updateProfile, logout, navigate, showToast } = useApp();
  const p = state.me?.profile || {};

  if (!state.me?.profile) {
    return <Loader text="Loading your profile…" fullScreen />;
  }

  // Toggle between showcase view and edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "story" | "preferences" | "boundaries"

  const [formData, setFormData] = useState({
    pseudonym: p.pseudonym || "",
    avatar: p.avatar || p.photo || "",
    photo: p.avatar || p.photo || "",
    age: p.age || 28,
    gender: p.gender || "woman",
    intent: p.intent || "connection",
    zone: p.zone || "central",
    bio: p.bio || "",
    interests: p.interests || [],
    acceptedGenders: p.acceptedGenders || ["woman", "man", "nonbinary"],
    minAge: p.minAge || 21,
    maxAge: p.maxAge || 50,
    preferredMin: p.preferredAge?.[0] || 25,
    preferredMax: p.preferredAge?.[1] || 40,
    acceptedIntents: p.acceptedIntents || ["connection", "conversation"],
    acceptedZones: p.acceptedZones || ["central", "riverside", "arts-quarter"],
    availability: p.availability || ["evening", "weekend"],
    boundaries: p.boundaries || ["ask-before-calling"],
    acceptedBoundaries: p.acceptedBoundaries || ["ask-before-calling", "no-location-sharing"],
    privacy: p.privacy || "private",
    communication: p.communication || "text",
    discoverable: p.discoverable ?? true,
    incognito: p.incognito ?? false,
    voice: p.channels?.voice ?? true,
    audio: p.channels?.audio ?? true,
    video: p.channels?.video ?? true,
  });

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (showToast) showToast("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      setFormData((prev) => ({
        ...prev,
        avatar: base64Data,
        photo: base64Data,
      }));
      if (showToast) showToast("Photo loaded! Click 'Save Profile' to apply everywhere. 📸");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: "",
      photo: "",
    }));
    if (showToast) showToast("Photo reset to default avatar.");
  };

  const handleInterestToggle = (item) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(item);
      const next = exists
        ? prev.interests.filter((x) => x !== item)
        : [...prev.interests, item];
      return { ...prev, interests: next };
    });
  };

  const handleMultiToggle = (field, item) => {
    setFormData((prev) => {
      const exists = prev[field].includes(item);
      const next = exists
        ? prev[field].filter((x) => x !== item)
        : [...prev[field], item];
      return { ...prev, [field]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanPseudonym = (formData.pseudonym || "").trim();
    const cleanBio = (formData.bio || "").trim();
    const ageNum = Number(formData.age);

    // 1. Pseudonym Validation
    if (!cleanPseudonym) {
      setError("Please enter a pseudonym / display name.");
      if (showToast) showToast("Pseudonym is required.");
      return;
    }
    if (cleanPseudonym.length < 2 || cleanPseudonym.length > 30) {
      setError("Pseudonym must be between 2 and 30 characters.");
      if (showToast) showToast("Pseudonym must be 2 to 30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_\s-]+$/.test(cleanPseudonym)) {
      setError("Pseudonym contains invalid characters. Use letters, numbers, spaces, or underscores only.");
      if (showToast) showToast("Pseudonym contains invalid characters.");
      return;
    }

    // 2. Age Validation (21+ Mandatory)
    if (isNaN(ageNum) || ageNum < 21) {
      setError("You must be 21 years or older to join Juicy Match.");
      if (showToast) showToast("You must be 21 or older.");
      return;
    }
    if (ageNum > 99) {
      setError("Please enter a valid age between 21 and 99.");
      if (showToast) showToast("Please enter a valid age between 21 and 99.");
      return;
    }

    // 3. Bio Statement Validation
    if (!cleanBio) {
      setError("Please write a short bio or vibe statement.");
      if (showToast) showToast("Please write a short bio statement.");
      return;
    }
    if (cleanBio.length < 10) {
      setError("Bio statement must be at least 10 characters long.");
      if (showToast) showToast("Bio must be at least 10 characters long.");
      return;
    }
    if (cleanBio.length > 300) {
      setError("Bio statement exceeds maximum 300 characters limit.");
      if (showToast) showToast("Bio exceeds 300 characters limit.");
      return;
    }

    // 4. Interests / Desires Selection
    if (!formData.interests || formData.interests.length === 0) {
      setError("Please select at least 1 desire or interest tag.");
      if (showToast) showToast("Please select at least 1 interest tag.");
      return;
    }

    // 5. Accepted Genders Selection
    if (!formData.acceptedGenders || formData.acceptedGenders.length === 0) {
      setError("Please select at least 1 gender preference you'd like to meet.");
      if (showToast) showToast("Please select at least 1 gender preference.");
      return;
    }

    // 6. Age Range Discovery Boundaries
    if (formData.minAge > formData.maxAge) {
      setError("Minimum age cannot exceed maximum age.");
      if (showToast) showToast("Minimum age cannot exceed maximum age.");
      return;
    }

    if (
      formData.preferredMin < formData.minAge ||
      formData.preferredMax > formData.maxAge ||
      formData.preferredMin > formData.preferredMax
    ) {
      setError("Preferred age range must be within your minimum and maximum age bounds.");
      if (showToast) showToast("Preferred age range must be within bounds.");
      return;
    }

    const updated = {
      ...p,
      pseudonym: cleanPseudonym,
      avatar: formData.avatar || formData.photo || "",
      photo: formData.avatar || formData.photo || "",
      age: ageNum,
      gender: formData.gender,
      intent: formData.intent,
      zone: formData.zone,
      bio: cleanBio,
      interests: formData.interests,
      acceptedGenders: formData.acceptedGenders,
      minAge: Number(formData.minAge),
      maxAge: Number(formData.maxAge),
      preferredAge: [Number(formData.preferredMin), Number(formData.preferredMax)],
      acceptedIntents: formData.acceptedIntents,
      acceptedZones: formData.acceptedZones,
      availability: formData.availability,
      boundaries: formData.boundaries,
      acceptedBoundaries: formData.acceptedBoundaries,
      privacy: formData.privacy,
      communication: formData.communication,
      discoverable: formData.discoverable && !formData.incognito,
      incognito: formData.incognito,
      channels: {
        voice: formData.voice,
        audio: formData.audio,
        video: formData.video,
      },
    };

    setIsSaving(true);
    try {
      await updateProfile(updated);
      if (showToast) showToast("Profile updated successfully! ✨");
      setIsEditing(false); // Switch back to profile view showcase
    } catch (err) {
      setError(err.message || "Failed to update profile.");
      if (showToast) showToast(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const DEFAULT_INTENTS = [
    { id: "connection", label: "Meaningful Connection" },
    { id: "romance", label: "Dating & Romance" },
    { id: "conversation", label: "Deep Conversation" },
    { id: "casual", label: "Spontaneous Adventures" },
    { id: "travel", label: "Travel Companion" },
  ];

  const DEFAULT_ZONES = [
    { id: "central", label: "Central Metro" },
    { id: "riverside", label: "Riverside & Downtown" },
    { id: "arts-quarter", label: "Arts & Cultural Quarter" },
    { id: "north", label: "North Suburbs" },
    { id: "west", label: "West Bay" },
  ];

  const masters = (group) => state.config?.masters?.[group] || [];

  const intentOptions = masters("intent").length > 0 ? masters("intent") : DEFAULT_INTENTS;
  const zoneOptions = masters("geography").length > 0 ? masters("geography") : DEFAULT_ZONES;

  const getMasterLabel = (group, id) => {
    const list = group === "intent" ? intentOptions : group === "geography" ? zoneOptions : masters(group);
    const item = list.find((x) => x.id === id);
    return item ? item.label : title(id);
  };

  const userPortraitClass = portraitClass(p);
  const currentAvatarPhoto = p.avatar || p.photo;

  return (
    <div className="profile-container">
      <PageHead
        kicker="My Profile"
        heading={isEditing ? "Edit Profile" : "Profile & Preferences"}
        description={
          isEditing
            ? "Update your bio, location, and connection preferences."
            : "Manage your profile details, bio, and personal preferences."
        }
        action={
          <button
            type="button"
            className="button quiet"
            onClick={() => navigate("assist")}
            style={{ fontSize: "0.86rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="sparkle" />
            <span>AI Profile Coach</span>
          </button>
        }
      />

      <div className="two-col">
        <main>
          {/* ============================================================
              MODE 1: PROFILE SHOWCASE / DETAILS VIEW (DEFAULT)
              ============================================================ */}
          {!isEditing ? (
            <div>
              {/* Profile Hero Card */}
              <div className="profile-hero-showcase">
                <div className="profile-hero-top-row">
                  <div className="profile-avatar-wrapper">
                    {currentAvatarPhoto ? (
                      <div className="profile-hero-avatar custom-photo">
                        <img
                          src={currentAvatarPhoto}
                          alt={p.pseudonym || "Profile"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "50%",
                            display: "block",
                          }}
                        />
                      </div>
                    ) : (
                      <div className={`profile-hero-avatar portrait ${userPortraitClass}`}>
                        {!userPortraitClass && (
                          <span className="profile-hero-avatar-fallback">
                            {(p.pseudonym || "U")[0]}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="profile-avatar-online-dot" title="Active now"></span>
                  </div>

                  <div className="profile-hero-info">
                    <div className="profile-hero-name-row">
                      <h2 className="profile-hero-name">{p.pseudonym || "Anonymous"}</h2>
                      <span className="profile-hero-age">{p.age}</span>
                      <span className="profile-hero-verified-badge">
                        <Icon name="check" /> Verified Member
                      </span>
                    </div>

                    <div className="profile-hero-badges-row">
                      <span className="profile-hero-pill">
                        <Icon name="compass" />
                        <span>{getMasterLabel("geography", p.zone)}</span>
                      </span>

                      <span className="profile-hero-pill">
                        <Icon name="sparkle" />
                        <span>{getMasterLabel("intent", p.intent)}</span>
                      </span>

                      <span className="profile-hero-pill">
                        <Icon name="user" />
                        <span>{title(p.gender || "woman")}</span>
                      </span>

                      <span className="profile-hero-pill">
                        <Icon name="shield" />
                        <span>{title(p.privacy || "private")}</span>
                      </span>
                    </div>
                  </div>

                  <div className="profile-hero-actions">
                    <button
                      type="button"
                      className="profile-edit-btn-main"
                      onClick={() => setIsEditing(true)}
                    >
                      <Icon name="settings" />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="profile-hero-bio-box">
                  <p>
                    {p.bio || "No bio added yet. Click 'Edit Profile' to share a glimpse of your world."}
                  </p>
                </div>
              </div>

              {/* Profile Details Overview Grid */}
              <div className="profile-overview-grid">
                {/* Things I Love */}
                <div className="profile-info-card full-width">
                  <div className="profile-info-card-header">
                    <div className="profile-info-card-title">
                      <Icon name="heart" />
                      <span>The Things You Love</span>
                    </div>
                    <span className="chip-count-pill">
                      {p.interests?.length || 0} selected
                    </span>
                  </div>
                  <div className="profile-chips-container">
                    {p.interests && p.interests.length > 0 ? (
                      p.interests.map((intId) => (
                        <span key={intId} className="profile-tag-pill interest-pill">
                          ✧ {getMasterLabel("lifestyle-interests", intId)}
                        </span>
                      ))
                    ) : (
                      <span className="muted small">No lifestyle interests selected yet.</span>
                    )}
                  </div>
                </div>

                {/* Match Preferences Card */}
                <div className="profile-info-card">
                  <div className="profile-info-card-header">
                    <div className="profile-info-card-title">
                      <Icon name="discover" />
                      <span>Match Preferences</span>
                    </div>
                  </div>
                  <div className="profile-info-list">
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Interested in:</span>
                      <span className="profile-info-row-value">
                        {p.acceptedGenders?.map(title).join(", ") || "All genders"}
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Age range:</span>
                      <span className="profile-info-row-value">
                        {p.minAge || 21} – {p.maxAge || 50} yrs (Pref: {p.preferredAge?.[0] || 25}–{p.preferredAge?.[1] || 40})
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Open to intents:</span>
                      <span className="profile-info-row-value">
                        {p.acceptedIntents?.map((id) => getMasterLabel("intent", id)).join(", ") || "Any"}
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Accepted areas:</span>
                      <span className="profile-info-row-value">
                        {p.acceptedZones?.map((id) => getMasterLabel("geography", id)).join(", ") || "All zones"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Boundaries & Pace Card */}
                <div className="profile-info-card">
                  <div className="profile-info-card-header">
                    <div className="profile-info-card-title">
                      <Icon name="shield" />
                      <span>Boundaries & Privacy</span>
                    </div>
                  </div>
                  <div className="profile-info-list">
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Profile visibility:</span>
                      <span className="profile-info-row-value">
                        {p.discoverable && !p.incognito ? "Discoverable ✨" : "Incognito 🕵️"}
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Preferred chat:</span>
                      <span className="profile-info-row-value">
                        {p.communication === "voice" ? "Voice First 🎙️" : "Text First 💬"}
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-row-label">Voice messages:</span>
                      <span className="profile-info-row-value">
                        {p.channels?.voice ? "Allowed ✅" : "Restricted ❌"}
                      </span>
                    </div>
                  </div>
                  <div className="profile-chips-container" style={{ marginTop: "10px" }}>
                    {p.boundaries?.map((bId) => (
                      <span key={bId} className="profile-tag-pill boundary-pill">
                        🛡️ {getMasterLabel("boundaries", bId)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================
               MODE 2: EDIT PROFILE FORM (INTERACTIVE STEPS)
               ============================================================ */
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: "rgba(225, 29, 72, 0.15)",
                    border: "1px solid rgba(225, 29, 72, 0.4)",
                    borderRadius: "14px",
                    padding: "12px 18px",
                    marginBottom: "16px",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Back to Profile Top Bar */}
              <div className="profile-edit-mode-topbar">
                <button
                  type="button"
                  className="profile-back-to-view-btn"
                  onClick={() => setIsEditing(false)}
                >
                  <Icon name="back" />
                  <span>Back to Profile View</span>
                </button>
                <span className="profile-edit-mode-heading">
                  <Icon name="sparkle" /> Editing Mode
                </span>
              </div>

              {/* Interactive Stepper Navigation */}
              <div className="profile-stepper-nav">
                <button
                  type="button"
                  className={`profile-step-btn ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  <span className="step-num-badge">ALL</span>
                  <span>All</span>
                </button>
                <button
                  type="button"
                  className={`profile-step-btn ${activeTab === "story" ? "active" : ""}`}
                  onClick={() => setActiveTab("story")}
                >
                  <span className="step-num-badge">01</span>
                  <span>Story</span>
                </button>
                <button
                  type="button"
                  className={`profile-step-btn ${activeTab === "preferences" ? "active" : ""}`}
                  onClick={() => setActiveTab("preferences")}
                >
                  <span className="step-num-badge">02</span>
                  <span>Preferences</span>
                </button>
                <button
                  type="button"
                  className={`profile-step-btn ${activeTab === "boundaries" ? "active" : ""}`}
                  onClick={() => setActiveTab("boundaries")}
                >
                  <span className="step-num-badge">03</span>
                  <span>Privacy</span>
                </button>
              </div>

              {/* Section 01: Your Story */}
              {(activeTab === "all" || activeTab === "story") && (
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="profile-section-icon-badge">
                      <Icon name="user" />
                    </div>
                    <div className="profile-section-titles">
                      <h2>01 · Your Story</h2>
                      <p>How you introduce yourself to potential matches.</p>
                    </div>
                  </div>

                  {/* Profile Picture Upload Section */}
                  <div className="profile-photo-upload-container">
                    <div className="profile-photo-preview-wrap">
                      {formData.avatar || formData.photo ? (
                        <img
                          src={formData.avatar || formData.photo}
                          alt="Avatar Preview"
                          className="profile-photo-preview-img"
                        />
                      ) : (
                        <div className={`profile-hero-avatar portrait ${userPortraitClass}`}>
                          <span className="profile-hero-avatar-fallback">
                            {(formData.pseudonym || p.pseudonym || "U")[0]}
                          </span>
                        </div>
                      )}
                      <label className="profile-photo-badge-upload" title="Choose Photo">
                        <Icon name="sparkle" />
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          onChange={handlePhotoUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    <div className="profile-photo-upload-meta">
                      <div className="profile-photo-btn-row">
                        <label className="profile-upload-primary-btn">
                          <Icon name="sparkle" />
                          <span>Choose New Photo</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            onChange={handlePhotoUpload}
                            style={{ display: "none" }}
                          />
                        </label>

                        {(formData.avatar || formData.photo) && (
                          <button
                            type="button"
                            className="profile-upload-remove-btn"
                            onClick={handleRemovePhoto}
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                      <p className="profile-photo-help-text">
                        JPEG, PNG, or WEBP (Max 5MB). Your uploaded photo will be instantly synced across your profile, direct messages, voice/video calls, and member cards.
                      </p>
                    </div>
                  </div>

                  <div className="profile-form-grid">
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Pseudonym</span>
                        <span className="profile-field-hint">Public display name</span>
                      </label>
                      <div className="profile-input-wrap">
                        <input
                          type="text"
                          className="profile-input"
                          required
                          minLength={2}
                          maxLength={40}
                          value={formData.pseudonym}
                          onChange={(e) =>
                            setFormData({ ...formData, pseudonym: e.target.value })
                          }
                          placeholder="e.g. Nicole"
                        />
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Age</span>
                        <span className="profile-field-hint">
                          Min {state.config.minimumAge || 21}
                        </span>
                      </label>
                      <div className="profile-input-wrap">
                        <input
                          type="number"
                          className="profile-input"
                          required
                          min={state.config.minimumAge || 21}
                          max={100}
                          value={formData.age}
                          onChange={(e) =>
                            setFormData({ ...formData, age: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>I identify as</span>
                      </label>
                      <div className="profile-select-wrap">
                        <select
                          className="profile-select"
                          value={formData.gender}
                          onChange={(e) =>
                            setFormData({ ...formData, gender: e.target.value })
                          }
                        >
                          <option value="woman">Woman</option>
                          <option value="man">Man</option>
                          <option value="nonbinary">Nonbinary</option>
                        </select>
                        <div className="profile-select-arrow">
                          <Icon name="chevronDown" />
                        </div>
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>I’m here for</span>
                      </label>
                      <div className="profile-select-wrap">
                        <select
                          className="profile-select"
                          value={formData.intent}
                          onChange={(e) =>
                            setFormData({ ...formData, intent: e.target.value })
                          }
                        >
                          {intentOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <div className="profile-select-arrow">
                          <Icon name="chevronDown" />
                        </div>
                      </div>
                    </div>

                    <div className="profile-field-group full-col">
                      <label className="profile-field-label">
                        <span>My area / Zone</span>
                        <span className="profile-field-hint">
                          Your neighborhood atmosphere
                        </span>
                      </label>
                      <div className="profile-select-wrap">
                        <select
                          className="profile-select"
                          value={formData.zone}
                          onChange={(e) =>
                            setFormData({ ...formData, zone: e.target.value })
                          }
                        >
                          {zoneOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <div className="profile-select-arrow">
                          <Icon name="chevronDown" />
                        </div>
                      </div>
                    </div>

                    <div className="profile-field-group full-col">
                      <label className="profile-field-label">
                        <span>A glimpse of your world</span>
                        <span className="profile-field-hint">Bio & vibe</span>
                      </label>
                      <div className="profile-textarea-wrap">
                        <textarea
                          className="profile-textarea"
                          maxLength={500}
                          rows={4}
                          value={formData.bio}
                          onChange={(e) =>
                            setFormData({ ...formData, bio: e.target.value })
                          }
                          placeholder="A good playlist, fine wine, late night conversation and a little curiosity…"
                        ></textarea>
                        <span className="profile-char-counter">
                          {formData.bio?.length || 0} / 500
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lifestyle Interests */}
                  <div className="profile-chips-group">
                    <div className="profile-chips-label">
                      <span>The things you love</span>
                      <span className="chip-count-pill">
                        {formData.interests.length} selected
                      </span>
                    </div>
                    <div className="profile-chips-container">
                      {masters("lifestyle-interests").map((item) => {
                        const isSelected = formData.interests.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`profile-chip-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleInterestToggle(item.id)}
                          >
                            {isSelected && <span className="profile-chip-check-icon">✓</span>}
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 02: Match Preferences */}
              {(activeTab === "all" || activeTab === "preferences") && (
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="profile-section-icon-badge">
                      <Icon name="heart" />
                    </div>
                    <div className="profile-section-titles">
                      <h2>02 · Your Connection Preferences</h2>
                      <p>Define who you want to discover and meet.</p>
                    </div>
                  </div>

                  <div className="profile-chips-group">
                    <div className="profile-chips-label">
                      <span>I’d like to meet</span>
                      <span className="chip-count-pill">
                        {formData.acceptedGenders.length} selected
                      </span>
                    </div>
                    <div className="profile-chips-container">
                      {["woman", "man", "nonbinary"].map((g) => {
                        const isSelected = formData.acceptedGenders.includes(g);
                        return (
                          <div
                            key={g}
                            className={`profile-chip-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleMultiToggle("acceptedGenders", g)}
                          >
                            {isSelected && <span className="profile-chip-check-icon">✓</span>}
                            <span>{title(g)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="profile-form-grid grid-4">
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Min age</span>
                      </label>
                      <input
                        type="number"
                        className="profile-input"
                        min={21}
                        max={100}
                        value={formData.minAge}
                        onChange={(e) =>
                          setFormData({ ...formData, minAge: e.target.value })
                        }
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Max age</span>
                      </label>
                      <input
                        type="number"
                        className="profile-input"
                        min={21}
                        max={100}
                        value={formData.maxAge}
                        onChange={(e) =>
                          setFormData({ ...formData, maxAge: e.target.value })
                        }
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Preferred from</span>
                      </label>
                      <input
                        type="number"
                        className="profile-input"
                        min={21}
                        max={100}
                        value={formData.preferredMin}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredMin: e.target.value })
                        }
                      />
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Preferred to</span>
                      </label>
                      <input
                        type="number"
                        className="profile-input"
                        min={21}
                        max={100}
                        value={formData.preferredMax}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredMax: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="profile-chips-group">
                    <div className="profile-chips-label">
                      <span>Open to intents</span>
                      <span className="chip-count-pill">
                        {formData.acceptedIntents.length} selected
                      </span>
                    </div>
                    <div className="profile-chips-container">
                      {masters("intent").map((opt) => {
                        const isSelected = formData.acceptedIntents.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`profile-chip-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleMultiToggle("acceptedIntents", opt.id)}
                          >
                            {isSelected && <span className="profile-chip-check-icon">✓</span>}
                            <span>{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="profile-chips-group">
                    <div className="profile-chips-label">
                      <span>Areas I’m open to explore</span>
                      <span className="chip-count-pill">
                        {formData.acceptedZones.length} selected
                      </span>
                    </div>
                    <div className="profile-chips-container">
                      {masters("geography").map((opt) => {
                        const isSelected = formData.acceptedZones.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`profile-chip-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleMultiToggle("acceptedZones", opt.id)}
                          >
                            {isSelected && <span className="profile-chip-check-icon">✓</span>}
                            <span>{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 03: Boundaries & Privacy */}
              {(activeTab === "all" || activeTab === "boundaries") && (
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="profile-section-icon-badge">
                      <Icon name="shield" />
                    </div>
                    <div className="profile-section-titles">
                      <h2>03 · Set Your Own Pace & Privacy</h2>
                      <p>Your boundaries are always respected and prioritized.</p>
                    </div>
                  </div>

                  <div className="profile-chips-group">
                    <div className="profile-chips-label">
                      <span>My personal boundaries</span>
                      <span className="chip-count-pill">
                        {formData.boundaries.length} active
                      </span>
                    </div>
                    <div className="profile-chips-container">
                      {masters("boundaries").map((opt) => {
                        const isSelected = formData.boundaries.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`profile-chip-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleMultiToggle("boundaries", opt.id)}
                          >
                            {isSelected && <span className="profile-chip-check-icon">✓</span>}
                            <span>{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="profile-form-grid">
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Profile Privacy</span>
                      </label>
                      <div className="profile-select-wrap">
                        <select
                          className="profile-select"
                          value={formData.privacy}
                          onChange={(e) =>
                            setFormData({ ...formData, privacy: e.target.value })
                          }
                        >
                          <option value="private">Private (Only mutual matches)</option>
                          <option value="controlled">Controlled (Verified members)</option>
                          <option value="open">Open (All discoverable members)</option>
                        </select>
                        <div className="profile-select-arrow">
                          <Icon name="chevronDown" />
                        </div>
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        <span>Preferred Communication</span>
                      </label>
                      <div className="profile-select-wrap">
                        <select
                          className="profile-select"
                          value={formData.communication}
                          onChange={(e) =>
                            setFormData({ ...formData, communication: e.target.value })
                          }
                        >
                          <option value="text">Text Messages First</option>
                          <option value="voice">Voice Notes Welcome</option>
                        </select>
                        <div className="profile-select-arrow">
                          <Icon name="chevronDown" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* iOS-Style Toggle Switches */}
                  <div className="profile-toggles-stack">
                    <div
                      className={`profile-toggle-row ${formData.discoverable ? "checked" : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, discoverable: !formData.discoverable })
                      }
                    >
                      <div className="profile-toggle-text">
                        <span className="profile-toggle-title">Discoverable in Feed</span>
                        <span className="profile-toggle-desc">
                          Make my profile visible to eligible members matching my criteria
                        </span>
                      </div>
                      <div className="profile-switch-ui"></div>
                    </div>

                    <div
                      className={`profile-toggle-row ${formData.incognito ? "checked" : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, incognito: !formData.incognito })
                      }
                    >
                      <div className="profile-toggle-text">
                        <span className="profile-toggle-title">Incognito Mode</span>
                        <span className="profile-toggle-desc">
                          Browse privately without leaving traces on other profiles
                        </span>
                      </div>
                      <div className="profile-switch-ui"></div>
                    </div>

                    <div
                      className={`profile-toggle-row ${formData.voice ? "checked" : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, voice: !formData.voice })
                      }
                    >
                      <div className="profile-toggle-text">
                        <span className="profile-toggle-title">Allow Voice Messages & Calls</span>
                        <span className="profile-toggle-desc">
                          Permit connections to exchange audio notes and secure calls
                        </span>
                      </div>
                      <div className="profile-switch-ui"></div>
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="form-error">{error}</p>}

              {/* Action Button Bar */}
              <div className="profile-save-action-bar">
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => setIsEditing(false)}
                  style={{ marginRight: "auto" }}
                >
                  Cancel
                </button>
                <button type="submit" className="profile-save-btn" disabled={isSaving}>
                  {isSaving ? (
                    <>Saving changes…</>
                  ) : (
                    <>
                      <span>Save profile changes</span>
                      <Icon name="check" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>

        {/* Right Aside Panel */}
        <aside className="stack">
          <div className="profile-aside-panel">
            <div className="profile-aside-eyebrow">
              <Icon name="sparkle" />
              <span>YOUR CHOICES MATTER</span>
            </div>
            <h2 className="profile-aside-title">Room to be yourself.</h2>
            <p className="profile-aside-desc">
              You can change your preferences, pause discovery, or customize your desires whenever you need.
            </p>
            <button
              type="button"
              className="profile-aside-cta"
              onClick={() => navigate("desires")}
            >
              <span>Explore your desires</span>
              <Icon name="arrowUpRight" />
            </button>
          </div>

          <div className="profile-menu-list">
            <div
              className="profile-menu-item"
              onClick={() => navigate("album")}
            >
              <div className="profile-menu-icon-wrap purple">
                <Icon name="lock" />
              </div>
              <div className="profile-menu-body">
                <span className="profile-menu-title">Private photos & permissions</span>
                <span className="profile-menu-desc">Manage encrypted albums</span>
              </div>
              <div className="profile-menu-arrow">
                <Icon name="arrow" />
              </div>
            </div>

            <div
              className="profile-menu-item"
              onClick={() => navigate("settings")}
            >
              <div className="profile-menu-icon-wrap rose">
                <Icon name="settings" />
              </div>
              <div className="profile-menu-body">
                <span className="profile-menu-title">Preferences & Settings</span>
                <span className="profile-menu-desc">Sound & alert preferences</span>
              </div>
              <div className="profile-menu-arrow">
                <Icon name="arrow" />
              </div>
            </div>

            <div
              className="profile-menu-item"
              onClick={() => navigate("privacy")}
            >
              <div className="profile-menu-icon-wrap emerald">
                <Icon name="shield" />
              </div>
              <div className="profile-menu-body">
                <span className="profile-menu-title">Privacy & consent</span>
                <span className="profile-menu-desc">Audit logs & security rules</span>
              </div>
              <div className="profile-menu-arrow">
                <Icon name="arrow" />
              </div>
            </div>

            <div
              className="profile-menu-item"
              onClick={() => navigate("membership")}
            >
              <div className="profile-menu-icon-wrap amber">
                <Icon name="discover" />
              </div>
              <div className="profile-menu-body">
                <span className="profile-menu-title">Membership & statements</span>
                <span className="profile-menu-desc">Tier perks & billing</span>
              </div>
              <div className="profile-menu-arrow">
                <Icon name="arrow" />
              </div>
            </div>
          </div>

          <div className="profile-signout-wrapper">
            <button type="button" className="profile-signout-btn" onClick={logout}>
              <Icon name="logout" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

