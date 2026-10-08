import React, { useState } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { title, portraitClass } from "../../../utils/formatters";
import ProfileShowcase from "./ProfileShowcase";
import ProfileEditForm from "./ProfileEditForm";

export const DEFAULT_INTENTS = [
  { id: "connection", label: "Meaningful Connection" },
  { id: "romance", label: "Dating & Romance" },
  { id: "conversation", label: "Deep Conversation" },
  { id: "casual", label: "Spontaneous Adventures" },
  { id: "travel", label: "Travel Companion" },
];

export const DEFAULT_ZONES = [
  { id: "central", label: "Central Metro" },
  { id: "riverside", label: "Riverside & Downtown" },
  { id: "arts-quarter", label: "Arts & Cultural Quarter" },
  { id: "north", label: "North Suburbs" },
  { id: "west", label: "West Bay" },
];

export const DEFAULT_INTERESTS = [
  { id: "art", label: "Art & Exhibitions" },
  { id: "music", label: "Live Music & Concerts" },
  { id: "books", label: "Literature & Books" },
  { id: "travel", label: "Travel & Exploration" },
  { id: "wine", label: "Fine Wine & Dining" },
  { id: "fitness", label: "Fitness & Wellness" },
  { id: "cinema", label: "Film & Cinema" },
  { id: "nature", label: "Nature & Outdoors" },
  { id: "tech", label: "Tech & Innovation" },
  { id: "photography", label: "Photography" },
  { id: "architecture", label: "Architecture & Design" },
  { id: "fashion", label: "Fashion & Style" },
];

export const DEFAULT_BOUNDARIES = [
  { id: "ask-before-calling", label: "Ask before calling" },
  { id: "no-location-sharing", label: "Keep location private" },
  { id: "respect-quiet-hours", label: "Respect quiet hours" },
  { id: "text-first", label: "Text chat first" },
  { id: "no-unsolicited-photos", label: "No unsolicited media" },
  { id: "slow-pace", label: "Take things slow" },
];

