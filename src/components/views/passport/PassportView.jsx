import React, { useState, useEffect, useRef } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import EmptyState from "../../common/EmptyState";
import Loader from "../../common/Loader";
import PassportWorldMap from "../../common/PassportWorldMap";
import { useApp } from "../../../context/AppContext";
import { passportService } from "../../../services/passportService";

export default function PassportView() {
  const { navigate, openModal, closeModal, showToast } = useApp();

  const [plans, setPlans] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Country state & combobox
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const countryRef = useRef(null);

  // City state & combobox
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
        <div className="flex flex-col gap-4 max-w-lg">
          <p className="m-0 text-muted text-sm leading-relaxed">
            Members visiting or located in <strong className="text-white">{plan.city?.name || "this city"}</strong> during your travel window ({plan.data?.start} — {plan.data?.end}):
          </p>
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
            {matches.map((m) => (
              <article key={m.id} className="flex items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <h3 className="m-0 text-base font-bold text-white">{m.pseudonym}</h3>
                  <p className="m-0 text-xs text-cream/80 mt-1">
                    {m.bio || `Visiting ${plan.city?.name || "City"} · ${plan.data?.start}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-pink hover:bg-[#ff2a85] text-white font-semibold text-xs rounded-xl shadow-lg transition-all shrink-0 cursor-pointer"
                  onClick={async () => {
                    try {
                      await passportService.sendInvitation(
                        m.id,
                        plan.city?.id || plan.id,
                        plan.data?.start || "2026-10-18",
                        "Let's explore a local spot together!"
                      );
                      closeModal();
                      showToast(`Travel invitation sent to ${m.pseudonym}! ✈️`);
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
        </div>
      );
    } catch (err) {
      showToast("Could not load destination sparks.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen flex flex-col gap-8">
      {/* ── STANDALONE HEADER ── */}
      <PageHead
        kicker="Global Travel & Match Radar"
        heading="Possibility has a Passport."
        description="Plan your destination trips, discover who is visiting at the same time, and connect globally while keeping your real-time live location strictly private."
        action={
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink/10 border border-pink/25 text-pink text-xs font-semibold">
              <span>✈️</span>
              <span>{plans.length} Active {plans.length === 1 ? "Trip" : "Trips"}</span>
            </span>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-[0.84rem] font-semibold transition-all cursor-pointer"
              onClick={async () => {
                await loadPassportData();
                showToast("Passport itineraries refreshed! ✈️");
              }}
              title="Refresh passport itineraries"
            >
              <Icon name="refresh" className="w-4 h-4 text-pink" />
              <span>Refresh Radar</span>
            </button>
          </div>
        }
      />

      {/* ── TOP SECTION: 2-COLUMN GRID (LEFT: MAP, RIGHT: ITINERARY PLANNER) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive World Travel Map */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[#1a0d20] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col min-h-[520px]">
          <PassportWorldMap
            selectedCity={selectedCity}
            plans={plans}
            onSelectDestination={(p) => handleTravelDiscover(p)}
          />
        </div>

        {/* Right: Add Destination Card */}
        <aside className="lg:col-span-5 xl:col-span-4 bg-[#1a0d20] rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl flex flex-col gap-5">
          <div className="border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2 text-[0.72rem] font-bold text-pink uppercase tracking-widest mb-1">
              <span>✦</span> DESTINATION ITINERARY
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white m-0">Add a destination.</h2>
            <p className="text-muted text-xs m-0 mt-1">Schedule your travel window to discover overlapping visitors.</p>
          </div>

          <form onSubmit={handleAddPlan} className="flex flex-col gap-4">
            {/* 1. Country Selection */}
            <div className="flex flex-col gap-1.5 relative" ref={countryRef}>
              <div className="flex items-baseline justify-between text-xs">
                <label htmlFor="passport-country-input" className="font-semibold text-white/90">Destination Country</label>
                <span className="text-muted text-[0.7rem]">All global countries</span>
              </div>

              <div className="relative">
                <input
                  id="passport-country-input"
                  type="text"
                  className="w-full px-4 py-3 pl-10 pr-10 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-pink/60 transition-all"
                  placeholder="Search country (e.g. France, UAE, Japan)…"
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setIsCountryOpen(true);
                  }}
                  onFocus={() => setIsCountryOpen(true)}
                  autoComplete="off"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">🌍</span>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors cursor-pointer"
                  onClick={() => setIsCountryOpen(!isCountryOpen)}
                  title="Toggle countries list"
                >
                  <Icon name="chevronDown" className="w-4 h-4" />
                </button>

                {/* Country Dropdown Menu */}
                {isCountryOpen && (
                  <ul className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#180b1e] border border-white/15 rounded-2xl shadow-2xl p-1.5 m-0 list-none no-scrollbar">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((cName) => {
                        const isSelected = selectedCountry === cName;
                        return (
                          <li
                            key={cName}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-pink/20 text-pink font-semibold"
                                : "text-white/80 hover:bg-white/5 hover:text-white"
                            }`}
                            onClick={() => handleSelectCountry(cName)}
                          >
                            <div className="flex items-center gap-2">
                              <span>🌍</span>
                              <span>{cName}</span>
                            </div>
                            <span className="text-[0.7rem] text-muted">
                              {passportService.getCitiesByCountry(cName).length} cities
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li
                        className="px-3 py-2 text-xs italic text-pink cursor-pointer"
                        onClick={() => handleSelectCountry(countrySearch)}
                      >
                        Use "{countrySearch}" as country
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* 2. City Selection */}
            <div className="flex flex-col gap-1.5 relative" ref={cityRef}>
              <div className="flex items-baseline justify-between text-xs">
                <label htmlFor="passport-city-input" className="font-semibold text-white/90">Destination City</label>
                <span className="text-muted text-[0.7rem]">
                  {selectedCountry ? `In ${selectedCountry}` : "Select country first"}
                </span>
              </div>

              <div className="relative">
                <input
                  id="passport-city-input"
                  type="text"
                  className="w-full px-4 py-3 pl-10 pr-10 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-pink/60 transition-all"
                  placeholder={
                    selectedCountry
                      ? `Search or pick city in ${selectedCountry}…`
                      : "Choose a country above first…"
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">📍</span>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors cursor-pointer"
                  onClick={() => {
                    if (!selectedCountry) {
                      setIsCountryOpen(true);
                      showToast("Please select a destination country first.");
                    } else {
                      setIsCityOpen(!isCityOpen);
                    }
                  }}
                  title="Toggle cities list"
                >
                  <Icon name="chevronDown" className="w-4 h-4" />
                </button>

                {/* City Dropdown Menu */}
                {isCityOpen && (
                  <ul className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#180b1e] border border-white/15 rounded-2xl shadow-2xl p-1.5 m-0 list-none no-scrollbar">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((c) => {
                        const isSelected = selectedCity?.name === c.name;
                        return (
                          <li
                            key={c.id || c.name}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-pink/20 text-pink font-semibold"
                                : "text-white/80 hover:bg-white/5 hover:text-white"
                            }`}
                            onClick={() => handleSelectCity(c)}
                          >
                            <div className="flex items-center gap-2">
                              <span>📍</span>
                              <span>{c.name}</span>
                            </div>
                            <span className="text-[0.7rem] text-muted">{selectedCountry}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li
                        className="px-3 py-2 text-xs italic text-pink cursor-pointer"
                        onClick={() =>
                          handleSelectCity({
                            id: `city-${citySearch.toLowerCase().replace(/[^a-z0-9]/gi, "-")}`,
                            name: citySearch,
                            country: selectedCountry,
                          })
                        }
                      >
                        Add "{citySearch}" in {selectedCountry}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* 3. Travel Dates: Arrival & Departure */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="passport-arrival-date" className="text-xs font-semibold text-white/90">Arrival Date</label>
                <input
                  id="passport-arrival-date"
                  type="date"
                  required
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-pink/60 transition-all cursor-pointer"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="passport-departure-date" className="text-xs font-semibold text-white/90">Departure Date</label>
                <input
                  id="passport-departure-date"
                  type="date"
                  required
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-pink/60 transition-all cursor-pointer"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Privacy notice box */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs leading-relaxed">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="shield" className="w-3.5 h-3.5" />
              </div>
              <p className="m-0 text-[0.78rem] text-emerald-200/90">
                Passport introduces you to members with overlapping travel dates. Your precise live GPS coordinates are never collected.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingPlan}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink to-[#ff2a85] text-white font-bold text-sm shadow-[0_4px_16px_rgba(233,22,113,0.35)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              <span>{submittingPlan ? "Scheduling Itinerary…" : "Add Travel Plan"}</span>
              <Icon name="plane" className="w-4 h-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* ── BOTTOM SECTION: SCHEDULED TRIPS & INVITATIONS ── */}
      <div className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-[0.7rem] font-bold text-pink uppercase tracking-widest">YOUR ACTIVE ITINERARIES</div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white m-0 mt-0.5">
              Scheduled Travel Plans ({plans.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <Loader text="Loading passport itineraries & destination sparks…" />
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => (
              <article
                key={p.id}
                className="bg-[#1a0d20] rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden group hover:border-pink/30 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[0.68rem] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        p.data?.visibility === "city"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-white/5 border-white/10 text-muted"
                      }`}
                    >
                      {p.data?.visibility === "city" ? "● Visible to City" : "○ Private Plan"}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-red-400 transition-colors p-1 cursor-pointer"
                      onClick={() => handleDeletePlan(p.id)}
                      title="Remove trip"
                    >
                      Remove
                    </button>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-white m-0">
                    {p.city?.name || p.data?.city || "Destination"}
                  </h3>
                  <p className="text-muted text-xs m-0 mt-1">
                    {p.data?.start} — {p.data?.end}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      className="text-xs font-semibold text-muted hover:text-white transition-colors cursor-pointer"
                      onClick={() => handleToggleVisibility(p)}
                    >
                      {p.data?.visibility === "city" ? "Switch to Private" : "Share with City Sparks"}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 px-4 bg-pink hover:bg-[#ff2a85] text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => handleTravelDiscover(p)}
                  >
                    <span>Discover Sparks in {p.city?.name || "City"}</span>
                    <Icon name="plane" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            heading="No scheduled travel plans."
            text="Add a destination above to see members visiting at the same time and spark global connections."
            link="explore"
            label="Explore City Atmosphere"
          />
        )}

        {/* Travel Invitations */}
        {invitations.length > 0 && (
          <div className="flex flex-col gap-4 mt-8">
            <div className="border-b border-white/[0.08] pb-3">
              <div className="text-[0.7rem] font-bold text-pink uppercase tracking-widest">RECIPROCAL CONNECTIONS</div>
              <h2 className="text-xl font-serif font-bold text-white m-0 mt-0.5">
                Travel Invitations ({invitations.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-[#1a0d20] rounded-3xl p-6 border border-pink/25 shadow-xl flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{inv.senderName || "Fellow Traveler"}</span>
                      <span className="text-[0.7rem] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white font-medium">
                        {inv.city?.name || "Destination"}
                      </span>
                    </div>
                    <p className="text-xs text-cream/90 italic m-0 mt-2 leading-relaxed">
                      “{inv.note || "Let's connect while visiting!"}”
                    </p>
                    <span className="text-[0.68rem] text-muted block mt-1">Target date: {inv.targetDate || "Upcoming"}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <button
                      type="button"
                      className="flex-1 py-2 px-3 bg-pink hover:bg-[#ff2a85] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
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
                      className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
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
