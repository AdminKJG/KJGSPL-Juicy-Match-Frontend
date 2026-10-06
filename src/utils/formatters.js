export const esc = (value) => String(value ?? "");

export const title = (value) =>
  String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

export const PEER_NAME_PORTRAIT_MAP = {
  Maya: 0,
  Nicole: 0,
  Leo: 1,
  Zara: 2,
  Jenny: 2,
  Kai: 3,
  Isla: 4,
  Elena: 4,
  Arjun: 5,
};

export const getPeerPortraitIndex = (peer) => {
  if (peer === null || peer === undefined) return 0;

  // 1. If a direct number was passed
  if (typeof peer === "number") {
    return Number.isInteger(peer) && peer >= 0 && peer <= 5 ? peer : 0;
  }

  // 2. Check explicit portrait index attribute on the object
  if (typeof peer === "object") {
    const pNum = Number(peer?.portrait ?? peer?.portraitIdx ?? peer?.peer?.portrait);
    if (Number.isInteger(pNum) && pNum >= 0 && pNum <= 5) {
      return pNum;
    }
  }

  // 3. Resolve name / pseudonym
  const rawName =
    peer?.pseudonym ||
    peer?.peer?.pseudonym ||
    peer?.name ||
    peer?.peer?.name ||
    peer?.username ||
    peer?.displayName ||
    (typeof peer === "string" ? peer : "");

  const name = String(rawName).trim();

  // 4. Check known peer name map
  if (name) {
    if (PEER_NAME_PORTRAIT_MAP[name] !== undefined) {
      return PEER_NAME_PORTRAIT_MAP[name];
    }
    for (const [key, val] of Object.entries(PEER_NAME_PORTRAIT_MAP)) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return val;
      }
    }
  }

  // 5. Deterministic hash fallback (1-5)
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return (Math.abs(hash) % 5) + 1;
};

export const portraitClass = (p) => {
  const idx = getPeerPortraitIndex(p);
  return `p${idx}`;
};

export const money = (amount, currency = "USD", exponent) =>
  amount == null
    ? "Amount not supplied"
    : new Intl.NumberFormat("en", { style: "currency", currency }).format(
        amount / 10 ** (exponent ?? (currency === "JPY" ? 0 : 2)),
      );

export function formatMessageTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

export function formatConversationTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0 && d.getDate() === now.getDate()) {
      return formatMessageTime(d);
    } else if (diffDays <= 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
    } else {
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
    }
  } catch {
    return "";
  }
}

export function formatDate(value, timezone = undefined, options = {}) {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "Date unavailable";
    const opts = {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
      ...options,
    };
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  } catch {
    return "Date unavailable";
  }
}

export function formatRelativeTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffSecs = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
    if (diffSecs < 60) return "just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

export function playSound(enabled = true) {
  if (!enabled || (typeof document !== "undefined" && document.hidden)) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx(),
      osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, audio.currentTime + 0.15);
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.24);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.25);
    osc.onended = () => audio.close();
  } catch {}
}

export function playRingtone(enabled = true) {
  if (!enabled || (typeof document !== "undefined" && document.hidden)) return null;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const audio = new AudioCtx();
    let isPlaying = true;

    const playTonePair = () => {
      if (!isPlaying || audio.state === "closed") return;
      try {
        const osc1 = audio.createOscillator();
        const osc2 = audio.createOscillator();
        const gain = audio.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, audio.currentTime);
        osc2.frequency.setValueAtTime(480, audio.currentTime);

        gain.gain.setValueAtTime(0.035, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audio.destination);

        osc1.start();
        osc2.start();
        osc1.stop(audio.currentTime + 1.25);
        osc2.stop(audio.currentTime + 1.25);
      } catch {}
    };

    playTonePair();
    const timer = setInterval(() => {
      if (isPlaying) playTonePair();
      else clearInterval(timer);
    }, 2800);

    return {
      stop: () => {
        isPlaying = false;
        clearInterval(timer);
        try {
          audio.close();
        } catch {}
      },
    };
  } catch {
    return null;
  }
}

export async function fileAsBase64(file) {
  if (!file || file.size > 2600000)
    throw Error("Choose a file smaller than 2.6 MB.");
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(Error("This file could not be read."));
    r.readAsDataURL(file);
  });
}

export function getEmojiMessageInfo(rawText) {
  if (!rawText || typeof rawText !== "string") return { isEmojiOnly: false, count: 0 };
  const trimmed = rawText.trim();
  if (!trimmed) return { isEmojiOnly: false, count: 0 };

  try {
    // If standard alphanumeric or symbols exist, it's not emoji-only
    if (/[a-zA-Z0-9$¥€£@#%&*+=\-_/\\|<>()[\]{}:;'"~`^]/.test(trimmed)) {
      return { isEmojiOnly: false, count: 0 };
    }

    // Extract all emoji characters
    const emojiMatches = trimmed.match(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu) || [];
    
    if (emojiMatches.length > 0) {
      const stripped = trimmed.replace(/(\p{Extended_Pictographic}|\uFE0F|\u200D|\u20E3|\p{Emoji_Modifier}|\s)+/gu, "");
      if (stripped.length === 0) {
        return { isEmojiOnly: true, count: emojiMatches.length };
      }
    }
  } catch (e) {
    const fallbackMatches = trimmed.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gu) || [];
    if (fallbackMatches.length > 0) {
      return { isEmojiOnly: true, count: fallbackMatches.length };
    }
  }

  return { isEmojiOnly: false, count: 0 };
}
