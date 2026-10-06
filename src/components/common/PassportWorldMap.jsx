import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export default function PassportWorldMap({ selectedCity, plans = [], onSelectDestination }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const activeCircleRef = useRef(null);
  const planMarkersRef = useRef([]);

  const [layerType, setLayerType] = useState("satellite"); // "satellite" | "dark"
  const [isLeafletReady, setIsLeafletReady] = useState(Boolean(window.L));

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
          maxZoom: 18,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 18,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(mapInstanceRef.current);
    }
  }, [layerType]);

  // Initialize Map
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current) return;
    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [22, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 15,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });
    mapInstanceRef.current = map;

    // Add Initial Tile Layer
    if (layerType === "satellite") {
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 18,
          subdomains: ["a", "b", "c"],
        }
      ).addTo(map);
    }

    // Ensure map fits container perfectly
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]);

  // Render Saved Travel Plans Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear old plan markers
    planMarkersRef.current.forEach((m) => map.removeLayer(m));
    planMarkersRef.current = [];

    (plans || []).forEach((p) => {
      const lat = p.city?.lat || p.data?.lat;
      const lon = p.city?.lon || p.data?.lon;
      if (!lat || !lon) return;

      const planIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="passport-map-pin saved-plan">
            <div class="passport-pin-dot">✈️</div>
            <div class="passport-pin-label">
              <span>${p.city?.name || "Itinerary"}</span>
            </div>
          </div>
        `,
        iconSize: [110, 48],
        iconAnchor: [55, 20],
      });

      const marker = L.marker([lat, lon], { icon: planIcon }).addTo(map);
      marker.on("click", () => {
        if (onSelectDestination) onSelectDestination(p);
      });
      planMarkersRef.current.push(marker);
    });
  }, [plans, isLeafletReady]);

  // Handle Gentle FlyTo & Pulsing Marker when Selected City Changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clean up previous active marker and circle
    if (activeMarkerRef.current) {
      map.removeLayer(activeMarkerRef.current);
      activeMarkerRef.current = null;
    }
    if (activeCircleRef.current) {
      map.removeLayer(activeCircleRef.current);
      activeCircleRef.current = null;
    }

    if (selectedCity && selectedCity.lat && selectedCity.lon) {
      const lat = selectedCity.lat;
      const lon = selectedCity.lon;

      // Gentle, graceful zoom (zoom 4 for country, 5.5 for city)
      const targetZoom = selectedCity.isCountryLevel ? 4 : 5.5;
      map.flyTo([lat, lon], targetZoom, {
        duration: 1.6,
        easeLinearity: 0.25,
      });

      // Halo pulse circle around selected destination
      activeCircleRef.current = L.circle([lat, lon], {
        radius: 80000, // 80km broad metropolitan halo
        color: "#f43f5e",
        fillColor: "#f43f5e",
        fillOpacity: 0.22,
        weight: 2,
      }).addTo(map);

      // Active pulsing destination pin
      const activeIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="passport-map-pin active-selection">
            <div class="passport-pin-dot live-pulse">📍</div>
            <div class="passport-pin-label active-label">
              <strong>${selectedCity.name}</strong>
              <small>${selectedCity.country || "Destination"}</small>
            </div>
          </div>
        `,
        iconSize: [140, 56],
        iconAnchor: [70, 24],
      });

      activeMarkerRef.current = L.marker([lat, lon], { icon: activeIcon }).addTo(map);
    } else {
      // Return gently to global world overview
      map.flyTo([22, 10], 2, {
        duration: 1.2,
      });
    }
  }, [selectedCity]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`real-atmospheric-map-container passport-world-map-wrap ${layerType === "satellite" ? "satellite-mode" : "dark-mode"}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="real-leaflet-map-canvas" />

      {/* Floating Top Controls */}
      <div className="map-floating-top-bar">
        <div className="map-city-status-pill">
          <span className="live-pulsing-dot"></span>
          <strong>Global Travel Radar</strong>
          <span className="divider">·</span>
          <span>
            {selectedCity?.name ? `${selectedCity.name}, ${selectedCity.country}` : "Select Destination"}
          </span>
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

      {/* Subtle Floating Bottom Hint */}
      {selectedCity && selectedCity.name && (
        <div className="passport-map-footer-badge">
          <span>✈️ Focusing on <strong>{selectedCity.name}</strong> ({selectedCity.country})</span>
        </div>
      )}
    </div>
  );
}
