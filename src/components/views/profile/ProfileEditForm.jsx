import React from "react";
import Icon from "../../common/Icon";
import { title } from "../../../utils/formatters";

const GENDER_OPTIONS = [
  { id: "woman", label: "Woman", icon: "user" },
  { id: "man", label: "Man", icon: "user" },
  { id: "nonbinary", label: "Nonbinary", icon: "user" },
];

function SectionCard({ step, icon, title: cardTitle, description, children }) {
  return (
    <div className="bg-[#1a0d20] rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-white/[0.07] pb-5">
        <div className="w-11 h-11 rounded-2xl bg-pink/15 border border-pink/25 flex items-center justify-center text-pink shrink-0 shadow-[0_0_15px_rgba(233,22,113,0.2)]">
          <Icon name={icon} className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[0.68rem] font-bold text-pink uppercase tracking-[0.15em]">Step {step}</div>
          <h2 className="text-xl font-serif font-bold text-white m-0 leading-tight">{cardTitle}</h2>
          {description && <p className="text-muted text-[0.82rem] m-0 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[0.88rem] font-semibold text-white/90">{label}</label>
        {hint && <span className="text-[0.72rem] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SelectInput({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-pink/60 focus:ring-1 focus:ring-pink/20 transition-all cursor-pointer"
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
      <Icon name="chevronDown" className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
    </div>
  );
}

function TextInput({ value, onChange, placeholder, required, minLength, maxLength, type = "text", min, max }) {
  return (
    <input
      type={type}
      min={min}
      max={max}
      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-pink/60 focus:ring-1 focus:ring-pink/20 transition-all"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
    />
  );
}

function ToggleChip({ label, selected, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.86rem] font-medium transition-all duration-200 border cursor-pointer select-none ${
        selected
          ? "bg-pink/20 border-pink text-white shadow-[0_2px_12px_rgba(233,22,113,0.3)] font-semibold"
          : "bg-black/30 border-white/10 text-muted hover:border-white/25 hover:text-white hover:bg-white/5"
      }`}
    >
      {selected ? (
        <Icon name="check" className="w-3.5 h-3.5 text-pink shrink-0" />
      ) : icon ? (
        <span className="text-xs">{icon}</span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}

function ToggleSwitch({ value, onChange, label, desc, icon }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition-all select-none ${
        value ? "border-pink/35 bg-pink/[0.08]" : "border-white/[0.08] bg-black/25 hover:border-white/15"
      }`}
      onClick={() => onChange(!value)}
    >
      <div className="flex items-start gap-3 flex-1">
        {icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${value ? "bg-pink/20 text-pink" : "bg-white/5 text-muted"}`}>
            <Icon name={icon} className="w-4 h-4" />
          </div>
        )}
        <div>
          <div className="text-[0.92rem] font-semibold text-white">{label}</div>
          {desc && <div className="text-[0.78rem] text-muted mt-0.5 leading-relaxed">{desc}</div>}
        </div>
      </div>
      <div className={`relative w-[46px] h-[26px] rounded-full border-2 transition-all duration-300 shrink-0 ${value ? "bg-pink border-pink" : "bg-white/10 border-white/20"}`}>
        <span className={`absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full shadow transition-all duration-300 ${value ? "left-[24px]" : "left-[3px]"}`} />
      </div>
    </div>
  );
}

export default function ProfileEditForm({
  formData,
  setFormData,
  p,
  activeTab,
  setActiveTab,
  setIsEditing,
  handleSubmit,
  handlePhotoUpload,
  handleRemovePhoto,
  handleInterestToggle,
  handleMultiToggle,
  error,
  isSaving,
  intentOptions = [],
  zoneOptions = [],
  interestOptions = [],
  boundaryOptions = [],
  userPortraitClass,
  state,
}) {
  // Check if a section is active
  const show = (section) => {
    if (activeTab === "all" || !activeTab) return true;
    if (section === "story" && (activeTab === "story" || activeTab === "overview")) return true;
    if (section === "preferences" && activeTab === "preferences") return true;
    if (section === "boundaries" && (activeTab === "boundaries" || activeTab === "privacy")) return true;
    return false;
  };

  const tabs = [
    { id: "all",         label: "All Sections", badge: "ALL", icon: "sparkle" },
    { id: "story",       label: "Story & Bio",  badge: "01",  icon: "user" },
    { id: "preferences", label: "Preferences",  badge: "02",  icon: "discover" },
    { id: "boundaries",  label: "Privacy",      badge: "03",  icon: "shield" },
  ];

  const isInterestActive = (id) => {
    return (formData.interests || []).some(
      (x) => String(x).toLowerCase() === String(id).toLowerCase()
    );
  };

  const isBoundaryActive = (id) => {
    return (formData.boundaries || []).some(
      (x) => String(x).toLowerCase() === String(id).toLowerCase()
    );
  };

  const isGenderActive = (id) => {
    return (formData.acceptedGenders || []).some(
      (x) => String(x).toLowerCase() === String(id).toLowerCase()
    );
  };

  const isIntentActive = (id) => {
    return (formData.acceptedIntents || []).some(
      (x) => String(x).toLowerCase() === String(id).toLowerCase()
    );
  };

  const isZoneActive = (id) => {
    return (formData.acceptedZones || []).some(
      (x) => String(x).toLowerCase() === String(id).toLowerCase()
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-white text-[0.9rem] animate-fadeIn">
          <span className="text-xl">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1a0d20] p-4 sm:px-6 rounded-2xl border border-white/[0.08]">
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm font-semibold transition-colors border border-white/10 self-start sm:self-auto"
          onClick={() => setIsEditing(false)}
        >
          <Icon name="back" className="w-4 h-4" />
          <span>Exit Edit Mode</span>
        </button>
        <div className="flex items-center gap-2 text-pink font-bold text-sm tracking-wide">
          <span className="w-2 h-2 rounded-full bg-pink animate-pulse" />
          <span>Editing Profile & Preferences</span>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center overflow-x-auto no-scrollbar gap-2 p-1.5 bg-[#120716] rounded-2xl border border-white/[0.06]">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id || (tab.id === "boundaries" && activeTab === "privacy");
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shrink-0 font-semibold text-[0.86rem] transition-all duration-200 border cursor-pointer ${
                isSelected
                  ? "bg-pink border-pink text-white shadow-[0_4px_16px_rgba(233,22,113,0.35)]"
                  : "bg-transparent border-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-bold ${isSelected ? "bg-white/20 text-white" : "bg-white/10 text-muted"}`}>
                {tab.badge}
              </span>
              <Icon name={tab.icon} className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── SECTION 01: YOUR STORY ── */}
      {show("story") && (
        <SectionCard step="01" icon="user" title="Your Story & Persona" description="Introduce yourself authentically to prospective connections.">
          {/* Photo Upload Area */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-2xl bg-black/20 border border-white/5">
            <div className="relative shrink-0 group">
              {formData.avatar || formData.photo ? (
                <img
                  src={formData.avatar || formData.photo}
                  alt="Avatar Preview"
                  className="w-28 h-28 rounded-full object-cover border-4 border-pink/30 shadow-xl"
                />
              ) : (
                <div className={`w-28 h-28 rounded-full border-4 border-pink/30 shadow-xl bg-gradient-to-br from-pink to-lilac flex items-center justify-center font-serif font-bold text-4xl text-white ${userPortraitClass}`}>
                  {!userPortraitClass && <span>{(formData.pseudonym || p.pseudonym || "U")[0]}</span>}
                </div>
              )}
              <label className="absolute bottom-1 right-1 w-9 h-9 bg-pink text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#1a0d20] hover:scale-110 transition-transform" title="Change Photo">
                <Icon name="sparkle" className="w-4 h-4" />
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex-1 flex flex-col gap-3 text-center sm:text-left">
              <div>
                <h3 className="text-white font-semibold text-base m-0">Profile Avatar</h3>
                <p className="text-muted text-xs leading-relaxed m-0 mt-0.5">
                  High quality portrait photos receive up to 3x more meaningful sparks. JPEG, PNG, WEBP · Max 5MB.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <label className="flex items-center gap-2 px-4 py-2 bg-pink hover:bg-[#ff2a85] text-white rounded-xl cursor-pointer font-semibold text-xs transition-colors shadow-lg border border-pink">
                  <Icon name="sparkle" className="w-3.5 h-3.5" />
                  <span>Choose Photo</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {(formData.avatar || formData.photo) && (
                  <button
                    type="button"
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white rounded-xl font-semibold text-xs transition-all"
                    onClick={handleRemovePhoto}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Display Name (Pseudonym)" hint="Public identifier">
              <TextInput
                value={formData.pseudonym}
                onChange={(e) => setFormData({ ...formData, pseudonym: e.target.value })}
                placeholder="e.g. Jenny or Nicole"
                required
                minLength={2}
                maxLength={40}
              />
            </FormField>

            <FormField label="Your Age" hint={`Minimum ${state.config?.minimumAge || 21} years`}>
              <TextInput
                type="number"
                min={21}
                max={99}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                required
              />
            </FormField>

            <FormField label="I identify as">
              <SelectInput value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
                <option value="nonbinary">Nonbinary</option>
              </SelectInput>
            </FormField>

            <FormField label="Primary Intention">
              <SelectInput value={formData.intent} onChange={(e) => setFormData({ ...formData, intent: e.target.value })}>
                {intentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </SelectInput>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Primary Neighborhood Zone" hint="Where you are based">
                <SelectInput value={formData.zone} onChange={(e) => setFormData({ ...formData, zone: e.target.value })}>
                  {zoneOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </SelectInput>
              </FormField>
            </div>
          </div>

          <FormField label="A Glimpse of Your World (Bio)" hint={`${formData.bio?.length || 0} / 500 characters`}>
            <textarea
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-pink/60 transition-all resize-y min-h-[120px] text-sm leading-relaxed"
              maxLength={500}
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="A good playlist, fine wine, late night conversation and a little curiosity…"
            />
          </FormField>

          {/* Lifestyle Passions & Interests */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.88rem] font-semibold text-white/90">The Things You Love & Passions</span>
              <span className="px-2.5 py-0.5 rounded-full bg-pink/15 border border-pink/25 text-[0.72rem] font-bold text-pink">
                {formData.interests?.length || 0} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((item) => (
                <ToggleChip
                  key={item.id}
                  label={item.label}
                  selected={isInterestActive(item.id)}
                  onClick={() => handleInterestToggle(item.id)}
                />
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── SECTION 02: MATCH PREFERENCES ── */}
      {show("preferences") && (
        <SectionCard step="02" icon="discover" title="Match Preferences" description="Fine-tune who you are looking to meet, target age ranges, and mutual intentions.">
          {/* Gender Preferences */}
          <div className="flex flex-col gap-3">
            <FormField label="I'm interested in meeting" hint="Select all that apply">
              <div className="flex flex-wrap gap-2.5 mt-1">
                {GENDER_OPTIONS.map((g) => (
                  <ToggleChip
                    key={g.id}
                    label={g.label}
                    selected={isGenderActive(g.id)}
                    onClick={() => handleMultiToggle("acceptedGenders", g.id)}
                  />
                ))}
              </div>
            </FormField>
          </div>

          {/* Age Range Inputs */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/20 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[0.88rem] font-semibold text-white/90">Accepted Age Bracket</span>
              <span className="text-xs font-bold px-3 py-1 bg-pink/15 border border-pink/30 text-pink rounded-full">
                {formData.minAge || 21} – {formData.maxAge || 50} years
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              <FormField label="Minimum Age" hint="21+ required">
                <TextInput
                  type="number"
                  min={21}
                  max={formData.maxAge || 99}
                  value={formData.minAge}
                  onChange={(e) => setFormData({ ...formData, minAge: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Maximum Age" hint="Upper limit">
                <TextInput
                  type="number"
                  min={formData.minAge || 21}
                  max={99}
                  value={formData.maxAge}
                  onChange={(e) => setFormData({ ...formData, maxAge: Number(e.target.value) })}
                />
              </FormField>
            </div>
          </div>

          {/* Accepted Intentions */}
          <FormField label="Open to these Intentions" hint="Mutual connection vibes">
            <div className="flex flex-wrap gap-2 mt-1">
              {intentOptions.map((opt) => (
                <ToggleChip
                  key={opt.id}
                  label={opt.label}
                  selected={isIntentActive(opt.id)}
                  onClick={() => handleMultiToggle("acceptedIntents", opt.id)}
                />
              ))}
            </div>
          </FormField>

          {/* Accepted Neighborhood Zones */}
          <FormField label="Accepted Neighborhood Zones" hint="Areas you are willing to meet">
            <div className="flex flex-wrap gap-2 mt-1">
              {zoneOptions.map((opt) => (
                <ToggleChip
                  key={opt.id}
                  label={opt.label}
                  selected={isZoneActive(opt.id)}
                  onClick={() => handleMultiToggle("acceptedZones", opt.id)}
                />
              ))}
            </div>
          </FormField>
        </SectionCard>
      )}

      {/* ── SECTION 03: PRIVACY & BOUNDARIES ── */}
      {show("boundaries") && (
        <SectionCard step="03" icon="shield" title="Privacy & Boundaries" description="Granular control over your discoverability, incognito status, and personal boundaries.">
          {/* Profile Visibility Controls */}
          <div className="flex flex-col gap-3">
            <div className="text-[0.8rem] font-bold text-muted uppercase tracking-wider mb-0.5">Visibility & Browsing</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleSwitch
                value={formData.discoverable}
                onChange={(v) => setFormData({ ...formData, discoverable: v })}
                label="Discoverable Profile"
                desc="Visible in Discover and search cards"
                icon="user"
              />
              <ToggleSwitch
                value={formData.incognito}
                onChange={(v) => setFormData({ ...formData, incognito: v })}
                label="Incognito Browsing"
                desc="Browse profiles without appearing in visits"
                icon="shield"
              />
            </div>
          </div>

          {/* Communication Style Preference */}
          <div className="flex flex-col gap-3">
            <div className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">Preferred Communication Pace</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "text", label: "Text First 💬", desc: "Break the ice with comfortable text messages before calls." },
                { id: "voice", label: "Voice First 🎙️", desc: "Prefer audio calls and voice notes to hear tone and genuine vibe." },
              ].map(({ id, label, desc }) => {
                const isSelected = formData.communication === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormData({ ...formData, communication: id })}
                    className={`flex flex-col gap-1.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-pink bg-pink/[0.12] shadow-[0_2px_14px_rgba(233,22,113,0.2)]"
                        : "border-white/[0.08] bg-black/25 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-[0.92rem]">{label}</span>
                      {isSelected && <Icon name="check" className="w-4 h-4 text-pink" />}
                    </div>
                    <span className="text-muted text-[0.78rem] leading-relaxed">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media & Call Channels */}
          <div className="flex flex-col gap-3">
            <div className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">Direct Media Channels</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleSwitch
                value={formData.voice ?? true}
                onChange={(v) => setFormData({ ...formData, voice: v })}
                label="Voice Calling"
                desc="Allow mutual matches to initiate audio calls"
                icon="phone"
              />
              <ToggleSwitch
                value={formData.video ?? true}
                onChange={(v) => setFormData({ ...formData, video: v })}
                label="Video Calling"
                desc="Allow mutual matches to initiate face-to-face video calls"
                icon="sparkle"
              />
            </div>
          </div>

          {/* Personal Boundaries */}
          <FormField label="My Personal Boundaries & Comfort Rules" hint="Displayed respectfully on your card">
            <div className="flex flex-wrap gap-2 mt-1">
              {boundaryOptions.map((item) => (
                <ToggleChip
                  key={item.id}
                  label={item.label}
                  icon="🛡️"
                  selected={isBoundaryActive(item.id)}
                  onClick={() => handleMultiToggle("boundaries", item.id)}
                />
              ))}
            </div>
          </FormField>
        </SectionCard>
      )}

      {/* ── STICKY BOTTOM ACTION BAR ── */}
      <div className="sticky bottom-4 z-30 pt-2">
        <div className="flex items-center justify-between p-4 bg-[#1a0d20]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-muted hover:text-white font-semibold rounded-xl transition-all border border-white/10 text-sm cursor-pointer"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-2.5 bg-pink hover:bg-[#ff2a85] text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(233,22,113,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? <span className="animate-spin text-sm">↻</span> : <Icon name="check" className="w-4 h-4" />}
            <span>{isSaving ? "Saving Profile…" : "Save Profile"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
