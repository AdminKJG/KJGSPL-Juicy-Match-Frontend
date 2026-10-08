import React from "react";
import Icon from "../../common/Icon";
import { title } from "../../../utils/formatters";

export default function ProfileShowcase({
  p = {},
  activeTab = "overview",
  setActiveTab,
  startEditingSection,
  getMasterLabel,
  userPortraitClass,
  currentAvatarPhoto,
  interestOptions = [],
  boundaryOptions = [],
  intentOptions = [],
  zoneOptions = [],
  onPhotoUploadDirect,
}) {
  const tabs = [
    { id: "overview",    label: "Overview",            icon: "sparkle" },
    { id: "story",       label: "Story & Passions",    icon: "user" },
    { id: "preferences", label: "Match Preferences",   icon: "discover" },
    { id: "boundaries",  label: "Privacy & Boundaries",icon: "shield" },
    { id: "account",     label: "Account Details",     icon: "lock" },
  ];

  const currentTab = activeTab || "overview";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── PROFILE HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#24102c] via-[#180b1f] to-[#120718] border border-white/10 p-6 sm:p-8 shadow-2xl">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-lilac/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Avatar with Camera Overlay */}
          <div className="relative shrink-0 group">
            {currentAvatarPhoto ? (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-pink/40 shadow-2xl overflow-hidden bg-black/60 relative">
                <img
                  src={currentAvatarPhoto}
                  alt={p.pseudonym || "Profile"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-pink/40 shadow-2xl bg-gradient-to-br from-pink to-lilac flex items-center justify-center font-serif font-bold text-4xl sm:text-5xl text-white ${userPortraitClass}`}>
                {!userPortraitClass && <span>{(p.pseudonym || "U")[0]}</span>}
              </div>
            )}
            
            {/* Quick Upload Button Overlay */}
            {onPhotoUploadDirect && (
              <label
                className="absolute bottom-0 right-0 w-10 h-10 bg-pink hover:bg-[#ff2a85] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#180b1f] hover:scale-110 transition-all"
                title="Change Photo"
              >
                <Icon name="sparkle" className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onPhotoUploadDirect}
                  className="hidden"
                />
              </label>
            )}

            {/* Active Status Beacon */}
            <span
              className="absolute top-1 right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#180b1f] shadow-[0_0_8px_#10b981]"
              title="Online & Ready to Spark"
            />
          </div>

          {/* User Bio & Meta Header */}
          <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start justify-center">
            <div className="flex items-center gap-3 mb-2 flex-wrap justify-center md:justify-start">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white m-0 tracking-tight">
                {p.pseudonym || "Anonymous"}
              </h1>
              <span className="text-2xl font-light text-white/70">{p.age}</span>
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <Icon name="check" className="w-3.5 h-3.5" />
                <span>Verified Member</span>
              </span>
            </div>

            {/* Tags Strip */}
            <div className="flex flex-wrap items-center gap-2 mt-1 justify-center md:justify-start">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-white font-medium">
                <Icon name="compass" className="w-3.5 h-3.5 text-pink" />
                <span>{getMasterLabel("geography", p.zone)}</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-white font-medium">
                <Icon name="sparkle" className="w-3.5 h-3.5 text-lilac" />
                <span>{getMasterLabel("intent", p.intent)}</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-white font-medium">
                <Icon name="user" className="w-3.5 h-3.5 text-muted" />
                <span>{title(p.gender || "woman")}</span>
              </span>
            </div>

            {/* Quote Bio Statement */}
            <div className="mt-4 w-full bg-white/[0.04] p-4 rounded-2xl border-l-4 border-pink">
              <p className="m-0 text-white/95 leading-relaxed text-sm sm:text-base italic font-serif">
                "{p.bio || "No bio added yet. Click 'Edit Profile' to introduce yourself."}"
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="shrink-0 flex flex-col gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-pink hover:bg-[#ff2a85] text-white font-bold text-sm shadow-[0_4px_20px_rgba(233,22,113,0.35)] transition-all cursor-pointer"
              onClick={() => startEditingSection("all")}
            >
              <Icon name="sparkle" className="w-4 h-4" />
              <span>Edit Full Profile</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              onClick={() => startEditingSection("preferences")}
            >
              <Icon name="discover" className="w-3.5 h-3.5 text-pink" />
              <span>Edit Preferences</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── PROFILE SECTION NAVIGATION TABS ── */}
      <div className="flex items-center overflow-x-auto no-scrollbar gap-2 p-1.5 bg-[#120716] rounded-2xl border border-white/[0.06]">
        {tabs.map((tab) => {
          const isCurrent = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shrink-0 font-semibold text-xs sm:text-sm transition-all duration-200 border cursor-pointer ${
                isCurrent
                  ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)] font-bold"
                  : "bg-transparent border-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon name={tab.icon} className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT: OVERVIEW ── */}
      {currentTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Persona & Passions */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* The Things You Love Card */}
            <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-7 shadow-xl border border-white/[0.08] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg">
                  <div className="w-9 h-9 rounded-xl bg-pink/15 text-pink flex items-center justify-center border border-pink/25">
                    <Icon name="heart" className="w-4 h-4" />
                  </div>
                  <span>The Things You Love</span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-pink hover:text-pink/80 flex items-center gap-1 transition-colors cursor-pointer"
                  onClick={() => startEditingSection("story")}
                >
                  <span>Edit</span>
                  <Icon name="chevronDown" className="w-3 h-3 -rotate-90" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {p.interests && p.interests.length > 0 ? (
                  p.interests.map((intId) => (
                    <span
                      key={intId}
                      className="px-3.5 py-1.5 rounded-full bg-pink/10 border border-pink/30 text-pink text-xs sm:text-sm font-medium shadow-[0_2px_8px_rgba(233,22,113,0.1)]"
                    >
                      ✦ {getMasterLabel("lifestyle-interests", intId)}
                    </span>
                  ))
                ) : (
                  <span className="text-muted text-sm italic">
                    No lifestyle interests selected yet. Click Edit to add some!
                  </span>
                )}
              </div>
            </div>

            {/* Match Preferences Card */}
            <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-7 shadow-xl border border-white/[0.08] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg">
                  <div className="w-9 h-9 rounded-xl bg-pink/15 text-pink flex items-center justify-center border border-pink/25">
                    <Icon name="discover" className="w-4 h-4" />
                  </div>
                  <span>Match Preferences</span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-pink hover:text-pink/80 flex items-center gap-1 transition-colors cursor-pointer"
                  onClick={() => startEditingSection("preferences")}
                >
                  <span>Edit</span>
                  <Icon name="chevronDown" className="w-3 h-3 -rotate-90" />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold">Interested In</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {p.acceptedGenders && p.acceptedGenders.length > 0 ? (
                      p.acceptedGenders.map((g) => (
                        <span key={g} className="px-2.5 py-0.5 rounded-md bg-white/10 text-white text-xs font-medium">
                          {title(g)}
                        </span>
                      ))
                    ) : (
                      <span className="text-white text-xs font-medium">All genders</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold">Age Range Bracket</span>
                  <span className="text-pink font-bold text-sm">
                    {p.minAge || 21} – {p.maxAge || 50} years
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold shrink-0">Open To Intentions</span>
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-sm">
                    {p.acceptedIntents && p.acceptedIntents.length > 0 ? (
                      p.acceptedIntents.map((id) => (
                        <span key={id} className="px-2.5 py-0.5 rounded-md bg-white/10 text-white text-xs font-medium">
                          {getMasterLabel("intent", id)}
                        </span>
                      ))
                    ) : (
                      <span className="text-white text-xs font-medium">Any mutual intent</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold shrink-0">Neighborhood Zones</span>
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-sm">
                    {p.acceptedZones && p.acceptedZones.length > 0 ? (
                      p.acceptedZones.map((id) => (
                        <span key={id} className="px-2.5 py-0.5 rounded-md bg-white/10 text-white text-xs font-medium">
                          {getMasterLabel("geography", id)}
                        </span>
                      ))
                    ) : (
                      <span className="text-white text-xs font-medium">All city zones</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Privacy, Boundaries & Account */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Privacy & Safety Card */}
            <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-7 shadow-xl border border-white/[0.08] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <span>Privacy & Boundaries</span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-pink hover:text-pink/80 flex items-center gap-1 transition-colors cursor-pointer"
                  onClick={() => startEditingSection("boundaries")}
                >
                  <span>Edit</span>
                  <Icon name="chevronDown" className="w-3 h-3 -rotate-90" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold">Visibility Mode</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    p.discoverable && !p.incognito
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                  }`}>
                    {p.discoverable && !p.incognito ? "Discoverable ✨" : "Incognito 🕵️"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold">Chat Pace</span>
                  <span className="text-white text-xs font-semibold">
                    {p.communication === "voice" ? "Voice First 🎙️" : "Text First 💬"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold">Calls Enabled</span>
                  <span className="text-white text-xs font-semibold">
                    {p.channels?.voice !== false ? "Audio & Video ✅" : "Restricted ❌"}
                  </span>
                </div>

                {/* Boundaries Tags */}
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-muted text-xs uppercase tracking-wider font-semibold">Personal Comfort Rules</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.boundaries && p.boundaries.length > 0 ? (
                      p.boundaries.map((bId) => (
                        <span
                          key={bId}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/90 text-xs font-medium"
                        >
                          🛡️ {getMasterLabel("boundaries", bId)}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-xs italic">No personal boundaries listed.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Confidential Account Details Card */}
            <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-7 shadow-xl border border-white/[0.08] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg">
                  <div className="w-9 h-9 rounded-xl bg-pink/15 text-pink flex items-center justify-center border border-pink/25">
                    <Icon name="lock" className="w-4 h-4" />
                  </div>
                  <span>Confidential Details</span>
                </div>
                <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-muted">
                  Strictly Private
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-0.5">
                  <span className="text-muted font-semibold uppercase tracking-wider text-[0.68rem]">Legal Name</span>
                  <span className="text-white font-medium truncate">{p.firstName || "Not provided"} {p.lastName || ""}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-0.5">
                  <span className="text-muted font-semibold uppercase tracking-wider text-[0.68rem]">Email</span>
                  <span className="text-white font-medium truncate">{p.email || "Not provided"}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-0.5">
                  <span className="text-muted font-semibold uppercase tracking-wider text-[0.68rem]">Phone</span>
                  <span className="text-white font-medium truncate">{p.phone || "Not provided"}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-0.5">
                  <span className="text-muted font-semibold uppercase tracking-wider text-[0.68rem]">Date of Birth</span>
                  <span className="text-white font-medium truncate">{p.dob ? new Date(p.dob).toLocaleDateString() : "Not provided"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: STORY & PASSIONS ── */}
      {currentTab === "story" && (
        <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white m-0">Your Story & Public Persona</h2>
              <p className="text-muted text-sm m-0 mt-1">This is what prospective sparks see when they explore your profile.</p>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 bg-pink hover:bg-[#ff2a85] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
              onClick={() => startEditingSection("story")}
            >
              Edit Story
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-2">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Display Pseudonym</span>
              <span className="text-xl font-bold text-white">{p.pseudonym || "Anonymous"}</span>
              <span className="text-xs text-muted">Shown publicly in place of your real name</span>
            </div>

            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-2">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Age & Identity</span>
              <span className="text-xl font-bold text-white">{p.age} years old · {title(p.gender || "woman")}</span>
              <span className="text-xs text-muted">Verified member badge active</span>
            </div>

            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-2">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Neighborhood & Vibe</span>
              <span className="text-xl font-bold text-white">{getMasterLabel("geography", p.zone)}</span>
              <span className="text-xs text-muted">{getMasterLabel("intent", p.intent)}</span>
            </div>
          </div>

          {/* Bio Full Card */}
          <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Bio Statement</span>
              <span className="text-xs text-muted">{p.bio?.length || 0} characters</span>
            </div>
            <p className="m-0 text-white/95 leading-relaxed text-base sm:text-lg italic font-serif">
              "{p.bio || "No bio added yet."}"
            </p>
          </div>

          {/* Lifestyle Passions */}
          <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-4">
            <span className="text-muted text-xs uppercase tracking-wider font-bold">The Things You Love</span>
            <div className="flex flex-wrap gap-2.5">
              {p.interests && p.interests.length > 0 ? (
                p.interests.map((intId) => (
                  <span
                    key={intId}
                    className="px-4 py-2 rounded-full bg-pink/15 border border-pink/30 text-pink text-sm font-semibold shadow-sm"
                  >
                    ✧ {getMasterLabel("lifestyle-interests", intId)}
                  </span>
                ))
              ) : (
                <span className="text-muted text-sm italic">No passions selected.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: MATCH PREFERENCES ── */}
      {currentTab === "preferences" && (
        <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white m-0">Match Preferences & Discovery Rules</h2>
              <p className="text-muted text-sm m-0 mt-1">Determine exactly which profiles will appear in your discovery feed.</p>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 bg-pink hover:bg-[#ff2a85] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
              onClick={() => startEditingSection("preferences")}
            >
              Edit Preferences
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interested In */}
            <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Interested In Meeting</span>
              <div className="flex flex-wrap gap-2">
                {p.acceptedGenders && p.acceptedGenders.length > 0 ? (
                  p.acceptedGenders.map((g) => (
                    <span key={g} className="px-3.5 py-1.5 rounded-full bg-pink/15 border border-pink/30 text-white text-sm font-semibold">
                      ✓ {title(g)}
                    </span>
                  ))
                ) : (
                  <span className="text-muted text-sm">All genders</span>
                )}
              </div>
            </div>

            {/* Age Range */}
            <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Accepted Age Range</span>
              <div className="text-2xl font-bold text-pink font-serif">
                {p.minAge || 21} – {p.maxAge || 50} years old
              </div>
              <p className="text-xs text-muted m-0 leading-relaxed">
                Profiles outside this range will be filtered out from your daily discovery stream.
              </p>
            </div>

            {/* Open to Intentions */}
            <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Open to These Intentions</span>
              <div className="flex flex-wrap gap-2">
                {p.acceptedIntents && p.acceptedIntents.length > 0 ? (
                  p.acceptedIntents.map((id) => (
                    <span key={id} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-xs sm:text-sm font-medium">
                      ✦ {getMasterLabel("intent", id)}
                    </span>
                  ))
                ) : (
                  <span className="text-muted text-sm">Any mutual intention</span>
                )}
              </div>
            </div>

            {/* Accepted Zones */}
            <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Accepted City Neighborhoods</span>
              <div className="flex flex-wrap gap-2">
                {p.acceptedZones && p.acceptedZones.length > 0 ? (
                  p.acceptedZones.map((id) => (
                    <span key={id} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-xs sm:text-sm font-medium">
                      📍 {getMasterLabel("geography", id)}
                    </span>
                  ))
                ) : (
                  <span className="text-muted text-sm">All geographic zones</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PRIVACY & BOUNDARIES ── */}
      {currentTab === "boundaries" && (
        <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white m-0">Privacy, Safety & Boundaries</h2>
              <p className="text-muted text-sm m-0 mt-1">Configure your visibility, calling rules, and communication comfort boundaries.</p>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 bg-pink hover:bg-[#ff2a85] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
              onClick={() => startEditingSection("boundaries")}
            >
              Edit Privacy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Profile Visibility</span>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  p.discoverable && !p.incognito
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                }`}>
                  {p.discoverable && !p.incognito ? "Discoverable Profile ✨" : "Incognito Browsing 🕵️"}
                </span>
              </div>
              <p className="text-xs text-muted m-0 leading-relaxed">
                {p.discoverable && !p.incognito
                  ? "Your profile is actively visible to potential sparks within your mutual preference filters."
                  : "Incognito active: you can browse other profiles privately without leaving visit traces."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-3">
              <span className="text-muted text-xs uppercase tracking-wider font-bold">Communication Preference</span>
              <div className="text-lg font-bold text-white">
                {p.communication === "voice" ? "Voice First 🎙️" : "Text First 💬"}
              </div>
              <p className="text-xs text-muted m-0 leading-relaxed">
                {p.communication === "voice"
                  ? "You prefer connecting via genuine voice notes and calls before lengthy text messaging."
                  : "You prefer exchanging thoughtful text messages before scheduling calls or meetings."}
              </p>
            </div>
          </div>

          {/* Boundaries Chips */}
          <div className="p-6 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-4">
            <span className="text-muted text-xs uppercase tracking-wider font-bold">Active Personal Boundaries</span>
            <div className="flex flex-wrap gap-2.5">
              {p.boundaries && p.boundaries.length > 0 ? (
                p.boundaries.map((bId) => (
                  <span
                    key={bId}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center gap-2"
                  >
                    <span>🛡️</span>
                    <span>{getMasterLabel("boundaries", bId)}</span>
                  </span>
                ))
              ) : (
                <span className="text-muted text-sm italic">No personal boundaries active.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: ACCOUNT DETAILS ── */}
      {currentTab === "account" && (
        <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] flex flex-col gap-6">
          <div className="border-b border-white/[0.07] pb-5">
            <h2 className="text-2xl font-serif font-bold text-white m-0">Confidential Account Credentials</h2>
            <p className="text-muted text-sm m-0 mt-1">
              Your real personal credentials are encrypted and never shown to other members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-1.5">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Legal Full Name</span>
              <span className="text-lg font-semibold text-white">{p.firstName || "Not provided"} {p.lastName || ""}</span>
            </div>

            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-1.5">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Email Address</span>
              <span className="text-lg font-semibold text-white">{p.email || "Not provided"}</span>
            </div>

            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-1.5">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Phone Number</span>
              <span className="text-lg font-semibold text-white">{p.phone || "Not provided"}</span>
            </div>

            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 flex flex-col gap-1.5">
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Date of Birth</span>
              <span className="text-lg font-semibold text-white">{p.dob ? new Date(p.dob).toLocaleDateString() : "Not provided"}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Icon name="shield" className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm m-0">End-to-End Privacy Protection</h4>
              <p className="text-muted text-xs leading-relaxed m-0 mt-1">
                Juicy Match strictly separates your public pseudonym identity from your real legal records. Only your pseudonym, age, bio, passions, and approximate zone are displayed to prospective matches.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
