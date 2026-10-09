import {
  initialConfig,
  initialMe,
  initialDesires,
} from "../data/seedData";
import { getStoredTokens } from "../services/api";

export const STORAGE_KEY = "juicy_match_state_v1";
export const DATA_VERSION = "3"; // Bump this to force-clear old cached seed data

export function getInitialAppState() {
  const { token } = getStoredTokens();
  const hasToken = Boolean(token);
  try {
    const savedVersion = localStorage.getItem("juicy_match_data_version");
    if (savedVersion !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem("juicy_match_data_version", DATA_VERSION);
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.authenticated = hasToken;
      return parsed;
    }
  } catch {}

  return {
    authenticated: hasToken,
    me: initialMe,
    config: initialConfig,
    prefs: {
      sound: true,
      reducedMotion: false,
      timezone: "UTC",
      frequency: "instant",
      quietStart: 23,
      quietEnd: 8,
      channels: { inApp: true, email: false, push: false, whatsapp: false },
      categories: { matches: true, messages: true, events: true, marketing: false },
    },
    entitlement: {
      plan: "free",
      features: {
        audioCalls: true,
        videoCalls: true,
        passport: false,
        events: true,
        unlimitedLikes: false,
        stealthMode: false,
      },
      passportSource: "none",
      expiresAt: null,
    },
    discoverProfiles: [],
    connections: [],
    messages: {},
    desires: initialDesires,
    policies: [],
    passportPlans: [],
    events: [],
    notifications: [],
    wallet: {
      featureCredits: 100,
      aiCredits: 20,
      balance: 0,
    },
    subscription: {
      plan: "00000000-0000-0000-0000-000000000001",
      planKey: "explore",
      name: "Explore",
      status: "active",
      expiresAt: "2099-12-31T23:59:59.000Z",
      autoRenew: false,
    },
    media: {
      items: [],
      grants: [],
    },
    privacyRequests: [],
    purchaseRecords: [],
    selectedCurrency: "USD",
  };
}
