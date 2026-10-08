import React from "react";
import Loader from "../../common/Loader";
import AtmosphericMap from "../../common/AtmosphericMap";

export default function ExploreAreas({ loadingMap, mapData, liveSparks, zones, cityLabel, setFocusedZone }) {
  return (
    <section className="animate-[fadeIn_0.3s_ease-out]">
      <div className="w-full mb-0">
        {loadingMap ? (
          <div className="bg-surface h-[600px] flex items-center justify-center rounded-[20px] shadow-lg border border-white/5">
            <Loader text="Loading city map…" />
          </div>
        ) : (
          <div className="h-[600px] w-full rounded-[20px] overflow-hidden border border-pink/25 shadow-lg relative">
            <AtmosphericMap
              members={liveSparks}
              zones={zones}
              city={cityLabel}
              onSelectMember={(m) => setFocusedZone(m)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
