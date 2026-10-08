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
    <div className="grid grid-cols-[auto_1fr] min-h-screen transition-all duration-300">
      <Rail />
      <div className={`flex flex-col min-w-0 ${isChatView ? 'h-screen p-0' : 'pb-[50px]'}`}>
        {!isChatView && <Topbar />}
        <main id="main" className={`flex-1 flex flex-col ${isChatView ? 'max-w-full h-full p-0 m-0' : ''}`}>
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
