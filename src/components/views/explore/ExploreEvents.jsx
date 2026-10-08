import React from "react";
import Loader from "../../common/Loader";
import EmptyState from "../../common/EmptyState";
import { formatDate, money, title } from "../../../utils/formatters";

export default function ExploreEvents({
  eventFilter,
  setEventFilter,
  loadingEvents,
  filteredEvents,
  rsvpLoadingId,
  handleRsvp
}) {
  return (
    <section className="animate-[fadeIn_0.3s_ease-out]">
      {/* Event Filter Pills */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-surface p-5 rounded-2xl border border-white/5 shadow-lg">
        <div>
          <div className="text-[0.75rem] font-bold tracking-widest uppercase text-pink mb-1">
            Curated Gatherings
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-white m-0">
            Featured Events
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "social", "cultural", "exploration"].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                eventFilter === cat
                  ? "bg-pink/15 border-pink text-pink shadow-[0_2px_8px_rgba(225,29,72,0.2)]"
                  : "bg-transparent border-white/10 text-muted hover:bg-white/5 hover:text-white"
              }`}
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
        <div className="flex flex-col gap-5">
          {filteredEvents.map((v) => {
            const starts = new Date(v.data?.startsAt || Date.now());
            const monthStr = starts.toLocaleDateString("en", { month: "short" });
            const dayStr = starts.getDate();
            const isConfirmed = v.rsvp === "confirmed";
            const isWaitlisted = v.rsvp === "waitlisted";
            const isProcessing = rsvpLoadingId === v.id;

            return (
              <article key={v.id} className="relative bg-surface rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 border border-white/5 shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl group">
                <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl w-20 h-20 md:w-24 md:h-24 shrink-0 shadow-inner">
                  <small className="text-pink text-xs md:text-sm font-bold uppercase tracking-widest">{monthStr}</small>
                  <strong className="text-white text-3xl md:text-4xl font-serif">{dayStr}</strong>
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[0.7rem] font-bold tracking-widest uppercase text-lilac bg-lilac/10 px-2.5 py-1 rounded-md">
                      {title(v.data?.category || "Social")}
                    </span>
                    {v.data?.zone && (
                      <span className="text-[0.75rem] font-medium text-white bg-white/10 px-3 py-1 rounded-full">
                        {title(v.data.zone)}
                      </span>
                    )}
                    {v.data?.capacity && (
                      <span className="text-[0.7rem] font-medium text-muted bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                        {v.data?.confirmedCount || 0} / {v.data.capacity} spots filled
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
                    {v.data?.title || "Hosted Gathering"}
                  </h2>
                  <p className="text-cream text-[0.95rem] leading-relaxed mb-4 max-w-3xl">
                    {v.data?.description}
                  </p>
                  
                  <div className="flex flex-col gap-1 mb-2 text-[0.88rem] text-muted">
                    <p className="m-0 flex items-center gap-1.5">
                      <span className="text-pink">📍</span> {v.data?.venue} · {formatDate(v.data?.startsAt, v.data?.timeZone)} ({v.data?.timeZone || "Local"})
                    </p>
                    <small className="text-muted/80">
                      {v.data?.cancellation || "Free cancellation"} · {money(v.data?.priceCents || 0, v.data?.currency || "USD")}
                    </small>
                  </div>

                  {isConfirmed && (
                    <p className="mt-2 font-semibold text-[0.86rem] text-green flex items-center gap-1">
                      <span className="text-lg">✓</span> Confirmed Guest ({v.data?.organizer || "Juicy Match Host"})
                    </p>
                  )}
                  {isWaitlisted && (
                    <p className="mt-2 font-semibold text-[0.86rem] text-yellow-500 flex items-center gap-1">
                      <span className="text-lg">⏳</span> Priority Waitlist
                    </p>
                  )}
                </div>

                <div className="mt-4 md:mt-0 flex flex-col justify-end shrink-0">
                  <button
                    type="button"
                    className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-[0.9rem] transition-all duration-200 shadow-lg ${
                      isConfirmed
                        ? "bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                        : "bg-pink text-white hover:bg-[#ff2a85] hover:-translate-y-0.5 hover:shadow-pink/30"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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
  );
}
