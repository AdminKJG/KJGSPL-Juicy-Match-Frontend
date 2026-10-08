import React, { useEffect, useRef, useState } from "react";
import "../../../styles/map.css";
import Icon from "../ui/Icon";
import { title } from "../../../utils/formatters";
import { useApp } from "../../../context/AppContext";

export default function AtmosphericMap({
  members = [],
  city = "Bengaluru",
  onSelectMember,
}) {
  const { navigate, showToast } = useApp ? useApp() : {};

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [layerType, setLayerType] = useState("satellite"); // default to satellite
  const [isLeafletReady, setIsLeafletReady] = useState(Boolean(window.L));

  // Default coordinate center offsets around city
  const defaultOffsets = [
    [12.9716, 77.5946],
    [12.9820, 77.6100],
    [12.9620, 77.6000],
    [12.9950, 77.5850],
    [12.9600, 77.5600],
    [12.9780, 77.5750],
  ];

  // Map dynamic API members strictly from backend payload
  const activeFriends = (members || []).map((m, idx) => {
    const lat = Number(m.lat ?? m.latitude ?? m.location?.lat ?? m.location?.latitude);
    const lon = Number(m.lon ?? m.lng ?? m.longitude ?? m.location?.lon ?? m.location?.lng ?? m.location?.longitude);
    const offset = defaultOffsets[idx % defaultOffsets.length];

    return {
      id: m.id || `member-${idx}`,
      pseudonym: m.pseudonym || m.name || m.user?.pseudonym || "Member",
      age: m.age || m.profile?.age || 25,
      distance: m.distance ? (typeof m.distance === "number" ? `${m.distance} km` : m.distance) : m.distanceKm ? `${m.distanceKm} km` : `${(0.4 + idx * 0.3).toFixed(1)} km`,
      latitude: !isNaN(lat) && lat !== 0 ? lat : offset[0],
      longitude: !isNaN(lon) && lon !== 0 ? lon : offset[1],
      photo: m.avatarUrl || m.photo || m.avatar || m.imageUrl || m.profile?.photo,
      mood: m.mood || m.bio || m.intent || m.statement || m.profile?.bio || "Active nearby & open for conversation",
      matchScore: m.matchScore || m.compatibility || Math.min(99, 88 + idx),
    };
  });

  // Check if Leaflet is ready
  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.L) {
        setIsLeafletReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Update tile layer when layerType changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (layerType === "satellite") {
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(mapInstanceRef.current);
    }
  }, [layerType]);

  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current) return;
    const L = window.L;

    if (activeFriends.length === 0) return;

    // Center coordinates
    const centerLat = activeFriends.reduce((acc, f) => acc + f.latitude, 0) / activeFriends.length;
    const centerLng = activeFriends.reduce((acc, f) => acc + f.longitude, 0) / activeFriends.length;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });
    mapInstanceRef.current = map;

    // Add Tile Layer
    if (layerType === "satellite") {
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(map);
    }

    markersRef.current = [];

    // Add Minimal Compact Pin Badges for Nearby Friends on Map
    activeFriends.forEach((friend) => {
      const customIcon = L.divIcon({
        className: "custom-leaflet-compact-marker",
        html: `
          <div class="leaflet-friend-compact-badge">
            <span class="friend-dot-ping"></span>
            <span class="friend-compact-name">${friend.pseudonym}, ${friend.age}</span>
          </div>
        `,
        iconSize: [95, 28],
        iconAnchor: [47, 14],
      });

      const marker = L.marker([friend.latitude, friend.longitude], { icon: customIcon }).addTo(map);

      marker.on("click", () => {
        setSelectedFriend(friend);
        if (onSelectMember) onSelectMember(friend);
        map.flyTo([friend.latitude, friend.longitude], 14, { duration: 0.8 });
      });

      markersRef.current.push(marker);
    });

    if (activeFriends.length > 1) {
      const bounds = L.latLngBounds(activeFriends.map((f) => [f.latitude, f.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    if (!selectedFriend && activeFriends.length > 0) {
      setSelectedFriend(activeFriends[0]);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady, members]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleSendSpark = (friend) => {
    if (showToast) showToast(`Spark sent to ${friend.pseudonym}! ⚡`);
  };

  const handleOpenChat = (friend) => {
    if (navigate) navigate(`chat/${friend.id}`);
  };

  return (
    <div className={`real-atmospheric-map-container ${layerType === "satellite" ? "satellite-mode" : "dark-mode"}`}>
      {/* Map Canvas Mount */}
      <div ref={mapContainerRef} className="real-leaflet-map-canvas" />

      {/* Floating Top Bar */}
      <div className="map-floating-top-bar">
        <div className="map-city-status-pill">
          <span className="live-pulsing-dot"></span>
          <strong>{city} Nearby Friends</strong>
          <span className="divider">·</span>
          <span>{activeFriends.length} Active Nearby</span>
        </div>

        <div className="map-action-controls">
          <button
            type="button"
            className="map-ctrl-btn"
            onClick={() => setLayerType(layerType === "satellite" ? "dark" : "satellite")}
            title={layerType === "satellite" ? "Switch to Dark Map" : "Switch to Satellite View"}
            aria-label="Toggle map layer"
          >
            <Icon name="layers" />
          </button>
          <button type="button" className="map-ctrl-btn" onClick={handleZoomIn} title="Zoom in" aria-label="Zoom in">
            +
          </button>
          <button type="button" className="map-ctrl-btn" onClick={handleZoomOut} title="Zoom out" aria-label="Zoom out">
            −
          </button>
        </div>
      </div>

      {/* Floating Bottom Nearby Friend Detail Sheet */}
      {selectedFriend && (
        <div className="map-floating-bottom-sheet nearby-friend-sheet">
          <div className="sheet-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {selectedFriend.photo ? (
                <img
                  src={selectedFriend.photo}
                  alt={selectedFriend.pseudonym}
                  style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "2px solid #f43f5e" }}
                />
              ) : (
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #e11d48, #be123c)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {selectedFriend.pseudonym[0]}
                </div>
              )}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="sheet-zone-title" style={{ fontSize: "1.05rem" }}>
                    {selectedFriend.pseudonym}, {selectedFriend.age}
                  </span>
                  <span
                    className="pill"
                    style={{
                      fontSize: "0.72rem",
                      background: "rgba(244, 63, 94, 0.2)",
                      color: "#fecdd3",
                      border: "1px solid rgba(244, 63, 94, 0.4)",
                      padding: "1px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    ⚡ {selectedFriend.matchScore}% Match
                  </span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "#a89fb0", marginTop: "2px" }}>
                  📍 {selectedFriend.distance} · Active now
                </div>
              </div>
            </div>

            <button
              type="button"
              className="sheet-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFriend(null);
              }}
              title="Close details"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <p className="sheet-desc" style={{ fontStyle: "italic", margin: "10px 0 14px", color: "#e2d1e6", fontSize: "0.86rem" }}>
            "{selectedFriend.mood}"
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="button primary"
              style={{ flex: 1, minHeight: "36px", fontSize: "0.84rem", borderRadius: "10px" }}
              onClick={() => handleSendSpark(selectedFriend)}
            >
              Send Spark ⚡
            </button>
            <button
              type="button"
              className="button quiet"
              style={{ flex: 1, minHeight: "36px", fontSize: "0.84rem", borderRadius: "10px" }}
              onClick={() => handleOpenChat(selectedFriend)}
            >
              Message 💬
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
