import React from "react";
import { portraitClass } from "../../../utils/formatters";

export default function Avatar({ profile, className = "" }) {
  const photo = profile?.photo || profile?.avatar || profile?.avatarUrl || profile?.imageUrl;
  const hasPortrait = Number.isInteger(profile?.portrait) && profile.portrait >= 0;

  if (photo) {
    return (
      <span className={`avatar ${className}`} aria-hidden="true">
        <img
          src={photo}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
        />
      </span>
    );
  }

  return (
    <span
      className={`avatar portrait ${portraitClass(profile)} ${className}`}
      aria-hidden="true"
    />
  );
}
