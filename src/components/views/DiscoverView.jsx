import React, { useState, useEffect, useRef } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { discoverService } from "../../services/discoverService";
import { chatService } from "../../services/chatService";
import { blockService } from "../../services/blockService";
import { title, portraitClass } from "../../utils/formatters";

const ALL_CATEGORIES = [
  { id: "all", label: "All Sparks" },
  { id: "saved", label: "Saved" },
  { id: "music", label: "Music" },
  { id: "travel", label: "Travel" },
  { id: "coffee", label: "Coffee" },
  { id: "art", label: "Art" },
  { id: "food", label: "Food" },
  { id: "books", label: "Books" },
  { id: "fitness", label: "Fitness" },
  { id: "cinema", label: "Cinema" },
  { id: "nature", label: "Nature" },
  { id: "design", label: "Design" },
  { id: "gaming", label: "Gaming" },
];

export default function DiscoverView() {
  const {
    state,
    activeFilter,
    setActiveFilter,
    navigate,
    openModal,
    closeModal,
    showToast,
    triggerSound,
    blockMember,
  } = useApp();

  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastPassedId, setLastPassedId] = useState(null);
  const [availableFilters, setAvailableFilters] = useState(["all", "saved"]);
  const [backendFilters, setBackendFilters] = useState([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [discoverMeta, setDiscoverMeta] = useState({
    issued: 0,
    dailyCap: 10,
    resetAt: null,
  });
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadDiscoverFeed = async () => {
    setLoading(true);
    try {
      const res = await discoverService.getDiscoveryFeed();
      const blocked = blockService.getBlockedMemberIds();

      const rawItems = res?.items || res?.profiles || res?.data || res?.recommendations || res || [];
      const itemsList = Array.isArray(rawItems) ? rawItems : [];

      const normalized = itemsList
        .map((p) => ({
          id: p.id || p.memberId || p.userId || p._id,
          pseudonym: p.pseudonym || p.name || p.username || p.firstName || "Member",
          age: p.age || p.userAge || 25,
          zone: p.zone || p.city || p.location || p.region || "Nearby",
          band: p.band || p.tier || p.membershipTier || p.category || "A possible spark",
          matchPercentage:
            p.matchPercentage ||
            p.match_percentage ||
            p.chemistry?.lower ||
            p.chemistryScore ||
            p.compatibilityScore ||
            85,
          bio:
            p.bio ||
            p.about ||
            p.description ||
            p.tagline ||
            "There’s a story here. Start with a hello.",
          interests: Array.isArray(p.interests)
            ? p.interests
            : Array.isArray(p.tags)
            ? p.tags
            : p.interests
            ? [p.interests]
            : [],
          reasons: Array.isArray(p.reasons)
            ? p.reasons
            : Array.isArray(p.sharedInterests)
            ? p.sharedInterests
            : p.reason
            ? [p.reason]
            : [],
          photos:
            Array.isArray(p.photos) && p.photos.length > 0
              ? p.photos
              : [
                  p.profilePhoto ||
                    p.profile_photo ||
                    p.avatarUrl ||
                    p.avatar ||
                    p.image,
                ].filter(Boolean),
          swipe: p.swipe || p.swipeAction || p.userAction || null,
          isBot: Boolean(p.isBot || p.isDemo),
          portrait: p.portrait || p.avatarClass || "p0",
        }))
        .filter((p) => p.id && !blocked.includes(String(p.id)));

      if (normalized.length > 0) {
        setFeedItems(normalized);
      } else {
        const localProfiles = state.discoverProfiles || [];
        setFeedItems(localProfiles.filter((p) => !blocked.includes(String(p.id))));
      }

      if (res?.filters && Array.isArray(res.filters)) {
        setBackendFilters(res.filters);
        setAvailableFilters(["all", "saved", ...res.filters]);
      }
      setDiscoverMeta({
        issued: res?.issued ?? normalized.length ?? feedItems.length,
        dailyCap: res?.dailyCap ?? 10,
        resetAt: res?.resetAt ?? null,
      });
    } catch (err) {
      console.warn("Discover feed API load warning:", err.message);
      const localProfiles = state.discoverProfiles || [];
      const blocked = blockService.getBlockedMemberIds();
      setFeedItems(localProfiles.filter((p) => !blocked.includes(String(p.id))));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscoverFeed();
  }, []);

  // Listen for block events to instantly remove blocked profiles from feed
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel("jm_block_channel");
      channel.onmessage = (e) => {
        if (e.data?.targetId) {
          setFeedItems((prev) => prev.filter((p) => String(p.id) !== String(e.data.targetId)));
        }
      };
    } catch {}
    return () => {
      if (channel) channel.close();
    };
  }, []);

  const handleSwipe = async (profileId, action) => {
    if (action === "like") triggerSound();
    if (action === "pass") setLastPassedId(profileId);

    // Optimistic UI update
    setFeedItems((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, swipe: action } : p))
    );

    try {
      const res = await discoverService.swipe(profileId, action);
      if (res?.matched) {
        openModal(
          "✨ It’s a Match!",
          <div style={{ textAlign: "center", padding: "10px" }}>
            <p style={{ fontSize: "1.1rem", color: "var(--cream)", marginBottom: "20px" }}>
              You and this member have mutual chemistry! Both of you can now start a private conversation.
            </p>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                closeModal();
                navigate(res.connectionId ? `chat/${res.connectionId}` : "connections");
              }}
            >
              Open Conversation <Icon name="chat" />
            </button>
          </div>
        );
      } else if (action === "like") {
        showToast("Spark sent! We’ll let you know when they respond.");
      } else if (action === "save") {
        showToast("Saved to your Sparks folder.");
      } else {
        showToast("Passed. Take your time.");
      }
    } catch (err) {
      showToast(err.message || "Action failed.");
    }
  };

  const handleUndo = async () => {
    if (!lastPassedId) return;
    try {
      await discoverService.undoPass(lastPassedId);
      setFeedItems((prev) =>
        prev.map((p) => (p.id === lastPassedId ? { ...p, swipe: null } : p))
      );
      setLastPassedId(null);
      showToast("Pass undone.");
    } catch (err) {
      showToast(err.message || "Failed to undo pass.");
    }
  };

  const handleSafetyReport = (profile) => {
    let reportReason = "harassment";
    let reportContext = "";

    openModal(
      "Safety & Boundaries",
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <p>Report behaviour for confidential moderation review, or block this member to immediately restrict further contact.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await chatService.reportMember(profile.id, reportReason);
              closeModal();
              showToast("Report submitted for moderation review.");
            } catch (err) {
              showToast(err.message || "Failed to submit report.");
            }
          }}
        >
          <label className="field">
            Reason for reporting
            <select
              required
              defaultValue="harassment"
              onChange={(e) => (reportReason = e.target.value)}
            >
              <option value="harassment">Harassment</option>
              <option value="impersonation">Impersonation</option>
              <option value="unwanted-media">Unwanted Media</option>
              <option value="other">Other reason</option>
            </select>
          </label>
          <label className="field gap">
            Additional context (optional)
            <textarea
              maxLength={350}
              rows={3}
              placeholder="Provide any details..."
              onChange={(e) => (reportContext = e.target.value)}
            ></textarea>
          </label>
          <div className="buttonbar">
            <button type="submit" className="button quiet">
              Submit report
            </button>
          </div>
        </form>
        <hr className="rule" />
        <button
          type="button"
          className="button danger quiet"
          onClick={async () => {
            try {
              await blockMember(profile.id);
              closeModal();
              setFeedItems((prev) => prev.filter((p) => p.id !== profile.id));
            } catch (err) {
              showToast(err.message || "Failed to block member.");
            }
          }}
        >
          Block this member
        </button>
      </div>
    );
  };

  // Counts for liked and saved items
  const likedCount = feedItems.filter((p) => p.swipe === "like").length;
  const savedCount = feedItems.filter((p) => p.swipe === "save").length;

  // Filter items
  const filteredProfiles = feedItems.filter((p) => {
    if (activeFilter === "saved") {
      return p.swipe === "save";
    }
    if (activeFilter === "liked") {
      return p.swipe === "like";
    }
    if (p.swipe) return false;
    if (activeFilter === "all") return true;
    return p.interests?.includes(activeFilter);
  });

  const currentProfile = filteredProfiles[0];

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [currentProfile?.id]);

  const profilePhotos = currentProfile
    ? Array.isArray(currentProfile.photos) && currentProfile.photos.length > 0
      ? currentProfile.photos
      : [
          currentProfile.profilePhoto ||
          currentProfile.profile_photo ||
          currentProfile.avatarUrl,
        ].filter(Boolean)
    : [];

  const currentPhoto = profilePhotos[activePhotoIdx] || profilePhotos[0];

  const categoryList = [
    { id: "all", label: "All sparks" },
    { id: "saved", label: "Saved" },
    ...(backendFilters.length > 0 ? backendFilters : ALL_CATEGORIES.slice(2).map((c) => c.id)).map((f) => ({
      id: f,
      label: title(f),
    })),
  ];

  const primaryFilterTabs = [
    { id: "all", label: "All sparks" },
    { id: "liked", label: "Liked", count: likedCount },
    { id: "saved", label: "Saved", count: savedCount },
  ];

  return (
    <>
      <PageHead
        kicker="Curated Matchmaking"
        heading="Discover Sparks"
        description="Explore members matching your profile and desires. Connect through mutual sparks and intentional conversations."
        action={
          <div className="discover-header-actions">
            <button
              type="button"
              className="button quiet preferences-top-btn"
              onClick={() => navigate("profile")}
            >
              <Icon name="tune" /> Preferences
            </button>

            <div className="category-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`button quiet category-dropdown-btn ${isCategoryOpen ? "active" : ""} ${
                  activeFilter !== "all" && activeFilter !== "liked" && activeFilter !== "saved"
                    ? "has-active-filter"
                    : ""
                }`}
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isCategoryOpen}
              >
                <Icon name="category" />
                <span className="category-btn-text">
                  {activeFilter === "all"
                    ? "Category"
                    : activeFilter === "liked"
                    ? "Liked"
                    : activeFilter === "saved"
                    ? "Saved"
                    : categoryList.find((c) => c.id === activeFilter)?.label || title(activeFilter)}
                </span>
                <Icon
                  name="chevronDown"
                  className={`dropdown-chevron ${isCategoryOpen ? "open" : ""}`}
                />
              </button>

              {isCategoryOpen && (
                <div className="category-menu" role="menu">
                  <div className="category-menu-header">Browse categories</div>
                  <div className="category-menu-list">
                    {categoryList.map((cat) => {
                      const isSelected = activeFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`category-item ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setActiveFilter(cat.id);
                            setIsCategoryOpen(false);
                          }}
                          role="menuitem"
                        >
                          <span className="cat-label">{cat.label}</span>
                          {isSelected && <Icon name="check" className="cat-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />

      {!state.me?.profile?.discoverable && (
        <p className="notice">
          Your profile is currently hidden from discovery.{" "}
          <span
            className="text-link"
            onClick={() => navigate("profile")}
            role="button"
            tabIndex="0"
          >
            Make your profile discoverable
          </span>{" "}
          whenever you are ready.
        </p>
      )}

      <div className="filterbar" aria-label="Filter today’s introductions">
        {primaryFilterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeFilter === tab.id ? "selected" : ""}
            aria-pressed={activeFilter === tab.id}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="pill-badge">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader text="Discovering sparks for today…" />
      ) : currentProfile ? (
        <div className="discover-layout">
          <section>
            <div className={`portrait-card ${portraitClass(currentProfile.portrait)}`}>
              {profilePhotos.length > 1 && (
                <div className="portrait-photo-dots">
                  {profilePhotos.map((_, idx) => (
                    <span
                      key={idx}
                      className={`portrait-dot ${idx === activePhotoIdx ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIdx(idx);
                      }}
                    />
                  ))}
                </div>
              )}

              {currentPhoto && (
                <img
                  src={currentPhoto}
                  alt={currentProfile.pseudonym}
                  className="portrait-image"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              {profilePhotos.length > 1 && (
                <>
                  <div
                    role="button"
                    tabIndex={-1}
                    className="portrait-photo-tap-zone prev"
                    aria-label="Previous photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : profilePhotos.length - 1));
                    }}
                  />
                  <div
                    role="button"
                    tabIndex={-1}
                    className="portrait-photo-tap-zone next"
                    aria-label="Next photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx((prev) => (prev < profilePhotos.length - 1 ? prev + 1 : 0));
                    }}
                  />
                </>
              )}

              <div className="portrait-top">
                <span className="pill">{title(currentProfile.band || "A possible spark")}</span>
                {(currentProfile.matchPercentage || currentProfile.chemistry?.lower) && (
                  <span className="pill highlight">
                    ⚡ {currentProfile.matchPercentage || currentProfile.chemistry?.lower}% Match
                  </span>
                )}
                {currentProfile.isBot && <span className="pill demo">Automated demo</span>}
              </div>
              <div className="portrait-info">
                <h2>
                  {currentProfile.pseudonym}, {currentProfile.age}
                </h2>
                <p>
                  <Icon name="pin" /> {title(currentProfile.zone)}
                </p>
                <div className="row">
                  {(currentProfile.interests || []).slice(0, 4).map((interest) => (
                    <span key={interest} className="pill">
                      {title(interest)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="discovery-actions">
              <button
                type="button"
                className="round large quiet"
                onClick={() => handleSwipe(currentProfile.id, "pass")}
                aria-label={`Pass on ${currentProfile.pseudonym}`}
              >
                <Icon name="close" />
              </button>
              <button
                type="button"
                className="round large primary"
                onClick={() => handleSwipe(currentProfile.id, "like")}
                aria-label={`Like ${currentProfile.pseudonym}`}
              >
                <Icon name="heart" />
              </button>
              <button
                type="button"
                className="round large quiet"
                onClick={() => handleSwipe(currentProfile.id, "save")}
                aria-label={`Save ${currentProfile.pseudonym}`}
              >
                <Icon name="save" />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "14px", marginTop: "6px" }}>
              <p className="action-caption" style={{ margin: 0 }}>Pass · Let them know · Save for later</p>
              {lastPassedId && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="button quiet"
                  style={{ minHeight: "26px", padding: "2px 10px", fontSize: "0.74rem" }}
                >
                  <Icon name="refresh" style={{ width: "12px", height: "12px" }} /> Undo pass
                </button>
              )}
            </div>
          </section>

          <aside className="discover-aside">
            {/* World / Bio Card */}
            <div className="discover-card-panel story-panel">
              <div className="discover-panel-kicker">
                <span className="kicker-dot" />
                <span>A Glimpse of Their World</span>
              </div>
              <blockquote className="discover-bio-quote">
                “{currentProfile.bio || "There’s a story here. Start with a hello."}”
              </blockquote>
            </div>

            {/* Alignment / Shared Chemistry Card */}
            <div className="discover-card-panel align-panel">
              <div className="discover-panel-kicker">
                <span className="kicker-dot teal" />
                <span>The Little Things That Align</span>
              </div>
              <div className="align-reasons-list">
                {currentProfile.reasons && currentProfile.reasons.length > 0 ? (
                  currentProfile.reasons.map((reason, idx) => (
                    <div key={idx} className="align-reason-item">
                      <span className="align-icon-wrap">
                        <Icon name="sparkle" />
                      </span>
                      <span className="align-text">{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="align-reason-item">
                    <span className="align-icon-wrap">
                      <Icon name="sparkle" />
                    </span>
                    <span className="align-text">
                      Shared interests: {(currentProfile.interests || ["music", "travel", "art"]).slice(0, 4).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Boundaries & Safety Card */}
            <div className="discover-card-panel safety-panel">
              <div className="safety-header">
                <div>
                  <h4 className="safety-title">Curiosity, with boundaries.</h4>
                  <p className="safety-sub">A like opens possibility. Chat begins only when you both agree.</p>
                </div>
              </div>
              <div className="safety-footer-row">
                <button
                  type="button"
                  className="safety-report-btn"
                  onClick={() => navigate("desires")}
                >
                  <Icon name="compass" /> Explore desires ↗
                </button>
                <button
                  type="button"
                  className="safety-report-btn"
                  onClick={() => handleSafetyReport(currentProfile)}
                >
                  <Icon name="shield" /> Safety & report
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState
          heading={activeFilter === "liked" ? "No liked sparks yet." : "A little breathing room."}
          text={
            activeFilter === "all"
              ? "You’ve explored all current sparks for today. Check back soon for fresh introductions."
              : activeFilter === "liked"
              ? "When you send a spark or like someone, their introduction will be saved here."
              : activeFilter === "saved"
              ? "Save an introduction to return to it here."
              : "No introductions share that interest in today’s selection. Try All sparks."
          }
          link="profile"
          label="Refine your preferences"
        />
      )}

      <p className="small gap">
        Interest filters narrow today’s issued introductions; they do not reset the daily limit.
      </p>
    </>
  );
}
