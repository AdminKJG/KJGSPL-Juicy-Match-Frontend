import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { exploreService } from "../../services/exploreService";
import { formatDate, money, title } from "../../utils/formatters";

export default function EventsView() {
  const { state, showToast } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await exploreService.getEvents();
      if (res?.items) {
        setEvents(res.items);
      }
    } catch (err) {
      console.warn("Events load error:", err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRsvp = async (eventId, currentState) => {
    const nextState = currentState === "confirmed" ? "cancelled" : "confirmed";
    setRsvpLoadingId(eventId);
    try {
      const res = await exploreService.rsvpEvent(eventId, nextState);
      const resultingState = res?.state || (nextState === "confirmed" ? "confirmed" : null);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, rsvp: resultingState } : e))
      );
      showToast(
        resultingState === "confirmed"
          ? "RSVP confirmed! We've saved your spot."
          : resultingState === "waitlisted"
          ? "Event is at capacity. You are placed on the priority waitlist."
          : "RSVP cancelled."
      );
    } catch (err) {
      showToast(err.message || "Failed to update RSVP.");
    } finally {
      setRsvpLoadingId(null);
    }
  };

  return (
    <>
      <PageHead
        showBack
        backTo="explore"
        backLabel="Back to Explore"
        kicker="A shared moment"
        heading="Make room for a good evening."
        description="Hosted intimate gatherings, dinner discussions, and cultural experiences, at a pace that feels comfortable."
        action={
          <button
            type="button"
            className="refresh-circle-btn"
            onClick={async () => {
              await loadEvents();
              showToast("Events refreshed.");
            }}
            title="Refresh events"
          >
            <Icon name="refresh" />
          </button>
        }
      />

      {loading ? (
        <Loader text="Loading published events…" />
      ) : events.length > 0 ? (
        events.map((v) => {
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
                <div className="row" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                  <span className="eyebrow">{title(v.data?.category || "Social")}</span>
                  {v.data?.zone && <span className="pill">{title(v.data.zone)}</span>}
                  {v.data?.demo && <span className="pill demo">Hosted demo</span>}
                  {v.data?.capacity && (
                    <span className="pill" style={{ fontSize: "0.72rem" }}>
                      {v.data?.confirmedCount || 0} / {v.data.capacity} spots filled
                    </span>
                  )}
                </div>
                <h2>{v.data?.title || "Hosted Evening"}</h2>
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
                    ✓ RSVP: Confirmed Guest ({v.data?.organizer || "Juicy Match Host"})
                  </p>
                )}
                {isWaitlisted && (
                  <p style={{ marginTop: "8px", fontWeight: "600", fontSize: "0.86rem", color: "var(--sand)" }}>
                    ⏳ Priority Waitlist (Spot pending availability)
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
                    : "Reserve Spot (RSVP)"}
                </button>
              </div>
            </article>
          );
        })
      ) : (
        <EmptyState
          heading="No published events right now."
          text="Curated intimate experiences in your city will appear here."
          link="explore"
          label="Explore city atmosphere"
        />
      )}
    </>
  );
}
