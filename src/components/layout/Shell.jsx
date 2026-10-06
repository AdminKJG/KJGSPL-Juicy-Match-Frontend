import React from "react";
import Rail from "./Rail";
import MobileNav from "./MobileNav";
import { useApp } from "../../context/AppContext";

export default function Shell({ children }) {
  const { state } = useApp();

  return (
    <div className="shell">
      <Rail />
      <div className="workspace">
        <main id="main" className="page">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
