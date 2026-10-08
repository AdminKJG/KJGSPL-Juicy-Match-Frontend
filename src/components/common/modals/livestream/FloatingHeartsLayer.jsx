import React, { memo } from "react";

/**
 * FloatingHeartsLayer
 * Renders floating heart & reaction emoji particles drifting upwards with random paths and scaling.
 */
function FloatingHeartsLayer({ hearts = [] }) {
  if (!hearts || hearts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute bottom-16 animate-float-drift select-none"
          style={{
            left: `${h.left}%`,
            fontSize: `${h.size || 28}px`,
            opacity: h.opacity ?? 1,
            animationDuration: `${h.duration || 2.6}s`,
            filter: "drop-shadow(0 4px 12px rgba(233,22,113,0.45))",
            transform: `rotate(${h.rotate || 0}deg)`,
          }}
        >
          {h.emoji || "❤️"}
        </div>
      ))}
    </div>
  );
}

export default memo(FloatingHeartsLayer);