export default function ProfileView() {
  const { state, updateProfile, navigate, showToast } = useApp();
  const p = state.me?.profile || {};

  if (!state.me?.profile) {
    return <Loader text="Loading your profile…" fullScreen />;
  }

  // Toggle between showcase view and edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "story" | "preferences" | "boundaries" | "account"

  const [formData, setFormData] = useState({
    pseudonym: p.pseudonym || "",
    avatar: p.avatar || p.photo || "",
    photo: p.avatar || p.photo || "",
    age: p.age || 28,
    gender: p.gender || "woman",
    intent: p.intent || "connection",
    zone: p.zone || "central",
    bio: p.bio || "",
    interests: p.interests || ["art", "music", "books"],
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

  // Sync formData whenever profile changes
  const resetForm = () => {
    setFormData({
      pseudonym: p.pseudonym || "",
      avatar: p.avatar || p.photo || "",
      photo: p.avatar || p.photo || "",
      age: p.age || 28,
      gender: p.gender || "woman",
      intent: p.intent || "connection",
      zone: p.zone || "central",
      bio: p.bio || "",
      interests: p.interests || ["art", "music", "books"],
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
    setError("");
  };

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
      if (showToast) showToast("Photo uploaded! Click 'Save Profile' to apply changes. 📸");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: "",
      photo: "",
    }));
    if (showToast) showToast("Photo removed. Default avatar will be used.");
  };

  const handleInterestToggle = (itemId) => {
    setFormData((prev) => {
      const current = prev.interests || [];
      const matchIndex = current.findIndex(
        (x) => String(x).toLowerCase() === String(itemId).toLowerCase()
      );
      let next;
      if (matchIndex >= 0) {
        next = current.filter((_, idx) => idx !== matchIndex);
      } else {
        next = [...current, itemId];
      }
      return { ...prev, interests: next };
    });
  };

  const handleMultiToggle = (field, itemId) => {
    setFormData((prev) => {
      const list = prev[field] || [];
      const matchIndex = list.findIndex(
        (x) => String(x).toLowerCase() === String(itemId).toLowerCase()
      );
      let next;
      if (matchIndex >= 0) {
        next = list.filter((_, idx) => idx !== matchIndex);
      } else {
        next = [...list, itemId];
      }
      return { ...prev, [field]: next };
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
    if (cleanPseudonym.length < 2 || cleanPseudonym.length > 40) {
      setError("Pseudonym must be between 2 and 40 characters.");
      if (showToast) showToast("Pseudonym must be 2 to 40 characters.");
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
    if (cleanBio && cleanBio.length > 500) {
      setError("Bio statement exceeds maximum 500 characters limit.");
      if (showToast) showToast("Bio exceeds 500 characters limit.");
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

    // 6. Age Range Discovery Boundaries - Normalized safely
    const minA = Math.min(Number(formData.minAge) || 21, Number(formData.maxAge) || 50);
    const maxA = Math.max(Number(formData.minAge) || 21, Number(formData.maxAge) || 50);
    const prefMin = Math.max(minA, Math.min(Number(formData.preferredMin) || minA, maxA));
    const prefMax = Math.min(maxA, Math.max(Number(formData.preferredMax) || maxA, prefMin));

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
      minAge: minA,
      maxAge: maxA,
      preferredAge: [prefMin, prefMax],
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
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
      if (showToast) showToast(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const masters = (group) => {
    if (state.config?.masters?.[group]?.length > 0) return state.config.masters[group];
    if (group === "lifestyle-interests") return DEFAULT_INTERESTS;
    if (group === "boundaries") return DEFAULT_BOUNDARIES;
    if (group === "intent") return DEFAULT_INTENTS;
    if (group === "geography") return DEFAULT_ZONES;
    return [];
  };

  const intentOptions = masters("intent").length > 0 ? masters("intent") : DEFAULT_INTENTS;
  const zoneOptions = masters("geography").length > 0 ? masters("geography") : DEFAULT_ZONES;
  const interestOptions = masters("lifestyle-interests").length > 0 ? masters("lifestyle-interests") : DEFAULT_INTERESTS;
  const boundaryOptions = masters("boundaries").length > 0 ? masters("boundaries") : DEFAULT_BOUNDARIES;

  const getMasterLabel = (group, id) => {
    if (!id) return "";
    let list = [];
    if (group === "intent") list = intentOptions;
    else if (group === "geography") list = zoneOptions;
    else if (group === "lifestyle-interests") list = interestOptions;
    else if (group === "boundaries") list = boundaryOptions;
    else list = masters(group);

    const item = list.find((x) => x.id === id || String(x.id).toLowerCase() === String(id).toLowerCase() || String(x.label).toLowerCase() === String(id).toLowerCase());
    return item ? item.label : title(id);
  };

  const userPortraitClass = portraitClass(p);
  const currentAvatarPhoto = p.avatar || p.photo;

  const startEditingSection = (sectionTab = "all") => {
    setActiveTab(sectionTab);
    setIsEditing(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen">
      <PageHead
        kicker="My Profile & Identity"
        heading={isEditing ? "Edit Profile & Preferences" : "Profile & Preferences"}
        description={
          isEditing
            ? "Fine-tune your story, match discovery filters, and privacy boundaries."
            : "Manage your persona, discovery preferences, and confidential safety rules."
        }
        action={
          <div className="flex items-center gap-3">
            {isEditing ? (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-[0.86rem] font-semibold transition-colors"
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
              >
                <Icon name="back" className="w-4 h-4" />
                <span>Exit Editing</span>
              </button>
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-pink hover:bg-[#ff2a85] text-white text-[0.86rem] font-semibold rounded-full shadow-[0_2px_12px_rgba(233,22,113,0.3)] transition-all"
                onClick={() => startEditingSection("all")}
              >
                <Icon name="sparkle" className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              type="button"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-[0.86rem] font-semibold transition-colors"
              onClick={() => navigate("assist")}
            >
              <Icon name="sparkle" className="w-4 h-4 text-pink" />
              <span>AI Coach</span>
            </button>
          </div>
        }
      />

      <div className="mt-5">
        {!isEditing ? (
          <ProfileShowcase
            p={p}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            startEditingSection={startEditingSection}
            getMasterLabel={getMasterLabel}
            userPortraitClass={userPortraitClass}
            currentAvatarPhoto={currentAvatarPhoto}
            interestOptions={interestOptions}
            boundaryOptions={boundaryOptions}
            intentOptions={intentOptions}
            zoneOptions={zoneOptions}
            onPhotoUploadDirect={handlePhotoUpload}
          />
        ) : (
          <ProfileEditForm
            formData={formData}
            setFormData={setFormData}
            p={p}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setIsEditing={setIsEditing}
            handleSubmit={handleSubmit}
            handlePhotoUpload={handlePhotoUpload}
            handleRemovePhoto={handleRemovePhoto}
            handleInterestToggle={handleInterestToggle}
            handleMultiToggle={handleMultiToggle}
            error={error}
            isSaving={isSaving}
            intentOptions={intentOptions}
            zoneOptions={zoneOptions}
            interestOptions={interestOptions}
            boundaryOptions={boundaryOptions}
            masters={masters}
            userPortraitClass={userPortraitClass}
            state={state}
          />
        )}
      </div>
    </div>
  );
}
