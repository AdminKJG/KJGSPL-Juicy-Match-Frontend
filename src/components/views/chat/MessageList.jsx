import React, { useEffect, useRef } from "react";
import Icon from "../../common/Icon";
import Loader from "../../common/Loader";
import { formatMessageTime } from "./chatUtils";

export default function MessageList({
  messages,
  meId,
  peer,
  loading,
  isInitialLoad,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onViewImage,
  showDropdownMsgId,
  setShowDropdownMsgId,
}) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (loading && isInitialLoad) {
    return (
      <div className="flex-1 flex items-center justify-center bg-night/80">
        <Loader text="Loading secure conversation..." size="medium" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-night/80">
        <div className="w-24 h-24 mb-6 rounded-full bg-surface-light border-2 border-dashed border-line flex items-center justify-center">
          <Icon name="chat" className="w-10 h-10 text-muted opacity-50" />
        </div>
        <h3 className="text-xl font-bold text-cream mb-2">No messages yet</h3>
        <p className="text-sm text-muted text-center max-w-sm">
          Send a message to start sparking a connection with {peer?.pseudonym || "this match"}.
        </p>
      </div>
    );
  }

  // Group messages by date (simple mock grouping for now, can be expanded)
  let lastDate = null;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_rgba(233,22,113,0.03),_transparent_50%),_var(--night)]" ref={scrollRef}>
      {messages.map((msg, index) => {
        const isMine = msg.sender === meId;
        const msgDate = new Date(msg.createdAt || msg.created_at).toLocaleDateString();
        const showDateDivider = msgDate !== lastDate;
        lastDate = msgDate;

        return (
          <React.Fragment key={msg.id || index}>
            {showDateDivider && (
              <div className="flex justify-center my-4">
                <span className="px-3 py-1 bg-surface-light text-[10px] font-medium uppercase tracking-widest rounded-full text-muted shadow-sm">
                  {msgDate}
                </span>
              </div>
            )}

            <div className={`flex flex-col relative group ${isMine ? "items-end" : "items-start"} max-w-[85%] ${isMine ? "ml-auto" : "mr-auto"}`}>
              {/* Message Bubble Container */}
              <div className="flex items-end gap-2">
                {!isMine && (
                  <div className="w-6 h-6 rounded-full bg-plum border border-line flex-shrink-0 overflow-hidden hidden sm:block">
                    {peer?.photo && typeof peer.photo === "string" && (
                      <img src={peer.photo} alt={peer?.pseudonym} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                
                <div
                  className={`relative p-3 rounded-2xl break-words group-hover:shadow-md transition-shadow ${
                    isMine
                      ? "bg-gradient-to-br from-pink to-[#c9125e] text-white rounded-br-sm shadow-[0_4px_15px_rgba(233,22,113,0.2)]"
                      : "bg-surface border border-line text-cream rounded-bl-sm"
                  }`}
                >
                  {/* Reply Context */}
                  {msg.replyTo && (
                    <div className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${isMine ? "bg-white/10 border-white/50" : "bg-night/50 border-pink/50"}`}>
                      <p className="font-semibold mb-0.5">{msg.replyTo.sender === meId ? "You" : peer?.pseudonym}</p>
                      <p className="opacity-80 truncate">{msg.replyTo.body || "Attachment"}</p>
                    </div>
                  )}

                  {/* Media Content */}
                  {((((msg.mediaUrl && msg.mediaUrl.startsWith("[photo:")) ? msg.mediaUrl.replace("[photo:", "").replace("]", "") : msg.mediaUrl) && msg.mediaUrl.startsWith("[photo:")) ? msg.mediaUrl.replace("[photo:", "").replace("]", "") : msg.mediaUrl) && (
                    <div
                      className="rounded-lg overflow-hidden mb-2 cursor-pointer border border-white/10 max-w-[240px]"
                      onClick={() => onViewImage(msg.mediaUrl)}
                    >
                      <img src={msg.mediaUrl} alt="Attachment" className="w-full h-auto object-cover max-h-48" />
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                    {msg.isDeletedForEveryone ? (
                      <span className="italic opacity-60 flex items-center gap-1">
                        <Icon name="ban" className="w-3.5 h-3.5" /> This message was deleted
                      </span>
                    ) : (
                      (msg.body && msg.body.startsWith("[photo:") ? "Sent a photo" : msg.body)
                    )}
                  </div>

                  {/* Meta (Time & Status) */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMine ? "text-white/70" : "text-muted"}`}>
                    {msg.edited && <span className="italic mr-1">edited</span>}
                    <span>{formatMessageTime(msg.createdAt || msg.created_at)}</span>
                    {isMine && (
                      <Icon
                        name={msg.read ? "check-double" : "check"}
                        className={`w-3.5 h-3.5 ml-0.5 ${msg.read ? (isMine ? "text-white" : "text-pink") : "opacity-70"}`}
                      />
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reaction && (
                    <div className={`absolute -bottom-2 ${isMine ? "-left-2" : "-right-2"} bg-surface border border-line rounded-full px-1.5 py-0.5 text-sm shadow-sm flex items-center gap-1`}>
                      <span>{msg.reaction}</span>
                      {msg.reactionCount > 1 && <span className="text-[10px] font-bold text-muted">{msg.reactionCount}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Hover Actions */}
              {!msg.isDeletedForEveryone && (
                <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "-left-12" : "-right-12"}`}>
                  <button
                    onClick={() => onReply(msg)}
                    className="p-1.5 text-muted hover:text-cream bg-surface-light rounded-full shadow-sm hover:scale-110 transition-transform"
                    title="Reply"
                  >
                    <Icon name="reply" className="w-3 h-3" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdownMsgId(showDropdownMsgId === msg.id ? null : msg.id)}
                      className="p-1.5 text-muted hover:text-cream bg-surface-light rounded-full shadow-sm hover:scale-110 transition-transform"
                    >
                      <Icon name="more" className="w-3 h-3" />
                    </button>
                    {showDropdownMsgId === msg.id && (
                      <div className={`absolute top-full mt-1 ${isMine ? "right-0" : "left-0"} bg-surface border border-line rounded-lg shadow-glow-lg overflow-hidden z-20 w-32 py-1`}>
                        {isMine && (
                          <button onClick={() => { onEdit(msg); setShowDropdownMsgId(null); }} className="w-full text-left px-3 py-1.5 text-xs text-cream hover:bg-surface-light">
                            Edit
                          </button>
                        )}
                        <button onClick={() => { onDelete(msg); setShowDropdownMsgId(null); }} className="w-full text-left px-3 py-1.5 text-xs text-pink hover:bg-surface-light">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
