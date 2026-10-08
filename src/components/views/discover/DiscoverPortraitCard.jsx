import React from "react";
import Icon from "../../common/Icon";
import { title, portraitClass } from "../../../utils/formatters";

export default function DiscoverPortraitCard({
  currentProfile,
  profilePhotos,
  activePhotoIdx,
  setActivePhotoIdx,
  currentPhoto,
  handleSwipe,
  lastPassedId,
  handleUndo,
}) {
  return (
    <section className="flex flex-col w-full">
      <div className={`relative w-full aspect-[3/4] md:aspect-[4/5] max-h-[75vh] bg-surface rounded-[28px] overflow-hidden shadow-2xl flex flex-col justify-end p-5 sm:p-6 mb-6 ${portraitClass(currentProfile.portrait)}`}>
        {profilePhotos.length > 1 && (
          <div className="absolute top-4 inset-x-0 flex justify-center gap-1.5 z-20 px-6">
            {profilePhotos.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 rounded-full flex-1 transition-all duration-300 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${idx === activePhotoIdx ? "bg-white" : "bg-white/40"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(idx);
                }}
              />
            ))}
          </div>
        )}

        {currentPhoto && (
          <img
            src={currentPhoto}
            alt={currentProfile.pseudonym}
            className="absolute inset-0 w-full h-full object-cover z-0"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10 pointer-events-none" />

        {profilePhotos.length > 1 && (
          <>
            <div
              role="button"
              tabIndex={-1}
              className="absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-pointer"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : profilePhotos.length - 1));
              }}
            />
            <div
              role="button"
              tabIndex={-1}
              className="absolute top-0 bottom-0 right-0 w-1/3 z-20 cursor-pointer"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx((prev) => (prev < profilePhotos.length - 1 ? prev + 1 : 0));
              }}
            />
          </>
        )}

        <div className="relative z-20 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-white text-[0.74rem] border border-white/10">
              {title(currentProfile.band || "A possible spark")}
            </span>
            {(currentProfile.matchPercentage || currentProfile.chemistry?.lower) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink/30 backdrop-blur-md border border-pink/40 text-[#ffb8d1] font-semibold rounded-full text-[0.74rem]">
                ⚡ {currentProfile.matchPercentage || currentProfile.chemistry?.lower}% Match
              </span>
            )}
            {currentProfile.isBot && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-[0.74rem]">
                Automated demo
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white m-0 leading-tight flex items-end gap-2">
              {currentProfile.pseudonym}, <span className="text-2xl sm:text-3xl font-medium">{currentProfile.age}</span>
            </h2>
            <p className="flex items-center gap-1.5 text-white/90 text-sm m-0">
              <Icon name="pin" className="w-[18px] h-[18px]" /> {title(currentProfile.zone)}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {(currentProfile.interests || []).slice(0, 4).map((interest) => (
              <span key={interest} className="inline-flex items-center px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-lg text-white text-xs border border-white/10">
                {title(interest)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 sm:gap-6 mt-4">
        <button
          type="button"
          className="flex justify-center items-center w-[60px] h-[60px] rounded-full border border-white/10 bg-surface hover:bg-white/5 hover:-translate-y-1 transition-all duration-200 text-muted shadow-lg"
          onClick={() => handleSwipe(currentProfile.id, "pass")}
          aria-label={`Pass on ${currentProfile.pseudonym}`}
        >
          <Icon name="close" className="w-[24px] h-[24px]" />
        </button>
        <button
          type="button"
          className="flex justify-center items-center w-[76px] h-[76px] rounded-full bg-pink border-none text-white hover:bg-[#ff2a85] hover:-translate-y-1 transition-all duration-200 shadow-[0_8px_35px_rgba(233,22,113,0.4)]"
          onClick={() => handleSwipe(currentProfile.id, "like")}
          aria-label={`Like ${currentProfile.pseudonym}`}
        >
          <Icon name="heart" className="w-[30px] h-[30px]" />
        </button>
        <button
          type="button"
          className="flex justify-center items-center w-[60px] h-[60px] rounded-full border border-white/10 bg-surface hover:bg-white/5 hover:-translate-y-1 transition-all duration-200 text-muted shadow-lg"
          onClick={() => handleSwipe(currentProfile.id, "save")}
          aria-label={`Save ${currentProfile.pseudonym}`}
        >
          <Icon name="save" className="w-[24px] h-[24px]" />
        </button>
      </div>

      <div className="flex justify-center items-center gap-3 mt-6 text-muted">
        <p className="text-xs sm:text-sm m-0">Pass · Let them know · Save for later</p>
        {lastPassedId && (
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 bg-transparent hover:bg-white/5 text-muted hover:text-white rounded-full text-xs transition-colors"
          >
            <Icon name="refresh" className="w-3.5 h-3.5" /> Undo pass
          </button>
        )}
      </div>
    </section>
  );
}
