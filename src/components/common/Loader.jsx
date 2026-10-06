import React from "react";

export default function Loader({ text = "Loading…", size = "medium", fullScreen = false }) {
  return (
    <div className={`app-loader-container ${fullScreen ? "full-screen" : ""} size-${size}`}>
      <div className="app-loader-spinner-wrap">
        <div className="app-loader-glow"></div>
        <div className="app-loader-ring"></div>
        <div className="app-loader-inner-dot"></div>
      </div>
      {text && <p className="app-loader-text">{text}</p>}
    </div>
  );
}
