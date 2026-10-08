import React from "react";

export default function EmojiShower({ floatingParticles = [] }) {
  if (!floatingParticles || floatingParticles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {floatingParticles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 text-3xl animate-float-up opacity-0"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--sway-x": `${p.sway}px`,
            "--start-scale": p.scale,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
