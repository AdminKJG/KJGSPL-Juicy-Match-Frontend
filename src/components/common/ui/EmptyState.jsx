import React from "react";
import Icon from "./Icon";
import { useApp } from "../../../context/AppContext";

export default function EmptyState({
  heading,
  text,
  link = "discover",
  label = "Back to discovery",
}) {
  const { navigate } = useApp();
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface/50 rounded-3xl border border-white/5 max-w-md mx-auto">
      <div className="text-muted opacity-50 mb-6">
        <Icon name="discover" className="w-20 h-20" />
      </div>
      <h2 className="text-2xl font-serif text-white mb-3">{heading}</h2>
      <p className="text-cream/70 mb-8">{text}</p>
      {link && (
        <button
          type="button"
          className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors"
          onClick={() => navigate(link.replace(/^#\//, ""))}
        >
          {label} <Icon name="arrow" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
