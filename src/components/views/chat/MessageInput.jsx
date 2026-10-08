import React, { useRef, useEffect } from "react";
import Icon from "../../common/Icon";

export default function MessageInput({
  inputBody,
  setInputBody,
  onSend,
  sending,
  showAttachMenu,
  setShowAttachMenu,
  showEmojiDrawer,
  setShowEmojiDrawer,
  replyTo,
  setReplyTo,
  editingMsgId,
  setEditingMsgId,
  handleFileChange,
  fileInputRef,
  pendingAttachment,
  setPendingAttachment,
  handleCancelReplyEdit,
  handleEmojiSelect,
  prompts,
  onPromptClick,
}) {
  const inputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputBody]);

  return (
    <div className="flex flex-col bg-surface/95 border-t border-line p-3 sticky bottom-0 z-10 w-full shrink-0">
      
      {/* Reply / Edit Context Bar */}
      {(replyTo || editingMsgId || pendingAttachment) && (
        <div className="flex items-center justify-between bg-night/50 border border-line rounded-lg p-2 mb-2 px-3">
          <div className="flex flex-col gap-1 overflow-hidden">
            {replyTo && (
              <>
                <span className="text-[10px] font-bold text-pink uppercase tracking-wider">
                  Replying to
                </span>
                <span className="text-xs text-cream truncate opacity-80">
                  {replyTo.body || "Attachment"}
                </span>
              </>
            )}
            {editingMsgId && (
              <span className="text-xs font-semibold text-lilac">Editing message...</span>
            )}
            {pendingAttachment && (
              <div className="flex items-center gap-2">
                <Icon name="image" className="w-4 h-4 text-pink" />
                <span className="text-xs text-cream truncate">
                  {pendingAttachment.file?.name || "Image ready to send"}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancelReplyEdit}
            className="p-1 text-muted hover:text-pink transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Prompts / Sparks */}
      {prompts && prompts.length > 0 && !inputBody && !replyTo && !pendingAttachment && (
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 mb-1">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => onPromptClick(p)}
              className="flex-shrink-0 px-3 py-1.5 text-xs bg-surface-light border border-line rounded-full text-cream hover:border-pink hover:text-pink transition-colors whitespace-nowrap"
            >
              ✨ {p.label || p}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiDrawer(false);
            }}
            className={`p-2.5 rounded-full transition-colors ${
              showAttachMenu ? "bg-pink text-white" : "text-muted hover:text-cream hover:bg-surface-light"
            }`}
          >
            <Icon name="plus" className={`w-5 h-5 transition-transform ${showAttachMenu ? "rotate-45" : ""}`} />
          </button>

          {/* Attachment Popover */}
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-surface border border-line rounded-xl shadow-glow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-cream hover:bg-surface-light transition-colors text-left"
              >
                <Icon name="image" className="w-5 h-5 text-pink" />
                <span>Upload Photo</span>
              </button>
              {/* Add more attachment options here if needed */}
            </div>
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* Text Input Area */}
        <div className="flex-1 bg-night border border-line focus-within:border-pink focus-within:ring-1 focus-within:ring-pink/30 rounded-2xl flex items-end relative overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => {
              setShowEmojiDrawer(!showEmojiDrawer);
              setShowAttachMenu(false);
            }}
            className="p-2.5 text-muted hover:text-cream transition-colors flex-shrink-0"
          >
            <Icon name="emoji" className="w-5 h-5" />
          </button>
          
          <textarea
            ref={inputRef}
            className="flex-1 max-h-32 min-h-[44px] py-2.5 px-2 bg-transparent text-cream placeholder-muted resize-none focus:outline-none text-sm custom-scrollbar"
            placeholder="Type a message..."
            value={inputBody}
            onChange={(e) => setInputBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (inputBody.trim() || pendingAttachment) onSend(e);
              }
            }}
            rows={1}
          />
        </div>

        {/* Send / Mic Button */}
        {(inputBody.trim() || pendingAttachment) ? (
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="w-11 h-11 flex-shrink-0 rounded-full bg-pink text-white flex items-center justify-center shadow-glow hover:bg-pink-hover transition-colors disabled:opacity-50"
          >
            <Icon name={sending ? "spinner" : "send"} className={`w-5 h-5 ${sending ? "animate-spin" : "ml-1"}`} />
          </button>
        ) : (
          <button
            type="button"
            className="w-11 h-11 flex-shrink-0 rounded-full bg-surface-light text-muted flex items-center justify-center hover:text-cream hover:bg-surface-hover transition-colors"
          >
            <Icon name="mic" className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Emoji Drawer (Simple mock for now, replace with emoji-picker-react if needed) */}
      {showEmojiDrawer && (
        <div className="mt-2 bg-surface-light border border-line rounded-xl p-2 grid grid-cols-8 gap-1 h-32 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
          {["😀","😂","😍","🥰","😘","😎","🤔","🙄","😭","😡","👍","👎","❤️","🔥","✨","🎉"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className="p-1.5 hover:bg-surface-hover rounded text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
