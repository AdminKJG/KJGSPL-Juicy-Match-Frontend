import React from "react";
import Rail from "./Rail";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";
import { useApp } from "../../context/AppContext";

export default function Shell({ children }) {
  const { activeRoute } = useApp();
  const [page] = (activeRoute || "").split("/");
  const isChatView = page === "messages" || page === "chat";

  return (
    <div className="shell">
      <Rail />
      <div className="workspace">
        {!isChatView && <Topbar />}
        <main id="main" className="page">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
