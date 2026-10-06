import React from "react";
import Icon from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { title } from "../../utils/formatters";

export default function Topbar() {
  const { state, navigate, logout } = useApp();

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow brand-name">MAKE ROOM FOR A LITTLE CHEMISTRY</span>
        <span className="mobile-name">
          <a
            className="brand"
            href="/discover"
            onClick={(e) => {
              e.preventDefault();
              navigate("discover");
            }}
          >
            <img src="/assets/logo.jpg" alt="" />
            <span>Juicy Match</span>
          </a>
        </span>
        <p>A connection begins with curiosity.</p>
      </div>

      <div className="top-actions">
        <button
          type="button"
          className="pill plan-label"
          style={{ background: "#3b2b41", border: "none", cursor: "pointer" }}
          onClick={() => navigate("membership")}
        >
          {title(state.entitlement?.plan || "free")} member
        </button>

        <button
          type="button"
          className="round button quiet"
          onClick={() => navigate("assist")}
          aria-label="AI Coach & Guidance"
          title="AI Coach & Guidance"
        >
          <Icon name="sparkle" />
        </button>

        <button
          type="button"
          className="round button quiet"
          onClick={() => navigate("notifications")}
          aria-label="Notifications"
        >
          <Icon name="bell" />
        </button>

        <button
          type="button"
          className="round button quiet"
          onClick={() => navigate("settings")}
          aria-label="Settings and preferences"
        >
          <Icon name="settings" />
        </button>

        <button
          type="button"
          className="round button quiet"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
        >
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}
