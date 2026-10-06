import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { title } from "../../utils/formatters";

export default function AtmosphericMap({ zones = [], city = "Bengaluru", activityWindow = 120, onSelectZone }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [layerType, setLayerType] = useState("satellite"); // default to satellite
  const [isLeafletReady, setIsLeafletReady] = useState(Boolean(window.L));

  // Check if Leaflet is ready or wait for script load
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
      // High-Resolution World Satellite Imagery from Esri (Zero API key required)
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(mapInstanceRef.current);
    } else {
      // OpenStreetMap Base
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

    // Filter valid zones with coordinates
    const validZones = zones.map((z, idx) => {
      let lat = z.latitude;
      let lng = z.longitude;
      // If coordinates missing, assign realistic offsets around Bengaluru or city center
      if (!lat || !lng) {
        const offsets = [
          [12.9716, 77.5946], // Central
          [12.9820, 77.6100], // Riverside / East
          [12.9620, 77.6000], // Arts Quarter
          [12.9950, 77.5850], // North
          [12.9600, 77.5600], // West
        ];
        lat = offsets[idx % offsets.length][0];
        lng = offsets[idx % offsets.length][1];
      }
      return { ...z, latitude: lat, longitude: lng };
    });

    if (validZones.length === 0) return;

    // Calculate center
    const centerLat = validZones.reduce((acc, z) => acc + z.latitude, 0) / validZones.length;
    const centerLng = validZones.reduce((acc, z) => acc + z.longitude, 0) / validZones.length;

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
    circlesRef.current = [];

    // Add glowing density circles & custom pins
    validZones.forEach((z) => {
      const isSuppressed = z.suppressed;
      const activeCount = z.activeCount || 0;
      const hasActivity = !isSuppressed && activeCount > 0;
      const themeColor = hasActivity ? "#10b981" : isSuppressed ? "#64748b" : "#f43f5e";

      // Density Halo Circle with refined, non-overwhelming radius
      const circle = L.circle([z.latitude, z.longitude], {
        radius: hasActivity ? 550 : 380,
        color: themeColor,
        fillColor: themeColor,
        fillOpacity: hasActivity ? 0.16 : 0.08,
        weight: 1.5,
        dashArray: isSuppressed ? "4, 6" : undefined,
      }).addTo(map);
      circlesRef.current.push(circle);

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="leaflet-atm-marker ${hasActivity ? "active" : isSuppressed ? "suppressed" : "normal"}">
            <div class="leaflet-atm-pin">
              ${hasActivity ? `<span class="pin-count">${activeCount}</span>` : isSuppressed ? `<span class="pin-icon">🔒</span>` : `<span class="pin-dot"></span>`}
            </div>
            <div class="leaflet-atm-label">
              <span>${z.label || title(z.id)}</span>
            </div>
          </div>
        `,
        iconSize: [120, 56],
        iconAnchor: [60, 20],
      });

      const marker = L.marker([z.latitude, z.longitude], { icon: customIcon }).addTo(map);

      marker.on("click", () => {
        setSelectedZone(z);
        if (onSelectZone) onSelectZone(z);
        map.flyTo([z.latitude, z.longitude], 14, { duration: 0.8 });
      });

      markersRef.current.push(marker);
    });

    if (validZones.length > 1) {
      const bounds = L.latLngBounds(validZones.map((z) => [z.latitude, z.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    if (!selectedZone && validZones.length > 0) {
      setSelectedZone(validZones[0]);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady, zones]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`real-atmospheric-map-container ${layerType === "satellite" ? "satellite-mode" : "dark-mode"}`}>
      {/* Map Canvas Mount */}
      <div ref={mapContainerRef} className="real-leaflet-map-canvas" />

      {/* Floating Top Controls */}
      <div className="map-floating-top-bar">
        <div className="map-city-status-pill">
          <span className="live-pulsing-dot"></span>
          <strong>{city}</strong>
          <span className="divider">·</span>
          <span>{zones.length} Zones</span>
        </div>

        <div className="map-action-controls">
          {/* Layer switcher button */}
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

      {/* Floating Bottom Zone Info Sheet */}
      {selectedZone && (
        <div className="map-floating-bottom-sheet">
          <div className="sheet-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="sheet-zone-title">📍 {selectedZone.label || title(selectedZone.id)}</span>
              <span
                className="pill"
                style={{
                  fontSize: "0.7rem",
                  background: selectedZone.suppressed ? "rgba(100, 116, 139, 0.35)" : "rgba(16, 185, 129, 0.22)",
                  color: selectedZone.suppressed ? "#cbd5e1" : "#a7f3d0",
                  border: "none",
                  padding: "2px 7px",
                  borderRadius: "6px",
                  backdropFilter: "blur(8px)",
                }}
              >
                {selectedZone.suppressed ? "Privacy Protected" : "Active Density"}
              </span>
              <span style={{ fontSize: "0.72rem", color: "#a89fb0" }}>
                {activityWindow}m window
              </span>
            </div>
            <button
              type="button"
              className="sheet-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedZone(null);
              }}
              title="Close details"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <p className="sheet-desc">
            {selectedZone.activity || "Normal local activity"} —{" "}
            {selectedZone.suppressed
              ? "Cluster suppressed to prevent individual triangulation."
              : `${selectedZone.activeCount || 0} active sparks detected in this geographic area.`}
          </p>
        </div>
      )}
    </div>
  );
}
