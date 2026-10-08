import React, { useRef, useEffect } from "react";

/**
 * LiveChatOverlay
 * Semi-transparent, auto-scrolling live chat stream rendered over the bottom of the video canvas.
 */
export default function LiveChatOverlay({
  messages = [],
  isHost = false,
  onModerateUser,
}) {
  const scrollContainerRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <div className="absolute inset-x-0 bottom-24 max-h-[46%] px-4 z-20 flex flex-col justify-end pointer-events-none">
      {/* Scrollable chat messages container */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto no-scrollbar max-h-full space-y-2 pointer-events-auto pr-2 pb-1"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 22%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%)",
        }}
      >
        {/* Welcome message */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md text-[11px] text-pink font-medium shadow-sm">
          <span>✨</span>
          <span>Welcome to the live room! Chat kindly and share the vibes.</span>
        </div>

        {/* Dynamic chat message stream */}
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <div key={m.id || `sys-${Math.random()}`} className="flex items-start animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink/20 to-purple-600/20 border border-pink/30 backdrop-blur-md text-[11px] text-pink font-semibold shadow-sm">
                  <span>{m.body || m.text}</span>
                </div>
              </div>
            );
          }

          const isMe = m.sender === "me" || m.isMe;
          const senderName = m.pseudonym || (isMe ? "You" : "Viewer");
          const canModerate = isHost && !isMe && m.sender;

          return (
            <div
              key={m.id || `chat-${Math.random()}`}
              className="flex items-start gap-2 animate-fade-in"
            >
              <div className="inline-flex items-start gap-1.5 px-3 py-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md text-xs shadow-md max-w-[88%]">
                <button
                  type="button"
                  disabled={!canModerate}
                  onClick={() => {
                    if (canModerate) {
                      onModerateUser?.({
                        id: m.sender,
                        pseudonym: senderName,
                      });
                    }
                  }}
                  className={`font-bold shrink-0 transition-colors ${
                    isMe
                      ? "text-pink cursor-default"
                      : canModerate
                      ? "text-amber-300 hover:text-amber-200 underline decoration-dotted cursor-pointer"
                      : "text-purple-300 cursor-default"
                  }`}
                  title={canModerate ? "Click to mute or ban viewer" : ""}
                >
                  {senderName}:
                </button>
                <span className="text-white/95 break-words font-normal leading-relaxed">
                  {m.body || m.text || ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
