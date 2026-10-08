import { useState, useRef, useEffect, useCallback } from "react";

export function useChatEffects({ triggerSound, activeConnId }) {
  const [floatingParticles, setFloatingParticles] = useState([]);
  const broadcastChannelRef = useRef(null);
  const lastShowerTimeRef = useRef(0);
  const processedNoncesRef = useRef(new Set());

  const broadcastEmojiEvent = useCallback((emojiStr, messageId = null, action = "shower") => {
    const nonce = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    processedNoncesRef.current.add(nonce);

    const payload = {
      connectionId: activeConnId,
      messageId: messageId,
      emoji: String(emojiStr || "❤️"),
      action: action,
      timestamp: Date.now(),
      nonce: nonce,
    };

    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(payload);
      }
    } catch (e) {}

    try {
      localStorage.removeItem("jm_emoji_effects_event");
      localStorage.setItem("jm_emoji_effects_event", JSON.stringify(payload));
    } catch (e) {}
  }, [activeConnId]);

  const triggerEmojiShower = useCallback((emoji = "❤️", shouldBroadcast = true, messageId = null) => {
    const now = Date.now();
    // Debounce to ensure animation only triggers once per interaction
    if (now - lastShowerTimeRef.current < 1600) {
      return;
    }
    lastShowerTimeRef.current = now;

    if (triggerSound) triggerSound();

    const str = String(emoji || "❤️");
    let palette = [
      "❤️", "💖", "💕", "💓", "💗", "💝", "💘", "💞", "🌹", "🌷", "🌸", "💐", "✨", "💌", "🤍",
    ];

    if (str.includes("🔥") || str.includes("⚡") || str.includes("💥")) {
      palette = ["🔥", "💥", "⚡", "✨", "🌟", "🎇", "🧡"];
    } else if (str.includes("😂") || str.includes("🤣") || str.includes("😆") || str.includes("😅")) {
      palette = ["😂", "🤣", "✨", "💛", "😆", "🎉", "😹"];
    } else if (str.includes("👍") || str.includes("👏") || str.includes("🙌") || str.includes("💯")) {
      palette = ["👍", "👏", "🙌", "✨", "💯", "🎉", "⭐", "💪"];
    } else if (str.includes("🎉") || str.includes("🥳") || str.includes("🎊") || str.includes("🎈")) {
      palette = ["🎉", "🥳", "🎊", "✨", "🎈", "🍾", "🎁"];
    } else if (str.includes("😍") || str.includes("🥰") || str.includes("😘") || str.includes("💋")) {
      palette = ["😍", "🥰", "😘", "💋", "❤️", "💖", "💕", "🌹", "✨"];
    } else if (str.includes("😮") || str.includes("😲") || str.includes("🤯")) {
      palette = ["😮", "😲", "🤯", "✨", "💫", "⭐"];
    } else if (str.includes("😢") || str.includes("😭") || str.includes("🥺")) {
      palette = ["😢", "😭", "🥺", "💧", "💔", "🩹"];
    } else {
      try {
        const emojiMatch = str.match(/(\p{Extended_Pictographic})/u) || str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/u);
        if (emojiMatch && emojiMatch[0]) {
          palette = [emojiMatch[0], emojiMatch[0], "✨", "💖", "⭐", emojiMatch[0]];
        }
      } catch (e) {}
    }

    const count = 46;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: `p-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      emoji: palette[Math.floor(Math.random() * palette.length)],
      left: Math.floor(Math.random() * 90 + 5),
      size: Math.floor(Math.random() * 26 + 26),
      delay: (Math.random() * 0.9).toFixed(2),
      duration: (Math.random() * 1.5 + 3.8).toFixed(2),
      sway: Math.floor(Math.random() * 80 - 40),
      scale: (Math.random() * 0.5 + 0.8).toFixed(2),
    }));

    setFloatingParticles((prev) => [...prev, ...newParticles]);

    if (shouldBroadcast && activeConnId) {
      broadcastEmojiEvent(str, messageId, "shower");
    }

    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 6200);
  }, [activeConnId, broadcastEmojiEvent, triggerSound]);

  const triggerRemoteEmojiEffect = useCallback((msgId, emojiStr, nonce = null) => {
    if (nonce) {
      if (processedNoncesRef.current.has(nonce)) return;
      processedNoncesRef.current.add(nonce);
    }

    if (msgId) {
      const applyPop = () => {
        const el = document.querySelector(
          `[data-msg-id="${msgId}"] .wa-emoji-single-content, [data-msg-id="${msgId}"] .wa-emoji-few-content, [data-msg-id="${msgId}"] .wa-reactions-badge`
        );
        if (el) {
          el.classList.remove("pop-again");
          void el.offsetWidth;
          el.classList.add("pop-again");
        }
      };
      setTimeout(applyPop, 50);
      setTimeout(applyPop, 220);
    }
    triggerEmojiShower(emojiStr, false, msgId);
  }, [triggerEmojiShower]);

  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel("jm_emoji_effects");
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data?.emoji) {
          triggerRemoteEmojiEffect(event.data.messageId, event.data.emoji, event.data.nonce);
        }
      };
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === "jm_emoji_effects_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.emoji) {
            triggerRemoteEmojiEffect(data.messageId, data.emoji, data.nonce);
          }
        } catch (err) {}
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch (e) {}
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [triggerRemoteEmojiEffect]);

  return {
    floatingParticles,
    triggerEmojiShower,
    triggerRemoteEmojiEffect,
  };
}
