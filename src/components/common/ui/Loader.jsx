import React from "react";

export default function Loader({ text = "Loading…", size = "medium", fullScreen = false }) {
  const sizeClasses = {
    small: "w-6 h-6 border-2",
    medium: "w-10 h-10 border-4",
    large: "w-16 h-16 border-4",
  };
  
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? "fixed inset-0 bg-night/80 backdrop-blur-sm z-50" : "p-4"}`}>
      <div className={`relative ${sizeClasses[size].split(" ")[0]} ${sizeClasses[size].split(" ")[1]}`}>
        <div className={`absolute inset-0 ${sizeClasses[size].split(" ")[2]} border-white/10 rounded-full`}></div>
        <div className={`absolute inset-0 ${sizeClasses[size].split(" ")[2]} border-pink border-t-transparent rounded-full animate-spin`}></div>
      </div>
      {text && <p className="text-muted text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );
}
