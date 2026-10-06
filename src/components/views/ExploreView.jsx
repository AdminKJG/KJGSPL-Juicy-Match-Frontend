import React, { useState, useEffect, useRef } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";
import AtmosphericMap from "../common/AtmosphericMap";
import LiveStreamStudioModal from "../common/LiveStreamStudioModal";
import { useApp } from "../../context/AppContext";
import { exploreService } from "../../services/exploreService";
import { discoverService } from "../../services/discoverService";
import { livestreamService } from "../../services/livestreamService";
import { chatService } from "../../services/chatService";
import { blockService } from "../../services/blockService";
import { formatDate, formatRelativeTime, money, title, portraitClass, getPeerPortraitIndex } from "../../utils/formatters";

export default function ExploreView() {
  const { navigate, state, showToast, openModal, closeModal } = useApp();

  // Active Explore Section Tab: "areas" | "events" | "live"
  const [activeTab, setActiveTab] = useState("areas");

  // Areas / Map state
  const [mapData, setMapData] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [focusedZone, setFocusedZone] = useState(null);

  // Events state
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventFilter, setEventFilter] = useState("all");
  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);

  // Live state
  const [userMood, setUserMood] = useState("☕ Grabbing coffee & open for a chat");
  const [isChangingMood, setIsChangingMood] = useState(false);
  const [liveSparks, setLiveSparks] = useState([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);

  // Live Streams ("Go Live" & WebRTC Broadcasts)
  const [liveStreams, setLiveStreams] = useState([]);
  const [loadingLiveStreams, setLoadingLiveStreams] = useState(false);
  const [activeStreamModal, setActiveStreamModal] = useState(null); // { stream, role: "host" | "viewer" }
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [streamTitleInput, setStreamTitleInput] = useState("");
  const [recentlyEndedStream, setRecentlyEndedStream] = useState(() => livestreamService.getLastEndedStream());
  const goLiveContainerRef = useRef(null);

  // Click outside to close Go Live Popover
  useEffect(() => {
    if (!isStartingStream) return;
    const handleClickOutside = (e) => {
      if (goLiveContainerRef.current && !goLiveContainerRef.current.contains(e.target)) {
        setIsStartingStream(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStartingStream]);

  // Load Map & Areas
  const loadMap = async () => {
    setLoadingMap(true);
    try {
      const res = await exploreService.getAtmosphericMap();
      if (res) setMapData(res);
    } catch (err) {
      console.warn("Map data load error:", err.message);
    } finally {
      setLoadingMap(false);
    }
  };

  // Load Events
  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await exploreService.getEvents();
      if (res?.items) setEvents(res.items);
    } catch (err) {
      console.warn("Events load error:", err.message);
      if (state.events?.length > 0) setEvents(state.events);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load Live Streams from backend (GET /v1/livestreams)
  const loadLiveStreams = async () => {
    setLoadingLiveStreams(true);
    try {
      const currentUser = {
        id: state.me?.id,
        pseudonym: state.me?.profile?.pseudonym || "Nicole",
        isBroadcasting: activeStreamModal?.role === "host",
      };
      const items = await livestreamService.getLiveStreams(currentUser);
      const blocked = blockService.getBlockedMemberIds();
      const cleanItems = items.filter(
        (s) =>
          !blocked.includes(String(s.hostId)) &&
          !blocked.includes(String(s.creatorId)) &&
          !blocked.includes(String(s.id))
      );
      setLiveStreams(cleanItems);
      const lastEnded = livestreamService.getLastEndedStream();
      if (lastEnded) setRecentlyEndedStream(lastEnded);
    } catch (err) {
      console.warn("[JM Live] Failed to fetch active streams:", err.message);
    } finally {
      setLoadingLiveStreams(false);
    }
  };

  const handleStreamEnded = (endedId) => {
    if (!endedId) return;
    setLiveStreams((prev) => prev.filter((s) => (s.id || s.streamId) !== endedId));
    const lastEnded = livestreamService.getLastEndedStream();
    if (lastEnded) setRecentlyEndedStream(lastEnded);
  };

  // Load Live Sparks strictly from API
  const loadLiveSparks = async () => {
    setLoadingLive(true);
    try {
      const feedRes = await discoverService.getDiscoveryFeed();
      if (feedRes?.items && Array.isArray(feedRes.items)) {
        const blocked = blockService.getBlockedMemberIds();
        const unblockedItems = feedRes.items.filter((item) => !blocked.includes(String(item.id)));
        const colors = [
          "linear-gradient(135deg, #f43f5e, #e11d48)",
          "linear-gradient(135deg, #a855f7, #7c3aed)",
          "linear-gradient(135deg, #ec4899, #db2777)",
          "linear-gradient(135deg, #3b82f6, #2563eb)",
          "linear-gradient(135deg, #10b981, #059669)",
        ];
        const fallbackQuotes = [
          "Curious mind, warm heart. Always exploring new spots in the city.",
          "Here for a connection that feels effortless, fun, and authentic.",
          "Passionate about design, live music, and spontaneous weekend getaways.",
          "Coffee, city walks, and stories worth listening to.",
          "Creative soul with a love for indie films, espresso, and rooftop views.",
          "Hunting for the best matcha and quiet bookstores in the neighborhood.",
          "Late-night drives, good playlists, and thoughtful conversations.",
          "Always up for gallery openings, sunset picnics, or vinyl browsing.",
          "Looking for someone who laughs at terrible puns and loves good food.",
          "Architecture enthusiast, jazz lover, and amateur film photographer.",
        ];
        const usedQuotes = new Set();
        const dynamicSparks = unblockedItems.map((item, idx) => {
          let chosenMood = item.bio && item.bio.length > 10 && !usedQuotes.has(item.bio)
            ? item.bio
            : fallbackQuotes[idx % fallbackQuotes.length];
          usedQuotes.add(chosenMood);
          return {
            id: item.id || `live-${idx}`,
            pseudonym: item.pseudonym || "Member",
            age: item.age || 26,
            zone: item.zone ? title(item.zone) : (cityLabel || "City"),
            distance: `${(0.6 + idx * 0.5).toFixed(1)} km away`,
            mood: chosenMood,
            interests: item.interests || [],
            avatarLetter: (item.pseudonym || "M")[0].toUpperCase(),
            onlineMins: idx % 2 === 0 ? "Active now" : `Active ${idx * 3}m ago`,
            color: colors[idx % colors.length],
          };
        });
        setLiveSparks(dynamicSparks);
      } else {
        setLiveSparks([]);
      }
    } catch (err) {
      console.warn("Live sparks fetch error:", err.message);
      setLiveSparks([]);
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    loadMap();
    loadEvents();
    loadLiveSparks();
    loadLiveStreams();
  }, []);

  // Periodic refresh of live broadcasts when active on Live tab
  useEffect(() => {
    if (activeTab !== "live") return;
    loadLiveStreams();
    const interval = setInterval(loadLiveStreams, 8000);
    return () => clearInterval(interval);
  }, [activeTab, activeStreamModal]);

  // Real-time synchronization for Livestream events (host started live, host ended live)
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel("jm_live_channel");
      channel.onmessage = (e) => {
        const data = e.data;
        if (!data || !data.type) return;

        if (data.type === "HOST_STARTED_LIVE") {
          const myPseudonym = (state.me?.profile?.pseudonym || "").trim().toLowerCase();
          const hostName = (data.hostName || "").trim().toLowerCase();
          const streamId = data.streamId || data.id;

          if (streamId) {
            const incomingStream = {
              id: streamId,
              streamId,
              title: data.title || "Live Stream",
              hostName: data.hostName || "Host",
              hostId: data.hostId,
              hostPhoto: data.hostPhoto || data.photo,
              hostPortrait: data.hostPortrait ?? data.portrait ?? 0,
              viewerCount: data.viewerCount || 1,
              startedAt: data.startedAt || new Date().toISOString(),
              state: "live",
              status: "live",
            };
            setLiveStreams((prev) => {
              const clean = prev.filter((s) => (s.id || s.streamId) !== streamId);
              return [incomingStream, ...clean];
            });
          }

          loadLiveStreams();
          if (hostName && hostName !== myPseudonym) {
            showToast?.(`🔴 ${data.hostName || "A friend"} is now LIVE! Watch the stream.`);
          }
        } else if (data.type === "HOST_ENDED_LIVE") {
          handleStreamEnded(data.streamId);
          loadLiveStreams();
        }
      };
    } catch {}

    const handleStorage = (e) => {
      if (e.key === "jm_last_live_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (!data || !data.type) return;
          if (data.type === "HOST_STARTED_LIVE") {
            const myPseudonym = (state.me?.profile?.pseudonym || "").trim().toLowerCase();
            const hostName = (data.hostName || "").trim().toLowerCase();
            const streamId = data.streamId || data.id;

            if (streamId) {
              const incomingStream = {
                id: streamId,
                streamId,
                title: data.title || "Live Stream",
                hostName: data.hostName || "Host",
                hostId: data.hostId,
                hostPhoto: data.hostPhoto || data.photo,
                hostPortrait: data.hostPortrait ?? data.portrait ?? 0,
                viewerCount: data.viewerCount || 1,
                startedAt: data.startedAt || new Date().toISOString(),
                state: "live",
                status: "live",
              };
              setLiveStreams((prev) => {
                const clean = prev.filter((s) => (s.id || s.streamId) !== streamId);
                return [incomingStream, ...clean];
              });
            }

            loadLiveStreams();
            if (hostName && hostName !== myPseudonym) {
              showToast?.(`🔴 ${data.hostName || "A friend"} is now LIVE! Watch the stream.`);
            }
          } else if (data.type === "HOST_ENDED_LIVE") {
            handleStreamEnded(data.streamId);
            loadLiveStreams();
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [state.me]);

  // Host starts broadcast
  const handleConfirmStartStream = async (e) => {
    e?.preventDefault();
    const title = streamTitleInput.trim() || `${state.me?.profile?.pseudonym || "Host"}'s Live Stream ✨`;
    const hostName = state.me?.profile?.pseudonym || "You";
    const hostId = state.me?.id;
    const hostPhoto = state.me?.profile?.photo;
    const hostPortrait = state.me?.profile?.portrait ?? 0;

    try {
      showToast("Initializing broadcast studio…");
      const res = await livestreamService.startStream(title, {
        hostName,
        hostId,
        hostPhoto,
        hostPortrait,
      });
      setIsStartingStream(false);
      setStreamTitleInput("");

      const streamId = res?.id || res?.streamId || `stream_${Date.now()}`;

      const activeStreamObj = {
        id: streamId,
        streamId,
        title: res?.title || title,
        hostName,
        hostId,
        hostPortrait,
        hostPhoto,
        viewerCount: 1,
        startedAt: res?.startedAt || new Date().toISOString(),
        state: "live",
        status: "live",
      };

      setActiveStreamModal({
        stream: activeStreamObj,
        role: "host",
      });

      // Instantly show in own live broadcasts list
      setLiveStreams((prev) => {
        const clean = prev.filter((s) => (s.id || s.streamId) !== streamId);
        return [activeStreamObj, ...clean];
      });

      // Notify mutual connections in chat
      try {
        const mutuals = Array.isArray(state.connections) ? state.connections : [];
        mutuals.forEach((conn) => {
          if (conn.id) {
            chatService.sendMessage(
              conn.id,
              `🔴 I just went Live: "${res?.title || title}"! Come join my live broadcast room in Explore. 🎥`,
              null,
              { senderId: state.me?.id, peerId: conn.peer?.id }
            ).catch(() => {});
          }
        });
      } catch {}

      loadLiveStreams();
    } catch (err) {
      showToast(err.message || "Failed to start live stream.");
    }
  };

  // Viewer watches broadcast
  const handleWatchStream = (s) => {
    setActiveStreamModal({
      stream: {
        id: s.id || s.streamId,
        title: s.title || "Live Stream",
        hostName: s.pseudonym || s.hostName || s.creator || "Host",
        hostPortrait: s.portrait ?? s.hostPortrait ?? 0,
        hostPhoto: s.photo || s.hostPhoto,
        viewerCount: s.viewerCount || 1,
      },
      role: "viewer",
    });
  };

  const cityLabel = mapData?.city || (state.me?.profile?.zone ? title(state.me.profile.zone) : "Bengaluru");

  const zones = mapData?.zones && mapData.zones.length > 0 ? mapData.zones : [
    {
      id: "central",
      label: "Central Bengaluru",
      activity: "Active broad area",
      activeCount: 14,
      suppressed: false,
      latitude: 12.9716,
      longitude: 77.5946,
      tags: ["Rooftops", "Art Cafes", "Cocktail Lounges", "Vinyl Music"],
      vibe: "High energy & bustling evening atmosphere",
    },
    {
      id: "arts-quarter",
      label: "Arts & Culture Precinct",
      activity: "Active broad area",
      activeCount: 8,
      suppressed: false,
      latitude: 12.9620,
      longitude: 77.6000,
      tags: ["Galleries", "Jazz Cellars", "Boutique Books", "Espresso Bars"],
      vibe: "Intimate cultural vibes & creative sparks",
    },
    {
      id: "riverside",
      label: "Riverside Quarter",
      activity: "Moderate atmosphere",
      activeCount: 4,
      suppressed: false,
      latitude: 12.9820,
      longitude: 77.6100,
      tags: ["Waterfront Walk", "Open Patios", "Acoustic Nights"],
      vibe: "Quiet scenic strolls & relaxed conversations",
    },
    {
      id: "north",
      label: "North District",
      activity: "Not enough activity",
      activeCount: 2,
      suppressed: true,
      latitude: 12.9950,
      longitude: 77.5850,
      tags: ["Tech Hubs", "Quiet Gardens", "Specialty Roasters"],
      vibe: "Discreet clusters & privacy protected",
    },
    {
      id: "west",
      label: "West Quarter",
      activity: "Not enough activity",
      activeCount: 1,
      suppressed: true,
      latitude: 12.9600,
      longitude: 77.5600,
      tags: ["Heritage Streets", "Artisanal Bakeries"],
      vibe: "Low density residential ambiance",
    },
  ];

  // Handle Event RSVP
  const handleRsvp = async (eventId, currentState) => {
    const nextState = currentState === "confirmed" ? "cancelled" : "confirmed";
    setRsvpLoadingId(eventId);
    try {
      const res = await exploreService.submitRsvp(eventId, nextState);
      const resultingState = res?.state || (nextState === "confirmed" ? "confirmed" : null);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, rsvp: resultingState } : e))
      );
      showToast(
        resultingState === "confirmed"
          ? "RSVP confirmed! Spot reserved for the evening. 🎟️"
          : resultingState === "waitlisted"
          ? "Event is full. Placed on priority waitlist."
          : "RSVP cancelled."
      );
    } catch (err) {
      showToast(err.message || "Failed to update RSVP.");
    } finally {
      setRsvpLoadingId(null);
    }
  };

  const filteredEvents = eventFilter === "all"
    ? events
    : events.filter((e) => (e.data?.category || "").toLowerCase() === eventFilter);

  // Send Wave to Live Spark
  const handleSendWave = (spark) => {
    showToast(`You waved at ${spark.pseudonym}! 👋`);
    setLiveFeed((prev) => [
      { id: `wave-${Date.now()}`, text: `You sent a wave to ${spark.pseudonym}`, time: "Just now", icon: "👋" },
      ...prev,
    ]);
  };

  // Join Live Lounge
  const handleOpenLiveLounge = () => {
    openModal(
      "After-Hours Live Lounge 🎙️",
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(168, 85, 247, 0.15)", padding: "14px 16px", borderRadius: "14px", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
          <div style={{ fontSize: "2rem" }}>📻</div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem" }}>Atmospheric Vinyl & Low-Fi Room</h3>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--cream)" }}>
              Hosted live ambient room · 6 members listening & exchanging conversational notes
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["Maya", "Elena", "Sophia", "Leo", "Aria", "Nicole"].map((name) => (
            <span key={name} className="pill" style={{ background: "rgba(255,255,255,0.06)", fontSize: "0.8rem", padding: "4px 12px" }}>
              🟢 {name}
            </span>
          ))}
        </div>

        <p style={{ fontSize: "0.88rem", color: "var(--muted)", margin: "4px 0" }}>
          Microphones are opt-in only. Step in quietly or share a thought when the rhythm feels right.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" className="button quiet" onClick={closeModal}>
            Leave
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              closeModal();
              showToast("Connected to Live Lounge! 🎙️");
            }}
          >
            Enter Lounge 🎧
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="explore-view-container">
      <PageHead
        kicker="Curated Discovery"
        heading="Explore"
        description="Discover neighborhood atmospheres, curated events, and real-time live activity in your area."
        action={
          <button
            type="button"
            className="refresh-circle-btn"
            onClick={async () => {
              if (activeTab === "areas") await loadMap();
              if (activeTab === "events") await loadEvents();
              if (activeTab === "live") await loadLiveSparks();
              showToast("Explore refreshed.");
            }}
            title="Refresh current section"
          >
            <Icon name="refresh" />
          </button>
        }
      />

      {/* 3 Main Category Navigation Tabs: Areas | Events | Live */}
      <div className="explore-nav-tabs">
        <button
          type="button"
          className={`explore-nav-btn ${activeTab === "areas" ? "active" : ""}`}
          onClick={() => setActiveTab("areas")}
        >
          <Icon name="compass" />
          <span>Areas</span>
          <span className="explore-nav-badge">{zones.length}</span>
        </button>

        <button
          type="button"
          className={`explore-nav-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          <Icon name="arrow" />
          <span>Events</span>
          <span className="explore-nav-badge">{events.length}</span>
        </button>

        <button
          type="button"
          className={`explore-nav-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          <span>Live</span>
        </button>
      </div>

      {/* ============================================================
          SECTION 1: AREAS & ATMOSPHERIC MAP
          ============================================================ */}
      {activeTab === "areas" && (
        <section className="explore-section-areas animate-fadeIn">
          {/* Panoramic Cartographic Map */}
          <div style={{ width: "100%", marginBottom: "28px" }}>
            {loadingMap ? (
              <div className="panel" style={{ height: "460px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "20px" }}>
                <Loader text="Loading city map…" />
              </div>
            ) : (
              <div style={{ height: "460px", width: "100%", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(244, 63, 94, 0.25)" }}>
                <AtmosphericMap
                  zones={zones}
                  city={cityLabel}
                  activityWindow={mapData?.activityWindowMinutes || 120}
                  onSelectZone={(z) => setFocusedZone(z)}
                />
              </div>
            )}
          </div>

          {/* Neighborhood Areas Grid */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div className="eyebrow">METROPOLITAN REGIONS · {cityLabel.toUpperCase()}</div>
                <h2 style={{ fontSize: "1.35rem", margin: "4px 0 0", color: "#ffffff" }}>
                  Neighborhoods
                </h2>
              </div>
              <span style={{ fontSize: "0.84rem", color: "#bfaabf" }}>
                Privacy-protected clustering
              </span>
            </div>

            <div className="explore-areas-grid">
              {zones.map((zone) => {
                const isSuppressed = zone.suppressed;
                const activeCount = zone.activeCount || 0;
                const isFocused = focusedZone?.id === zone.id;

                return (
                  <article
                    key={zone.id}
                    className="explore-area-card"
                    style={{
                      borderColor: isFocused ? "#f43f5e" : undefined,
                      boxShadow: isFocused ? "0 0 20px rgba(244, 63, 94, 0.3)" : undefined,
                    }}
                  >
                    <div>
                      <div className="explore-area-header">
                        <div>
                          <h3 className="explore-area-title">📍 {zone.label || title(zone.id)}</h3>
                          <span
                            className="pill"
                            style={{
                              fontSize: "0.74rem",
                              background: isSuppressed ? "rgba(100, 116, 139, 0.3)" : "rgba(16, 185, 129, 0.2)",
                              color: isSuppressed ? "#cbd5e1" : "#a7f3d0",
                            }}
                          >
                            {isSuppressed ? "🔒 Privacy Protected" : `● ${activeCount} active sparks`}
                          </span>
                        </div>
                      </div>

                      <p style={{ margin: "12px 0 8px", fontSize: "0.88rem", color: "var(--cream)", lineHeight: 1.45 }}>
                        {zone.vibe || zone.activity || "Vibrant local atmosphere."}
                      </p>

                      {zone.tags && (
                        <div className="explore-area-tags">
                          {zone.tags.map((t) => (
                            <span key={t} className="explore-area-tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="button quiet"
                      style={{
                        width: "100%",
                        minHeight: "38px",
                        fontSize: "0.84rem",
                        marginTop: "10px",
                        display: "flex",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                      onClick={() => {
                        setFocusedZone(zone);
                        window.scrollTo({ top: 120, behavior: "smooth" });
                        showToast(`Focused on ${zone.label || zone.id}`);
                      }}
                    >
                      <Icon name="compass" />
                      <span>View on Map</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 2: HOSTED EVENTS & EXPERIENCES
          ============================================================ */}
      {activeTab === "events" && (
        <section className="explore-section-events animate-fadeIn">
          {/* Event Filter Pills */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "22px" }}>
            <div>
              <div className="eyebrow">CURATED GATHERINGS</div>
              <h2 style={{ fontSize: "1.35rem", margin: "4px 0 0", color: "#ffffff" }}>
                Featured Events
              </h2>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["all", "social", "cultural", "exploration"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pill ${eventFilter === cat ? "demo" : ""}`}
                  style={{
                    cursor: "pointer",
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    border: eventFilter === cat ? "1px solid #f43f5e" : undefined,
                  }}
                  onClick={() => setEventFilter(cat)}
                >
                  {cat === "all" ? "All" : title(cat)}
                </button>
              ))}
            </div>
          </div>

          {loadingEvents ? (
            <Loader text="Loading curated events…" />
          ) : filteredEvents.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {filteredEvents.map((v) => {
                const starts = new Date(v.data?.startsAt || Date.now());
                const monthStr = starts.toLocaleDateString("en", { month: "short" });
                const dayStr = starts.getDate();
                const isConfirmed = v.rsvp === "confirmed";
                const isWaitlisted = v.rsvp === "waitlisted";
                const isProcessing = rsvpLoadingId === v.id;

                return (
                  <article key={v.id} className="event" style={{ position: "relative" }}>
                    <div className="event-date">
                      <small>{monthStr}</small>
                      <strong>{dayStr}</strong>
                    </div>

                    <div>
                      <div className="row" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                        <span className="eyebrow">{title(v.data?.category || "Social")}</span>
                        {v.data?.zone && <span className="pill">{title(v.data.zone)}</span>}
                        {v.data?.capacity && (
                          <span className="pill" style={{ fontSize: "0.72rem" }}>
                            {v.data?.confirmedCount || 0} / {v.data.capacity} spots filled
                          </span>
                        )}
                      </div>

                      <h2 style={{ fontSize: "1.25rem", margin: "4px 0" }}>{v.data?.title || "Hosted Gathering"}</h2>
                      <p style={{ margin: "6px 0 10px", lineHeight: "1.45", color: "var(--cream)" }}>
                        {v.data?.description}
                      </p>
                      <p style={{ margin: "0 0 6px", fontSize: "0.88rem", color: "var(--muted)" }}>
                        📍 {v.data?.venue} · {formatDate(v.data?.startsAt, v.data?.timeZone)} ({v.data?.timeZone || "Local"})
                      </p>
                      <small style={{ color: "var(--muted)" }}>
                        {v.data?.cancellation || "Free cancellation"} · {money(v.data?.priceCents || 0, v.data?.currency || "USD")}
                      </small>

                      {isConfirmed && (
                        <p className="success" style={{ marginTop: "8px", fontWeight: "600", fontSize: "0.86rem" }}>
                          ✓ Confirmed Guest ({v.data?.organizer || "Juicy Match Host"})
                        </p>
                      )}
                      {isWaitlisted && (
                        <p style={{ marginTop: "8px", fontWeight: "600", fontSize: "0.86rem", color: "var(--sand)" }}>
                          ⏳ Priority Waitlist
                        </p>
                      )}
                    </div>

                    <div className="buttonbar">
                      <button
                        type="button"
                        className={isConfirmed ? "button quiet danger" : "button primary"}
                        disabled={isProcessing}
                        onClick={() => handleRsvp(v.id, v.rsvp)}
                      >
                        {isProcessing
                          ? "Updating…"
                          : isConfirmed
                          ? "Cancel RSVP"
                          : isWaitlisted
                          ? "Leave Waitlist"
                          : "RSVP Now"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              heading="No scheduled events."
              text="Newly published member events will appear here."
            />
          )}
        </section>
      )}

      {/* ============================================================
          SECTION 3: LIVE RADAR & REALTIME SPARKS
          ============================================================ */}
      {activeTab === "live" && (
        <section className="explore-section-live animate-fadeIn">
          {/* ============================================================
              LIVE VIDEO BROADCASTS (GO LIVE & WEBRTC ROOMS)
              ============================================================ */}
          <div style={{ marginTop: "8px", marginBottom: "38px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="eyebrow" style={{ margin: 0, color: "#f43f5e", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="live-pulsing-dot" />
                  <span>LIVE BROADCASTS</span>
                </div>
                {liveStreams.length > 0 && (
                  <span className="pill" style={{ background: "rgba(244,63,94,0.2)", color: "#fb7185", fontWeight: 700, fontSize: "0.74rem", border: "1px solid rgba(244,63,94,0.3)" }}>
                    {liveStreams.length} Active Now
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="button quiet"
                  style={{ minHeight: "36px", padding: "0 14px", fontSize: "0.8rem", borderRadius: "10px" }}
                  onClick={loadLiveStreams}
                  title="Refresh active streams"
                >
                  <Icon name="refresh" />
                  <span>Refresh</span>
                </button>

                <div style={{ position: "relative" }} ref={goLiveContainerRef}>
                  <button
                    type="button"
                    className="button primary"
                    style={{
                      minHeight: "38px",
                      padding: "0 20px",
                      background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                      boxShadow: "0 4px 18px rgba(244, 63, 94, 0.4)",
                      fontWeight: 700,
                      borderRadius: "10px",
                    }}
                    onClick={() => {
                      setIsStartingStream((prev) => !prev);
                      if (!streamTitleInput) {
                        setStreamTitleInput(`${state.me?.profile?.pseudonym || "Host"}'s Live Stream ✨`);
                      }
                    }}
                  >
                    <span>Go Live</span> 🎥
                  </button>

                  {/* Floating Popover Right at the Go Live Button */}
                  {isStartingStream && (
                    <div className="go-live-popover-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.4rem" }}>🎥</span>
                          <div>
                            <h4 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>Start Live Stream</h4>
                            <span style={{ fontSize: "0.74rem", color: "#a89fb0" }}>Broadcast live video & audio</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="button quiet"
                          style={{ minHeight: "26px", padding: "0 8px", fontSize: "0.85rem", lineHeight: 1 }}
                          onClick={() => setIsStartingStream(false)}
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleConfirmStartStream}>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "#fb7185", letterSpacing: "0.5px", marginBottom: "6px" }}>
                          STREAM TITLE
                        </label>
                        <input
                          type="text"
                          autoFocus
                          placeholder="e.g. Evening Chat & Vibes ✨"
                          value={streamTitleInput}
                          onChange={(e) => setStreamTitleInput(e.target.value)}
                          className="go-live-title-input"
                        />

                        {/* Quick suggestions */}
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                          {["✨ Casual Vibes", "☕ Coffee & Chat", "🍷 Evening Lounge"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className="pill"
                              style={{ fontSize: "0.72rem", padding: "2px 8px", cursor: "pointer" }}
                              onClick={() => setStreamTitleInput(preset)}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="button quiet"
                            style={{ minHeight: "34px", padding: "0 12px", fontSize: "0.82rem" }}
                            onClick={() => setIsStartingStream(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="button primary"
                            style={{
                              minHeight: "34px",
                              padding: "0 16px",
                              fontSize: "0.84rem",
                              fontWeight: 700,
                              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                              boxShadow: "0 4px 14px rgba(244, 63, 94, 0.4)",
                            }}
                          >
                            <span>Go Live Now</span> 🚀
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loadingLiveStreams ? (
              <Loader text="Discovering active live broadcasts…" />
            ) : liveStreams.length === 1 ? (
              /* SPOTLIGHT HERO CARD WHEN 1 BROADCAST IS LIVE */
              (() => {
                const s = liveStreams[0];
                const hName = s.pseudonym || s.hostName || s.creator || "Host";
                const pIdx = s.portrait ?? s.hostPortrait ?? 0;
                return (
                  <article className="explore-broadcast-featured-card">
                    <div className="explore-broadcast-featured-media">
                      <div className="explore-broadcast-badge">
                        <span className="live-pulsing-dot" />
                        <span>LIVE NOW</span>
                      </div>
                      <div className="explore-broadcast-viewers">
                        <Icon name="user" />
                        <span>{s.viewerCount ?? 1} watching</span>
                      </div>

                      <div className="explore-broadcast-avatar-stage">
                        <div className={`explore-broadcast-avatar portrait ${portraitClass(pIdx)}`} style={{ width: "80px", height: "80px", fontSize: "1.8rem" }}>
                          {s.photo ? <img src={s.photo} alt="" /> : <span>{hName[0]?.toUpperCase() || "H"}</span>}
                        </div>
                        <div className="live-broadcast-ring-pulse" />
                      </div>

                      <div className="explore-broadcast-soundwave-bar">
                        <div className="live-audio-waves">
                          <span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#fb7185", fontWeight: 700, letterSpacing: "0.5px" }}>LIVE ON AIR</span>
                      </div>
                    </div>

                    <div className="explore-broadcast-featured-content">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span className="pill" style={{ background: "rgba(244,63,94,0.18)", color: "#fb7185", fontWeight: 800, fontSize: "0.72rem", border: "1px solid rgba(244,63,94,0.3)" }}>
                          FEATURED STREAM
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "#a89fb0" }}>
                          {s.startedAt ? `Started ${formatDate(s.startedAt)}` : "Broadcasting live now"}
                        </span>
                      </div>

                      <h3 className="explore-broadcast-featured-title">
                        {s.title || "Live Stream & Vibes ✨"}
                      </h3>

                      <div className="explore-broadcast-featured-host">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>{hName}</span>
                          <span className="pill" style={{ background: "rgba(16,185,129,0.2)", color: "#6ee7b7", fontSize: "0.68rem", padding: "1px 6px" }}>
                            Verified Host
                          </span>
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: "0.86rem", color: "#d8c7db", lineHeight: 1.45 }}>
                          Join the live room to watch the broadcast, chat in real-time, and send live reaction waves to {hName}.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", marginBottom: "16px" }}>
                        <span className="explore-area-tag" style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.05)" }}>
                          📹 Video & Audio
                        </span>
                        <span className="explore-area-tag" style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.05)" }}>
                          💬 Real-time Chat
                        </span>
                        <span className="explore-area-tag" style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.05)" }}>
                          👋 Mutual Waves
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "auto", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="button primary"
                          style={{
                            flex: "1 1 200px",
                            minHeight: "44px",
                            fontSize: "0.92rem",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                            boxShadow: "0 6px 20px rgba(244, 63, 94, 0.45)",
                            borderRadius: "12px",
                          }}
                          onClick={() => handleWatchStream(s)}
                        >
                          <span>Watch Live Stream</span> 👁️
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })()
            ) : liveStreams.length > 1 ? (
              /* RESPONSIVE GRID WHEN 2 OR MORE BROADCASTS ARE LIVE */
              <div className="explore-broadcasts-grid">
                {liveStreams.map((s) => {
                  const hName = s.pseudonym || s.hostName || s.creator || "Host";
                  const pIdx = s.portrait ?? s.hostPortrait ?? 0;
                  return (
                    <article key={s.id} className="explore-broadcast-card">
                      <div className="explore-broadcast-preview">
                        <div className="explore-broadcast-badge">
                          <span className="live-pulsing-dot" />
                          <span>LIVE</span>
                        </div>
                        <div className="explore-broadcast-viewers">
                          <Icon name="user" />
                          <span>{s.viewerCount ?? 1} watching</span>
                        </div>

                        <div className="explore-broadcast-avatar-stage">
                          <div className={`explore-broadcast-avatar portrait ${portraitClass(pIdx)}`} style={{ width: "64px", height: "64px", fontSize: "1.4rem" }}>
                            {s.photo ? <img src={s.photo} alt="" /> : <span>{hName[0]?.toUpperCase() || "H"}</span>}
                          </div>
                          <div className="live-broadcast-ring-pulse" />
                        </div>

                        <div className="explore-broadcast-soundwave-bar">
                          <div className="live-audio-waves">
                            <span></span><span></span><span></span><span></span>
                          </div>
                        </div>
                      </div>

                      <div className="explore-broadcast-body">
                        <h4 className="explore-broadcast-title" title={s.title || "Live Stream"}>
                          {s.title || "Live Stream & Vibes ✨"}
                        </h4>

                        <div className="explore-broadcast-host-meta" style={{ marginBottom: "14px" }}>
                          <div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>{hName}</span>
                              <span style={{ fontSize: "0.68rem", color: "#f43f5e", background: "rgba(244,63,94,0.15)", padding: "1px 6px", borderRadius: "999px" }}>Host</span>
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#a89fb0", marginTop: "2px" }}>
                              {s.startedAt ? formatDate(s.startedAt) : "Broadcasting live"}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="button primary"
                          style={{ width: "100%", minHeight: "38px", fontSize: "0.85rem", marginTop: "auto", borderRadius: "10px" }}
                          onClick={() => handleWatchStream(s)}
                        >
                          <span>Watch Live</span> 👁️
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: "linear-gradient(135deg, rgba(28, 12, 38, 0.6) 0%, rgba(16, 6, 24, 0.8) 100%)",
                border: "1px dashed rgba(244, 63, 94, 0.35)",
                borderRadius: "20px",
                padding: "36px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}>
                <div style={{ fontSize: "2.4rem", filter: "drop-shadow(0 0 16px rgba(244, 63, 94, 0.5))" }}>
                  📡
                </div>

                {recentlyEndedStream && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(244, 63, 94, 0.12)",
                    border: "1px solid rgba(244, 63, 94, 0.28)",
                    borderRadius: "999px",
                    padding: "4px 14px",
                    fontSize: "0.78rem",
                    color: "#fecdd3",
                    fontWeight: "600",
                  }}>
                    <span>⏱️</span>
                    <span>
                      {recentlyEndedStream.hostName || "Host"} was live {formatRelativeTime(recentlyEndedStream.endedAt) || "recently"}
                    </span>
                  </div>
                )}

                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1.2rem", fontWeight: 700 }}>
                  No active live broadcasts right now
                </h3>
                <p style={{ margin: 0, color: "#d8c7db", fontSize: "0.88rem", maxWidth: "460px" }}>
                  Be the first to Go Live! Broadcast your audio and video stream to your mutual connections and chat in real-time.
                </p>
                <button
                  type="button"
                  className="button primary"
                  style={{
                    marginTop: "8px",
                    minHeight: "40px",
                    padding: "0 22px",
                    background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                    boxShadow: "0 4px 18px rgba(244, 63, 94, 0.4)",
                    fontWeight: 700,
                  }}
                  onClick={() => {
                    setIsStartingStream(true);
                    if (!streamTitleInput) {
                      setStreamTitleInput(`${state.me?.profile?.pseudonym || "Host"}'s Live Stream ✨`);
                    }
                    goLiveContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <span>Start a Broadcast</span> 🎥
                </button>
              </div>
            )}
          </div>

          {/* Real-time Activity Feed */}
          {liveFeed.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <div className="eyebrow" style={{ marginBottom: "12px" }}>
                REAL-TIME ACTIVITY
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {liveFeed.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 18px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                      <span style={{ fontSize: "0.88rem", color: "#e2d2e6" }}>{item.text}</span>
                    </div>
                    <span style={{ fontSize: "0.76rem", color: "#a89fb0" }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}


      {/* Fullscreen Live Stream Studio / Viewer Modal */}
      {activeStreamModal && (
        <LiveStreamStudioModal
          stream={activeStreamModal.stream}
          role={activeStreamModal.role}
          onStreamEnded={handleStreamEnded}
          onClose={() => {
            const endedId = activeStreamModal.stream?.id;
            setActiveStreamModal(null);
            if (endedId && livestreamService.isStreamEndedLocally(endedId)) {
              handleStreamEnded(endedId);
            }
            loadLiveStreams();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
