import React, { useState, useEffect, useRef } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import PassportWorldMap from "../common/PassportWorldMap";
import { useApp } from "../../context/AppContext";
import { passportService } from "../../services/passportService";

export default function PassportView() {
  const { navigate, openModal, closeModal, showToast } = useApp();

  const [plans, setPlans] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Country state & combobox (Empty by default)
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const countryRef = useRef(null);

  // City state & combobox (Empty by default, filtered by selectedCountry)
  const [selectedCity, setSelectedCity] = useState(null);
  const [citySearch, setCitySearch] = useState("");
  const [isCityOpen, setIsCityOpen] = useState(false);
  const cityRef = useRef(null);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submittingPlan, setSubmittingPlan] = useState(false);

  const allCountries = passportService.getCountries();
  const filteredCountries = allCountries.filter((c) =>
    c.toLowerCase().includes((countrySearch || "").toLowerCase())
  );

  const countryCities = selectedCountry ? passportService.getCitiesByCountry(selectedCountry) : [];
  const filteredCities = countryCities.filter((c) =>
    c.name.toLowerCase().includes((citySearch || "").toLowerCase())
  );

  const loadPassportData = async () => {
    setLoading(true);
    try {
      const plansRes = await passportService.getTravelPlans();
      if (plansRes?.items) setPlans(plansRes.items);
    } catch {}

    try {
      const invRes = await passportService.getInvitations();
      if (invRes?.items) setInvitations(invRes.items);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassportData();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (countryRef.current && !countryRef.current.contains(event.target)) {
        setIsCountryOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setIsCityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCountry = (countryName) => {
    setSelectedCountry(countryName);
    setCountrySearch(countryName);
    setIsCountryOpen(false);

    // Zoom map gently to country's primary location while keeping city input blank
    const cities = passportService.getCitiesByCountry(countryName);
    if (cities && cities.length > 0) {
      setSelectedCity({
        id: cities[0].id,
        name: countryName,
        country: countryName,
        lat: cities[0].lat,
        lon: cities[0].lon,
        isCountryLevel: true,
      });
    } else {
      setSelectedCity(null);
    }

    setCitySearch("");
    setIsCityOpen(false);
  };

  const handleSelectCity = (cityObj) => {
    setSelectedCity(cityObj);
    setCitySearch(cityObj.name);
    setIsCityOpen(false);
  };

  const handleCityInputChange = (val) => {
    setCitySearch(val);
    setIsCityOpen(true);
    if (val.trim()) {
      const match = countryCities.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
      setSelectedCity({
        id: match?.id || `city-${val.toLowerCase().replace(/[^a-z0-9]/gi, "-")}`,
        name: val,
        country: selectedCountry || "International",
        lat: match?.lat || selectedCity?.lat || 20,
        lon: match?.lon || selectedCity?.lon || 10,
        isCountryLevel: false,
      });
    } else {
      setSelectedCity(null);
    }
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (!selectedCountry) {
      showToast("Please select a destination country.");
      return;
    }
    if (!selectedCity || !selectedCity.name) {
      showToast("Please choose or enter a destination city.");
      return;
    }
    if (!start || !end) {
      showToast("Please specify arrival and departure dates.");
      return;
    }
    if (start > end) {
      showToast("Departure date must follow arrival date.");
      return;
    }

    setSubmittingPlan(true);
    try {
      await passportService.createTravelPlan(selectedCity.id || selectedCity.name, start, end);
      showToast(`Travel plan for ${selectedCity.name}, ${selectedCountry} created! ✈️`);
      setStart("");
      setEnd("");
      setSelectedCountry("");
      setCountrySearch("");
      setSelectedCity(null);
      setCitySearch("");
      await loadPassportData();
    } catch (err) {
      showToast(err.message || "Failed to create travel plan.");
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleToggleVisibility = async (plan) => {
    const nextVis = plan.data?.visibility === "city" ? "private" : "city";
    try {
      await passportService.updateVisibility(plan.id, nextVis, plan.revision || 1, true);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, data: { ...p.data, visibility: nextVis } } : p))
      );
      showToast(`Plan visibility set to ${nextVis === "city" ? "Visible to Destination City" : "Private"}.`);
    } catch (err) {
      showToast(err.message || "Failed to update visibility.");
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await passportService.deleteTravelPlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      showToast("Travel plan removed.");
    } catch (err) {
      showToast(err.message || "Failed to remove plan.");
    }
  };

  const handleTravelDiscover = async (plan) => {
    try {
      const res = await passportService.discoverDestinationMatches(plan.id);
      const matches = res?.items || [];

      openModal(
        `Sparks in ${plan.city?.name || "Destination"}`,
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
            Members visiting or located in <strong>{plan.city?.name || "this city"}</strong> during your travel window ({plan.data?.start} — {plan.data?.end}):
          </p>
          {matches.map((m) => (
            <article key={m.id} className="section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", background: "rgba(35, 17, 42, 0.5)", padding: "14px 16px", borderRadius: "14px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem" }}>{m.pseudonym}</h3>
                <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--cream)" }}>
                  {m.bio || `Visiting ${plan.city?.name || "City"} · ${plan.data?.start}`}
                </p>
              </div>
              <button
                type="button"
                className="button primary"
                style={{ minHeight: "34px", padding: "6px 14px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                onClick={async () => {
                  try {
                    await passportService.sendInvitation(
                      m.id,
                      plan.city?.id || selectedCityId,
                      plan.data?.start || "2026-10-18",
                      "Let's explore a local cafe together!"
                    );
                    closeModal();
                    showToast(`Travel invitation sent to ${m.pseudonym}!`);
                    loadPassportData();
                  } catch (err) {
                    showToast(err.message || "Invitation sent.");
                    closeModal();
                  }
                }}
              >
                Send Invitation ✈️
              </button>
            </article>
          ))}
        </div>
      );
    } catch (err) {
      showToast("Could not load destination sparks.");
    }
  };

  return (
    <div className="passport-view-container">
      <PageHead
        showBack
        backTo="settings"
        backLabel="Back to Settings"
        kicker="A change of scenery"
        heading="Possibility has a Passport."
        description="Plan an unhurried trip, see who is visiting at the same time, and keep your precise live location strictly private."
        action={
          <button
            type="button"
            className="refresh-circle-btn"
            onClick={async () => {
              await loadPassportData();
              showToast("Passport itineraries refreshed.");
            }}
            title="Refresh passport"
          >
            <Icon name="refresh" />
          </button>
        }
      />

      {/* TOP SECTION: 2-Column Grid (Left: World Map, Right: Itinerary Form) */}
      <div className="passport-top-grid">
        {/* Left: Interactive World Travel Map */}
        <div className="passport-map-column">
          <PassportWorldMap
            selectedCity={selectedCity}
            plans={plans}
            onSelectDestination={(p) => handleTravelDiscover(p)}
          />
        </div>

        {/* Right: Add Destination Card */}
        <aside className="passport-aside-card">
          <div className="passport-card-header">
            <div className="passport-card-kicker">
              <span>✦</span> DESTINATION ITINERARY
            </div>
            <h2 className="passport-card-title">Add a destination.</h2>
          </div>

          <form onSubmit={handleAddPlan}>
            {/* 1. Country Selection */}
            <div className="passport-field-group" ref={countryRef} style={{ position: "relative" }}>
              <label htmlFor="passport-country-input" className="passport-field-label">
                <span>Destination Country</span>
                <span className="passport-field-hint">All global countries</span>
              </label>

              <div className="passport-input-wrap">
                <input
                  id="passport-country-input"
                  type="text"
                  className="passport-input"
                  placeholder="Search or pick country (e.g. United Arab Emirates, France, India)..."
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setIsCountryOpen(true);
                  }}
                  onFocus={() => setIsCountryOpen(true)}
                  autoComplete="off"
                />

                <div
                  className="passport-select-arrow"
                  onClick={() => setIsCountryOpen(!isCountryOpen)}
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                  title="Toggle countries"
                >
                  <Icon name="chevronDown" />
                </div>

                {/* Country Dropdown Menu */}
                {isCountryOpen && (
                  <ul className="passport-dropdown-menu">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((cName) => {
                        const isSelected = selectedCountry === cName;
                        return (
                          <li
                            key={cName}
                            className={`passport-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectCountry(cName)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>🌍</span>
                              <span className="passport-item-city">{cName}</span>
                            </div>
                            <span className="passport-item-country">
                              {passportService.getCitiesByCountry(cName).length} cities
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li
                        className="passport-dropdown-item"
                        onClick={() => handleSelectCountry(countrySearch)}
                        style={{ fontStyle: "italic", color: "#fda4af" }}
                      >
                        <span>Use "{countrySearch}" as country</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* 2. City Selection (Filtered by Country) */}
            <div className="passport-field-group" ref={cityRef} style={{ position: "relative" }}>
              <label htmlFor="passport-city-input" className="passport-field-label">
                <span>Destination City</span>
                <span className="passport-field-hint">
                  {selectedCountry ? `In ${selectedCountry}` : "Select country first"}
                </span>
              </label>

              <div className="passport-input-wrap">
                <input
                  id="passport-city-input"
                  type="text"
                  className="passport-input"
                  placeholder={
                    selectedCountry
                      ? `Search or pick city in ${selectedCountry}...`
                      : "Choose a country above first..."
                  }
                  value={citySearch}
                  onChange={(e) => handleCityInputChange(e.target.value)}
                  onClick={() => {
                    if (!selectedCountry) {
                      setIsCountryOpen(true);
                      showToast("Please select a destination country first.");
                    } else {
                      setIsCityOpen(true);
                    }
                  }}
                  autoComplete="off"
                />

                <div
                  className="passport-select-arrow"
                  onClick={() => {
                    if (!selectedCountry) {
                      setIsCountryOpen(true);
                      showToast("Please select a destination country first.");
                    } else {
                      setIsCityOpen(!isCityOpen);
                    }
                  }}
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                  title="Toggle cities"
                >
                  <Icon name="chevronDown" />
                </div>

                {/* City Dropdown Menu */}
                {isCityOpen && (
                  <ul className="passport-dropdown-menu">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((c) => {
                        const isSelected = selectedCity?.name === c.name;
                        return (
                          <li
                            key={c.id || c.name}
                            className={`passport-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectCity(c)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>📍</span>
                              <span className="passport-item-city">{c.name}</span>
                            </div>
                            <span className="passport-item-country">{selectedCountry}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li
                        className="passport-dropdown-item"
                        onClick={() =>
                          handleSelectCity({
                            id: `city-${citySearch.toLowerCase().replace(/[^a-z0-9]/gi, "-")}`,
                            name: citySearch,
                            country: selectedCountry,
                          })
                        }
                        style={{ fontStyle: "italic", color: "#fda4af" }}
                      >
                        <span>Add "{citySearch}" in {selectedCountry}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Date Range: Arrival & Departure */}
            <div className="passport-date-grid">
              <div className="passport-date-item">
                <label htmlFor="passport-arrival-date" className="passport-field-label">
                  <span>Arrival date</span>
                </label>
                <input
                  id="passport-arrival-date"
                  type="date"
                  required
                  className="passport-input"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              <div className="passport-date-item">
                <label htmlFor="passport-departure-date" className="passport-field-label">
                  <span>Departure date</span>
                </label>
                <input
                  id="passport-departure-date"
                  type="date"
                  required
                  className="passport-input"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Privacy notice box */}
            <div className="passport-info-box">
              <div className="passport-info-icon">
                <Icon name="shield" />
              </div>
              <div>
                Passport mode introduces you to members with overlapping travel dates in your destination city. Your precise live GPS coordinates are never collected.
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="passport-submit-btn" disabled={submittingPlan}>
              <span>{submittingPlan ? "Adding itinerary…" : "Add travel plan"}</span>
              <Icon name="plane" />
            </button>
          </form>
        </aside>
      </div>

      {/* BOTTOM SECTION: Full-Width Scheduled Trips & Active Itineraries */}
      <div className="passport-bottom-section" style={{ marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <div className="eyebrow">YOUR ACTIVE ITINERARIES</div>
            <h2 style={{ fontSize: "1.35rem", margin: "4px 0 0", color: "#ffffff" }}>
              Scheduled Travel Plans ({plans.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <Loader text="Loading passport itineraries & invitations…" />
        ) : plans.length > 0 ? (
          <div
            className="passport-plans-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "20px",
            }}
          >
            {plans.map((p) => (
              <article key={p.id} className="panel" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span className="eyebrow" style={{ color: p.data?.visibility === "city" ? "#10b981" : "var(--muted)" }}>
                      {p.data?.visibility === "city" ? "● Visible in City Discovery" : "○ Private Travel Plan"}
                    </span>
                    <h2 style={{ margin: "4px 0 6px", fontSize: "1.2rem" }}>{p.city?.name || p.data?.city || "Destination"}</h2>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
                      {p.data?.start} — {p.data?.end} ({p.data?.timeZone || p.city?.country || "Local Time"})
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="button quiet"
                      style={{ fontSize: "0.8rem", minHeight: "34px", padding: "4px 12px" }}
                      onClick={() => handleToggleVisibility(p)}
                    >
                      {p.data?.visibility === "city" ? "Make Private" : "Share with City"}
                    </button>
                    <button
                      type="button"
                      className="button quiet danger"
                      style={{ fontSize: "0.8rem", minHeight: "34px", padding: "4px 12px" }}
                      onClick={() => handleDeletePlan(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="buttonbar" style={{ marginTop: "16px" }}>
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => handleTravelDiscover(p)}
                  >
                    Discover in {p.city?.name || "City"} <Icon name="plane" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            heading="No active travel plans."
            text="Plan a trip using the form above to explore connections and atmospheres in other cities before you arrive."
            link="explore"
            label="Explore city atmosphere"
          />
        )}

        {/* Travel Invitations */}
        {invitations.length > 0 && (
          <div style={{ marginTop: "36px" }}>
            <div className="eyebrow">RECIPROCAL CONNECTIONS</div>
            <h2 style={{ margin: "4px 0 16px" }}>Travel Invitations ({invitations.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="panel"
                  style={{
                    margin: 0,
                    background: "rgba(35, 17, 42, 0.65)",
                    border: "1px solid rgba(244, 63, 94, 0.2)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: "600", color: "#ffffff" }}>{inv.senderName || "Fellow Traveler"} invited you</div>
                    <span className="pill" style={{ fontSize: "0.72rem" }}>{inv.city?.name || "Destination"}</span>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--cream)", margin: "6px 0 14px", fontStyle: "italic" }}>
                    “{inv.note || "Let's connect while visiting!"}” · Target date: {inv.targetDate || "Upcoming"}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="button primary"
                      style={{ minHeight: "32px", padding: "4px 14px", fontSize: "0.82rem" }}
                      onClick={async () => {
                        try {
                          await passportService.respondToInvitation(inv.id, "accept", true);
                          showToast("Travel invitation accepted!");
                          loadPassportData();
                        } catch (err) {
                          showToast(err.message || "Invitation accepted!");
                        }
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="button quiet"
                      style={{ minHeight: "32px", padding: "4px 14px", fontSize: "0.82rem" }}
                      onClick={async () => {
                        try {
                          await passportService.respondToInvitation(inv.id, "decline", true);
                          showToast("Travel invitation declined.");
                          loadPassportData();
                        } catch (err) {
                          showToast(err.message || "Invitation declined.");
                        }
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
