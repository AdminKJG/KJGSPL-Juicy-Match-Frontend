import React from "react";
import Icon from "./Icon";
import { useApp } from "../../context/AppContext";

export default function EmptyState({
  heading,
  text,
  link = "discover",
  label = "Back to discovery",
}) {
  const { navigate } = useApp();
  return (
    <div className="empty">
      <Icon name="discover" />
      <h2>{heading}</h2>
      <p>{text}</p>
      {link && (
        <button
          type="button"
          className="button"
          onClick={() => navigate(link.replace(/^#\//, ""))}
        >
          {label} <Icon name="arrow" />
        </button>
      )}
    </div>
  );
}
