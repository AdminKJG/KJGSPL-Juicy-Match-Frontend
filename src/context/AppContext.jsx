import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import {
  initialConfig,
  demoActors,
  initialMe,
  initialDiscoverProfiles,
  initialConnections,
  initialMessages,
  initialDesires,
  initialPolicies,
  initialCities,
  initialPassportPlans,
  initialEvents,
  initialCatalog,
  initialNotifications,
} from "../data/seedData";
import { playSound } from "../utils/formatters";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { callsService } from "../services/callsService";
import { chatService } from "../services/chatService";
import { blockService } from "../services/blockService";
import {
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
  bootSession,
  getCurrentUserIdFromToken,
} from "../services/api";

const AppContext = createContext();

const STORAGE_KEY = "juicy_match_state_v1";
const DATA_VERSION = "3"; // Bump this to force-clear old cached seed data

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    const { token } = getStoredTokens();
    const hasToken = Boolean(token);
    try {
      // Auto-clear stale cache that had seed connections
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
      wallet: { balance: 0 },
      media: {
        items: [],
        grants: [],
      },
      privacyRequests: [],
      purchaseRecords: [],
      selectedCurrency: "USD",
    };
  });

  const [activeRoute, setActiveRoute] = useState(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, "");
    const rawPath = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

    const { token } = getStoredTokens();
    const hasToken = Boolean(token);

    const requestedRoute = rawHash || rawPath;

    if (hasToken) {
      if (requestedRoute && !["signin", "signup"].includes(requestedRoute)) {
        return requestedRoute;
      }
      return "discover";
    } else {
      if (requestedRoute && ["signin", "signup", "policies"].includes(requestedRoute)) {
        return requestedRoute;
      }
      return "signin";
    }
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // Auto clean legacy hash on mount
  useEffect(() => {
    if (window.location.hash) {
      const clean = window.location.hash.replace(/^#\/?/, "");
      const { token } = getStoredTokens();
      const isAuth = Boolean(token);
      let target = clean;
      if (isAuth) {
        if (!target || ["signin", "signup"].includes(target)) {
          target = "discover";
        }
      } else {
        if (!target || !["signin", "signup", "policies"].includes(target)) {
          target = "signin";
        }
      }
      const fullPath = target ? `/${target}` : "/";
      window.history.replaceState({}, "", fullPath);
      setActiveRoute(target);
    }
  }, [state.authenticated]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Listen for session expiry from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setState((prev) => ({ ...prev, authenticated: false }));
      showToast("Session expired. Please sign in again.");
      navigate("signin");
    };
    window.addEventListener("jm-session-expired", handleSessionExpired);
    return () => window.removeEventListener("jm-session-expired", handleSessionExpired);
  }, []);

  // Handle browser history popstate changes (clean URL routing without hash)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      const isAuth = Boolean(state.authenticated);
      let target = path;
      if (isAuth) {
        if (!target || ["signin", "signup"].includes(target)) {
          target = "discover";
        }
      } else {
        if (!target || !["signin", "signup", "policies"].includes(target)) {
          target = "signin";
        }
      }
      setActiveRoute(target);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [state.authenticated]);

  // Persist state to local storage on changes
  useEffect(() => {
    try {
      if (state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (err) {
      console.warn("Local storage state persist warning:", err);
    }
  }, [state]);

  // Apply reduced motion
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      Boolean(state.prefs?.reducedMotion)
    );
  }, [state.prefs?.reducedMotion]);

  // Load real profile & connections from API on auth (replaces any seed data in state)
  useEffect(() => {
    if (!state.authenticated) return;
    let cancelled = false;
    const loadRealData = async () => {
      try {
        const [meData, connRes] = await Promise.allSettled([
          profileService.getMe(),
          chatService.getConnections(),
        ]);
        if (cancelled) return;

        if (meData.status === "fulfilled" && meData.value) {
          const m = meData.value;
          setState((prev) => ({
            ...prev,
            me: {
              ...prev.me,
              id: m.id || m.account?.id || getCurrentUserIdFromToken() || prev.me?.id,
              email: m.email || m.account?.email || prev.me?.email,
              account: m.account || prev.me?.account,
              revision: m.revision || prev.me?.revision || 1,
              profile: {
                ...prev.me?.profile,
                ...(m.profile || {}),
              },
            },
          }));
        } else if (getCurrentUserIdFromToken()) {
          const tokenUid = getCurrentUserIdFromToken();
          setState((prev) => ({
            ...prev,
            me: {
              ...prev.me,
              id: prev.me?.id || tokenUid,
            },
          }));
        }

        if (connRes.status === "fulfilled" && connRes.value) {
          const items = Array.isArray(connRes.value)
            ? connRes.value
            : connRes.value?.items || connRes.value?.data?.items || connRes.value?.data || [];
          if (Array.isArray(items) && items.length > 0) {
            setState((prev) => ({ ...prev, connections: items }));
          }
        }
      } catch {}
    };
    loadRealData();
    return () => { cancelled = true; };
  }, [state.authenticated]);

  // Global WebRTC / Audio-Video Call State
  const [activeCall, setActiveCall] = useState(null);
  const activeCallRef = useRef(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Unique identifier for this tab instance
  const tabIdRef = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  // Universal identity helpers (handles any user identity dynamically)
  const getMyIds = useCallback(() => {
    const ids = new Set();
    const rawIds = [
      state.me?.id,
      state.me?.account?.id,
      state.me?.accountId,
      state.me?.user?.id,
    ];
    rawIds.forEach((id) => {
      if (id) ids.add(String(id).trim().toLowerCase());
    });
    return ids;
  }, [state.me?.id, state.me?.account?.id, state.me?.accountId, state.me?.user?.id]);

  const getMyNames = useCallback(() => {
    const names = new Set();
    const rawNames = [
      state.me?.profile?.pseudonym,
      state.me?.account?.profile?.pseudonym,
      state.me?.pseudonym,
      state.me?.profile?.name,
    ];
    rawNames.forEach((n) => {
      if (n) names.add(String(n).trim().toLowerCase());
    });
    return names;
  }, [state.me?.profile?.pseudonym, state.me?.account?.profile?.pseudonym, state.me?.pseudonym, state.me?.profile?.name]);

  const extractCallerId = useCallback((c) => {
    const raw =
      c?.callerId ||
      c?.caller_id ||
      (typeof c?.caller === "object" && c?.caller ? (c.caller.id || c.caller.accountId) : c?.caller);
    return raw ? String(raw).trim().toLowerCase() : "";
  }, []);

  const extractCallerName = useCallback((c) => {
    const raw =
      c?.callerName ||
      c?.caller_name ||
      (typeof c?.caller === "object" && c?.caller ? (c.caller.pseudonym || c.caller.name) : "");
    return raw ? String(raw).trim().toLowerCase() : "";
  }, []);

  const extractReceiverId = useCallback((c) => {
    const raw =
      c?.receiverId ||
      c?.receiver_id ||
      (typeof c?.receiver === "object" && c?.receiver ? (c.receiver.id || c.receiver.accountId) : c?.receiver);
    return raw ? String(raw).trim().toLowerCase() : "";
  }, []);

  const extractReceiverName = useCallback((c) => {
    const raw =
      c?.receiverName ||
      c?.receiver_name ||
      (typeof c?.receiver === "object" && c?.receiver ? (c.receiver.pseudonym || c.receiver.name) : "");
    return raw ? String(raw).trim().toLowerCase() : "";
  }, []);

  const isCallFromMe = useCallback((c) => {
    const myIds = getMyIds();
    const myNames = getMyNames();
    const cId = extractCallerId(c);
    const cName = extractCallerName(c);

    if (cId && myIds.has(cId)) return true;
    if (cName && myNames.has(cName)) return true;
    return false;
  }, [getMyIds, getMyNames, extractCallerId, extractCallerName]);

  const isCallForMe = useCallback((c) => {
    if (isCallFromMe(c)) return false;

    const myIds = getMyIds();
    const myNames = getMyNames();
    const rId = extractReceiverId(c);
    const rName = extractReceiverName(c);
    const cId = extractCallerId(c);
    const cName = extractCallerName(c);

    if (rId && myIds.has(rId)) return true;
    if (rName && myNames.has(rName)) return true;

    if (cId && myIds.size > 0 && !myIds.has(cId)) return true;
    if (cName && myNames.size > 0 && !myNames.has(cName)) return true;

    return false;
  }, [isCallFromMe, getMyIds, getMyNames, extractReceiverId, extractReceiverName, extractCallerId, extractCallerName]);

  // Global Call Synchronization (BroadcastChannel + LocalStorage + Backend Polling)
  useEffect(() => {
    if (!state.authenticated) return;

    let callsChannel = null;
    try {
      const handleIncomingCallEvent = (data) => {
        if (!data || !data.type) return;

        // Ignore events originating from this exact tab
        if (data.tabId && data.tabId === tabIdRef.current) {
          return;
        }

        if (data.type === "CALL_INITIATED") {
          // If this user is the caller, ignore (do not treat own call as incoming)
          if (isCallFromMe(data)) {
            return;
          }

          // If this tab already placed an active outgoing call, ignore
          if (activeCallRef.current && !activeCallRef.current.isIncoming) {
            return;
          }

          // Check if this incoming call is targeted to this user
          if (!isCallForMe(data)) {
            return;
          }

          // Display Incoming Call to Receiver
          setActiveCall({
            id: data.callId || `call-${Date.now()}`,
            connectionId: data.connectionId,
            medium: data.medium || "audio",
            peer: data.caller || { pseudonym: data.callerName || "Match", id: data.callerId },
            isIncoming: true,
            initialStatus: "ringing",
          });
        } else if (data.type === "CALL_ACCEPTED") {
          if (activeCallRef.current) {
            setActiveCall((prev) => (prev ? { ...prev, initialStatus: "connected" } : null));
          }
        } else if (data.type === "CALL_DECLINED" || data.type === "CALL_ENDED" || data.type === "CALL_CANCELLED") {
          if (activeCallRef.current) {
            setActiveCall(null);
          }
        }
      };

      callsChannel = new BroadcastChannel("jm_calls_channel");
      callsChannel.onmessage = (event) => handleIncomingCallEvent(event.data);
    } catch {}

    // Cross-tab fallback via Storage events
    const handleStorage = (e) => {
      if (e.key === "jm_last_call_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (!data || !data.type) return;

          // Ignore events originating from this exact tab
          if (data.tabId && data.tabId === tabIdRef.current) {
            return;
          }

          if (data.type === "CALL_INITIATED") {
            if (isCallFromMe(data)) {
              return;
            }

            if (activeCallRef.current && !activeCallRef.current.isIncoming) {
              return;
            }

            if (!isCallForMe(data)) {
              return;
            }

            setActiveCall({
              id: data.callId || `call-${Date.now()}`,
              connectionId: data.connectionId,
              medium: data.medium || "audio",
              peer: data.caller || { pseudonym: data.callerName || "Match" },
              isIncoming: true,
              initialStatus: "ringing",
            });
          } else if (data.type === "CALL_ACCEPTED") {
            if (activeCallRef.current) {
              setActiveCall((prev) => (prev ? { ...prev, initialStatus: "connected" } : null));
            }
          } else if (data.type === "CALL_DECLINED" || data.type === "CALL_ENDED" || data.type === "CALL_CANCELLED") {
            if (activeCallRef.current) {
              setActiveCall(null);
            }
          }
        } catch {}
      } else if (e.key === "jm_last_chat_message" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.type === "NEW_MESSAGE" && data.message) {
            const incomingMsg = data.message;
            const connId = data.connectionId;
            const senderName = data.senderName;

            setState((prev) => {
              const currentMsgs = prev.messages?.[connId] || [];
              if (currentMsgs.some((m) => m.id === incomingMsg.id || (incomingMsg.clientId && m.clientId === incomingMsg.clientId))) {
                return prev;
              }
              const updatedConnections = prev.connections.map((c) => {
                const pName = c.peer?.pseudonym || "";
                if (c.id === connId || (senderName && pName.toLowerCase() === senderName.toLowerCase())) {
                  return {
                    ...c,
                    lastMessage: incomingMsg,
                    lastActive: new Date().toISOString(),
                  };
                }
                return c;
              });

              return {
                ...prev,
                messages: {
                  ...prev.messages,
                  [connId]: [...currentMsgs, incomingMsg],
                },
                connections: updatedConnections,
              };
            });
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Backend Polling every 5s for incoming calls (paused when tab hidden)
    const pollTimer = setInterval(async () => {
      if (document.hidden || activeCallRef.current) return;
      try {
        const myId = state.me?.id;
        const myPseudonym = (state.me?.profile?.pseudonym || "").trim().toLowerCase();
        console.log("[JM Call Poll] My identity → id:", myId, "| pseudonym:", myPseudonym);

        const TERMINATED = new Set(["ended", "declined", "cancelled", "missed", "completed", "closed", "rejected", "expired"]);
        const isRinging = (s) => {
          const str = String(s || "").toLowerCase();
          return str === "ringing" || str === "invited" || str === "initiated" || str === "calling" || str === "pending" || str === "active";
        };
        const isMyCaller = (c) => {
          const callerName = String(c.callerName || c.caller_name || c.caller?.pseudonym || c.caller?.name || "").trim().toLowerCase();
          const callerId = c.callerId || c.caller_id || c.caller?.id || (typeof c.caller === "string" ? c.caller : null);
          return (callerId && myId && callerId === myId) || (callerName && myPseudonym && callerName === myPseudonym);
        };
        const parseList = (res) => {
          const raw = Array.isArray(res) ? res : res?.items || res?.calls || res?.data?.items || res?.data || res?.active || [];
          return Array.isArray(raw) ? raw : [];
        };
        const buildPeer = (c, connId) =>
          c.peer ||
          (typeof c.caller === "object" && c.caller !== null ? c.caller : null) ||
          state.connections?.find((conn) => conn.id === connId)?.peer || {
            pseudonym: c.callerName || c.caller_name || (typeof c.caller === "string" ? c.caller : "Match"),
            id: c.callerId || c.caller_id || (typeof c.caller === "string" ? c.caller : null),
            portrait: c.callerPortrait,
            photo: c.callerPhoto || c.caller_photo,
          };

        // ── Stage 1: Active/ringing filtered endpoints ─────────────────────
        const activeRes = await callsService.getCalls().catch(() => null);
        const activeList = parseList(activeRes);

        if (activeList.length > 0) {
          console.log("[JM Call Poll] Active calls found:", activeList.map(c => ({
            id: c.id, state: c.state || c.status, caller: c.caller || c.caller_id, created: c.created_at || c.createdAt
          })));
          const found = activeList.find((c) => isRinging(c.state || c.status) && isCallForMe(c) && !isCallFromMe(c));
          if (found && !activeCallRef.current) {
            const connId = found.connectionId || found.connection_id;
            console.log("[JM Call] ✅ Incoming call for me (Stage 1):", found);
            setActiveCall({
              id: found.id,
              connectionId: connId,
              medium: found.medium || "audio",
              peer: buildPeer(found, connId),
              isIncoming: true,
              initialStatus: "ringing",
            });
            return;
          }
        }

        // ── Stage 2: Full history — check most recent call by created_at ───
        const allRes = await callsService.getAllCalls().catch(() => null);
        const allList = parseList(allRes);

        if (allList.length > 0) {
          // Sort by creation time descending to find newest
          const sorted = [...allList].sort((a, b) => {
            const ta = new Date(a.created_at || a.createdAt || 0).getTime();
            const tb = new Date(b.created_at || b.createdAt || 0).getTime();
            return tb - ta;
          });

          // Log first 3 most recent for debugging
          console.log("[JM Call Poll] Most recent calls:", sorted.slice(0, 3).map(c => ({
            id: c.id, state: c.state || c.status, caller: c.caller || c.caller_id,
            created: c.created_at || c.createdAt, terminated: TERMINATED.has(String(c.state || c.status || "").toLowerCase())
          })));

          const RECENCY_MS = 90 * 1000; // 90 seconds window
          const recent = sorted.find((c) => {
            const st = String(c.state || c.status || "").toLowerCase();
            if (TERMINATED.has(st)) return false; // explicitly ended
            const created = new Date(c.created_at || c.createdAt || 0).getTime();
            if (Date.now() - created > RECENCY_MS) return false; // too old
            if (isCallFromMe(c)) return false; // I placed this call
            if (!isCallForMe(c)) return false; // Not meant for me
            return true;
          });

          if (recent && !activeCallRef.current) {
            const connId = recent.connectionId || recent.connection_id;
            console.log("[JM Call] ✅ Incoming call (Stage 2 - recency):", recent);
            setActiveCall({
              id: recent.id,
              connectionId: connId,
              medium: recent.medium || "audio",
              peer: buildPeer(recent, connId),
              isIncoming: true,
              initialStatus: "ringing",
            });
            return;
          }
        }

        // 2. Check connections for active incoming call messages
        const connsRes = await chatService.getConnections().catch(() => null);
        const connsList = Array.isArray(connsRes) ? connsRes : connsRes?.items || connsRes?.data?.items || [];
        if (Array.isArray(connsList) && connsList.length > 0) {
          for (const conn of connsList) {
            const lastMsg = conn.lastMessage || conn.last_message;
            if (lastMsg) {
              const body = typeof lastMsg.body === "string" ? lastMsg.body : lastMsg.body?.body || "";
              const isCall = lastMsg.kind === "call" || body.toLowerCase().includes("call");
              const isTerminated = /cancel|miss|end|decline|reject/i.test(body) || ["ended", "cancelled", "declined", "missed"].includes(lastMsg.status);
              const isFromPeer = !isCallFromMe(lastMsg) && isCallForMe(lastMsg);
              const msgTime = new Date(lastMsg.createdAt || lastMsg.created_at || Date.now()).getTime();
              const isRecent = (Date.now() - msgTime) < 45000;

              if (isCall && !isTerminated && isFromPeer && isRecent && !activeCallRef.current) {
                const isVideo = body.toLowerCase().includes("video");
                setActiveCall({
                  id: lastMsg.callId || lastMsg.id || `call-${Date.now()}`,
                  connectionId: conn.id,
                  medium: isVideo ? "video" : "audio",
                  peer: conn.peer || { pseudonym: "Match" },
                  isIncoming: true,
                  initialStatus: "ringing",
                });
                break;
              }
            }
          }
        }
      } catch {}
    }, 5000);

    return () => {
      if (callsChannel) {
        try { callsChannel.close(); } catch {}
      }
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollTimer);
    };
  }, [state.authenticated, isCallFromMe, isCallForMe]);

  // Global Livestream Notifications Synchronization (real-time notification when mutual friend goes live)
  useEffect(() => {
    if (!state.authenticated) return;

    let liveChannel = null;
    const handleLiveEvent = (data) => {
      if (!data || !data.type) return;
      const myPseudonym = (state.me?.profile?.pseudonym || "").trim().toLowerCase();
      const hostName = (data.hostName || "").trim().toLowerCase();

      if (data.type === "HOST_STARTED_LIVE") {
        if (hostName && hostName !== myPseudonym) {
          showToast(`🔴 ${data.hostName} is now LIVE! "${data.title || "Live Stream"}"`);
          const newNotif = {
            id: `notif-live-${data.streamId || Date.now()}`,
            type: "livestream",
            kind: "livestream",
            title: `${data.hostName} is Live! 🔴`,
            body: `${data.hostName} started a live broadcast: "${data.title || "Live Stream"}". Tap to join.`,
            created_at: new Date().toISOString(),
            read_at: null,
            streamId: data.streamId,
            link: "explore",
          };
          setState((prev) => ({
            ...prev,
            notifications: [newNotif, ...(prev.notifications || []).filter((n) => n.id !== newNotif.id)],
          }));
        }
      } else if (data.type === "HOST_ENDED_LIVE") {
        if (hostName && hostName !== myPseudonym) {
          showToast?.(`${data.hostName || "Host"}'s live stream has ended.`);
        }
      }
    };

    try {
      liveChannel = new BroadcastChannel("jm_live_channel");
      liveChannel.onmessage = (event) => handleLiveEvent(event.data);
    } catch {}

    const handleStorage = (e) => {
      if (e.key === "jm_last_live_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handleLiveEvent(data);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (liveChannel) {
        try { liveChannel.close(); } catch {}
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [state.authenticated, state.me]);

  // Global Start Call (Outgoing)
  const startCall = async (connectionId, medium = "audio", peer = null) => {
    try {
      const myId = state.me?.id || state.me?.account?.id || state.me?.accountId || state.me?.user?.id || "";
      const myPseudonym = state.me?.profile?.pseudonym || state.me?.account?.profile?.pseudonym || state.me?.pseudonym || "You";

      showToast(`Calling ${peer?.pseudonym || "Match"}…`);
      const tempCallId = `call-${Date.now()}`;

      const newCallData = {
        id: tempCallId,
        connectionId,
        medium,
        peer: peer || { pseudonym: "Match" },
        isIncoming: false,
        initialStatus: "ringing",
      };

      // 1. Immediately set active call as OUTGOING on caller side
      setActiveCall(newCallData);

      // 2. Broadcast to other tabs / devices
      const callPayload = {
        type: "CALL_INITIATED",
        tabId: tabIdRef.current,
        callId: tempCallId,
        connectionId,
        medium,
        caller: {
          id: myId,
          pseudonym: myPseudonym,
          portrait: state.me?.profile?.portrait ?? 0,
          photo: state.me?.profile?.photo,
        },
        receiverId: peer?.id,
        receiverName: peer?.pseudonym || "Match",
        timestamp: Date.now(),
      };

      try {
        const bc = new BroadcastChannel("jm_calls_channel");
        bc.postMessage(callPayload);
      } catch {}

      try {
        localStorage.setItem("jm_last_call_event", JSON.stringify({ ...callPayload, _salt: Math.random() }));
      } catch {}

      // 3. Dispatch real backend API call
      const callRes = await callsService.initiateCall(connectionId, medium).catch((err) => {
        console.warn("[JM Start Call API note]:", err.message);
        return null;
      });

      if (callRes?.id) {
        setActiveCall((prev) => (prev && prev.id === tempCallId ? { ...prev, id: callRes.id } : prev));
        const updatedPayload = { ...callPayload, callId: callRes.id };
        try { new BroadcastChannel("jm_calls_channel").postMessage(updatedPayload); } catch {}
        try { localStorage.setItem("jm_last_call_event", JSON.stringify({ ...updatedPayload, _salt: Math.random() })); } catch {}
      }
    } catch (err) {
      showToast(err.message || "Could not start call.");
    }
  };

  const endActiveCall = () => {
    setActiveCall(null);
  };

  const navigate = (route) => {
    const cleanRoute = String(route || "").replace(/^#?\/?/, "");
    const target = cleanRoute || "discover";
    const fullPath = `/${target}`;
    if (window.location.pathname !== fullPath) {
      window.history.pushState({}, "", fullPath);
    }
    setActiveRoute(target);
  };

  const showToast = (message, type = "info", options = {}) => {
    if (!message) return;
    setToastMessage(message);

    const defaultOptions = {
      position: "top-right",
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      ...options,
    };

    const msgStr = String(message);
    const msgLower = msgStr.toLowerCase();

    if (type === "success") {
      toast.success(message, defaultOptions);
    } else if (type === "error") {
      toast.error(message, defaultOptions);
    } else if (type === "warn" || type === "warning") {
      toast.warn(message, defaultOptions);
    } else {
      if (
        msgLower.includes("error") ||
        msgLower.includes("failed") ||
        msgLower.includes("invalid") ||
        msgLower.includes("denied") ||
        msgStr.includes("🔴")
      ) {
        toast.error(message, defaultOptions);
      } else if (
        msgLower.includes("success") ||
        msgLower.includes("welcome") ||
        msgLower.includes("verified") ||
        msgLower.includes("saved") ||
        msgStr.includes("✨") ||
        msgStr.includes("🔒") ||
        msgStr.includes("📸")
      ) {
        toast.success(message, defaultOptions);
      } else if (
        msgLower.includes("warning") ||
        msgLower.includes("caution") ||
        msgLower.includes("expired")
      ) {
        toast.warn(message, defaultOptions);
      } else {
        toast.info(message, defaultOptions);
      }
    }
  };

  const openModal = (title, content) => {
    setModalContent({ title, content });
  };

  const closeModal = () => {
    setModalContent(null);
  };

  const triggerSound = () => {
    playSound(state.prefs?.sound);
  };

  // Auth actions
  const onLoginSuccess = async (account, token, refreshToken) => {
    if (token) {
      setStoredTokens(token, refreshToken);
    }

    const accountProfile = account?.profile || {};
    const displayName =
      account?.pseudonym ||
      accountProfile.pseudonym ||
      account?.name ||
      account?.email ||
      "Member";

    showToast(`Welcome back, ${displayName}! 👋`, "success");

    setState((prev) => {
      const updated = {
        ...prev,
        authenticated: true,
        me: {
          ...prev.me,
          id: account?.id || prev.me.id,
          email: account?.email || prev.me.email,
          account: account || prev.me.account,
          profile: {
            ...prev.me.profile,
            ...accountProfile,
            pseudonym:
              account?.pseudonym ||
              accountProfile.pseudonym ||
              prev.me.profile?.pseudonym ||
              prev.me.pseudonym,
          },
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Update active route directly to discover
    const target = "discover";
    if (window.location.pathname !== `/${target}`) {
      window.history.pushState({}, "", `/${target}`);
    }
    setActiveRoute(target);

    try {
      const meData = await profileService.getMe();
      if (meData) {
        setState((prev) => {
          const updated = {
            ...prev,
            authenticated: true,
            me: {
              ...prev.me,
              id: meData.account?.id || prev.me.id,
              email: meData.account?.email || prev.me.email,
              account: meData.account || prev.me.account,
              revision: meData.revision || prev.me.revision || 1,
              profile: {
                ...prev.me.profile,
                ...(meData.profile || {}),
              },
            },
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch {}
  };

  const logout = async () => {
    // 1. Immediately clear local session and credentials
    clearStoredTokens();
    setState((prev) => {
      const updated = {
        ...prev,
        authenticated: false,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    closeModal();
    showToast("Signed out.");

    // 2. Immediately redirect to signin
    navigate("signin");

    // 3. Notify backend in the background
    try {
      authService.logout().catch(() => {});
    } catch {}
  };

  const switchDemoActor = (actorId, stayOnRoute = false) => {
    const actor = demoActors.find((a) => a.id === actorId);
    if (!actor) return;
    setState((prev) => {
      let updatedConns = prev.connections || [];
      if (actor.id === "jm-member-2") {
        // Leo's perspective: conn-1 peer is Maya
        updatedConns = updatedConns.map((c) =>
          c.id === "conn-1"
            ? {
                ...c,
                peer: {
                  id: "jm-member-1",
                  pseudonym: "Maya",
                  portrait: 0,
                  isBot: false,
                },
              }
            : c
        );
      } else if (actor.id === "jm-member-1") {
        // Maya's perspective: conn-1 peer is Leo
        updatedConns = updatedConns.map((c) =>
          c.id === "conn-1"
            ? {
                ...c,
                peer: {
                  id: "jm-member-2",
                  pseudonym: "Leo",
                  portrait: 1,
                  isBot: false,
                },
              }
            : c
        );
      }

      return {
        ...prev,
        authenticated: true,
        connections: updatedConns,
        me: {
          ...prev.me,
          id: actor.id,
          email: `${actor.name.toLowerCase()}@demo.invalid`,
          profile: {
            ...prev.me.profile,
            pseudonym: actor.name,
          },
        },
      };
    });
    showToast(`Switched view to ${actor.name}`);
    if (!stayOnRoute) {
      navigate("discover");
    }
  };


  // Swiping / Matching
  const swipeProfile = (profileId, action) => {
    const profile = state.discoverProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    if (action === "like") triggerSound();

    setState((prev) => {
      const updatedProfiles = prev.discoverProfiles.map((p) =>
        p.id === profileId ? { ...p, swipe: action } : p
      );

      let updatedConnections = prev.connections;
      let isMatch = false;
      let newConnId = null;

      if (action === "like") {
        isMatch = true;
        newConnId = "conn-" + Date.now();
        updatedConnections = [
          {
            id: newConnId,
            state: "active",
            myConsent: true,
            peerConsent: true,
            peer: {
              id: profile.id,
              pseudonym: profile.pseudonym,
              portrait: profile.portrait,
              isBot: profile.isBot,
            },
            lastMessage: {
              body: "You both expressed curiosity. A conversation can now begin.",
              created_at: new Date().toISOString(),
            },
          },
          ...prev.connections,
        ];
      }

      return {
        ...prev,
        discoverProfiles: updatedProfiles,
        connections: updatedConnections,
      };
    });

    if (action === "like") {
      openModal(
        "A mutual spark.",
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p>You and {profile.pseudonym} both expressed curiosity. Choose whether to open a conversation.</p>
          <div className="buttonbar">
            <button
              className="button primary"
              onClick={() => {
                closeModal();
                navigate("chat/conn-" + profile.id);
              }}
            >
              Open conversation
            </button>
            <button className="button quiet" onClick={closeModal}>
              Keep exploring
            </button>
          </div>
        </div>
      );
    } else if (action === "save") {
      showToast("Saved. Find them in the Saved filter.");
    } else {
      showToast("Passed. Take your time.");
    }
  };

  // Messaging
  const sendMessage = (connectionId, text) => {
    if (!text.trim()) return;
    triggerSound();
    const newMsg = {
      id: "msg-" + Date.now(),
      sender: state.me.id,
      kind: "text",
      body: text.trim(),
      created_at: new Date().toISOString(),
    };

    setState((prev) => {
      const connMessages = prev.messages[connectionId] || [];
      const updatedConnections = prev.connections.map((c) =>
        c.id === connectionId
          ? {
              ...c,
              lastMessage: {
                body: text.trim(),
                created_at: new Date().toISOString(),
              },
            }
          : c
      );

      return {
        ...prev,
        messages: {
          ...prev.messages,
          [connectionId]: [...connMessages, newMsg],
        },
        connections: updatedConnections,
      };
    });
  };

  const giveChatConsent = (connectionId) => {
    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId
          ? { ...c, myConsent: true, state: "active" }
          : c
      ),
    }));
    showToast("Conversation opened with mutual consent.");
  };

  // Profile update with Optimistic Concurrency Control (OCC)
  const updateProfile = async (newProfile) => {
    const currentRev = state.me.revision || 1;
    try {
      const res = await profileService.updateProfile(currentRev, newProfile);
      setState((prev) => ({
        ...prev,
        me: {
          ...prev.me,
          profile: {
            ...prev.me.profile,
            ...(res?.profile || newProfile),
          },
          revision: res?.revision || (prev.me.revision + 1),
        },
      }));
      showToast("Your profile and preferences are saved.");
      return res;
    } catch (err) {
      showToast(err.message || "Failed to update profile.");
      throw err;
    }
  };

  // Delete Account
  const deleteAccount = async (reason = "Member request") => {
    try {
      await profileService.deleteAccount(reason);
      setState((prev) => ({
        ...prev,
        authenticated: false,
      }));
      closeModal();
      showToast("Account deleted.");
      navigate("signin");
    } catch (err) {
      showToast(err.message || "Failed to delete account.");
      throw err;
    }
  };

  // Desires update
  const updateDesires = (answers) => {
    setState((prev) => ({
      ...prev,
      desires: {
        ...prev.desires,
        answers: {
          ...prev.desires.answers,
          ...answers,
        },
        revision: prev.desires.revision + 1,
      },
    }));
    showToast("Your answers are saved privately.");
  };

  // Travel plans
  const addPassportPlan = (city, start, end) => {
    const newPlan = {
      id: "plan-" + Date.now(),
      data: {
        city,
        start,
        end,
        timeZone: "UTC",
        visibility: "private",
      },
      city: {
        name: city,
        timeZone: "UTC",
      },
      revision: 1,
    };
    setState((prev) => ({
      ...prev,
      passportPlans: [newPlan, ...prev.passportPlans],
    }));
    showToast("Private travel plan saved.");
  };

  const toggleTravelVisibility = (planId) => {
    setState((prev) => ({
      ...prev,
      passportPlans: prev.passportPlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              data: {
                ...p.data,
                visibility: p.data.visibility === "city" ? "private" : "city",
              },
            }
          : p
      ),
    }));
    showToast("Travel visibility updated.");
  };

  const removeTravelPlan = (planId) => {
    setState((prev) => ({
      ...prev,
      passportPlans: prev.passportPlans.filter((p) => p.id !== planId),
    }));
    showToast("Travel plan removed.");
  };

  // Events RSVP
  const toggleEventRsvp = (eventId, nextState) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, rsvp: nextState } : e
      ),
    }));
    showToast(nextState === "confirmed" ? "RSVP confirmed!" : "RSVP cancelled.");
  };

  // Settings update
  const updateSettings = (newPrefs) => {
    setState((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        ...newPrefs,
      },
    }));
    showToast("Your preferences and notifications are saved. ✨");
  };

  // Policy consent
  const togglePolicyConsent = (policyId, accepted) => {
    setState((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === policyId ? { ...p, accepted } : p
      ),
    }));
    showToast(accepted ? "Policy accepted." : "Consent withdrawn.");
  };

  // Activate Boost
  const activateBoost = () => {
    if (state.wallet.balance <= 0) {
      showToast("No boost credits available.");
      return;
    }
    setState((prev) => ({
      ...prev,
      wallet: { ...prev.wallet, balance: prev.wallet.balance - 1 },
    }));
    showToast("Boost activated! Your profile visibility has been heightened.");
  };

  // Currency select
  const setCurrency = (curr) => {
    setState((prev) => ({ ...prev, selectedCurrency: curr }));
  };

  // Simulated purchase
  const simulatePurchase = (sku, outcome) => {
    if (outcome === "approved") {
      setState((prev) => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          balance: prev.wallet.balance + (sku.startsWith("boost") ? 5 : 1),
        },
        purchaseRecords: [
          {
            id: "rec-" + Date.now(),
            documentType: sku.includes("month") ? "Subscription Access" : "Add-on Purchase",
            created_at: new Date().toISOString(),
            amount_cents: initialCatalog.prices[state.selectedCurrency || "USD"][sku] || 1999,
            currency: state.selectedCurrency || "USD",
            state: "completed",
            isTaxInvoice: false,
          },
          ...prev.purchaseRecords,
        ],
      }));
      showToast("Simulated purchase approved! Access granted.");
    } else {
      showToast(`Simulated purchase outcome: ${outcome}`);
    }
    closeModal();
  };

  // Notifications read
  const markNotificationRead = (notifId) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n
      ),
    }));
  };

  // Block Member (POST /v1/block + cascading state cleanup)
  const blockMember = async (targetId) => {
    if (!targetId) return;
    try {
      const res = await blockService.blockMember(targetId);

      // Cascading platform actions:
      // 1. Filter out from mutual connections
      // 2. Filter out from discover profiles
      setState((prev) => ({
        ...prev,
        connections: (prev.connections || []).filter(
          (c) => c.peer?.id !== targetId && c.id !== targetId
        ),
        discoverProfiles: (prev.discoverProfiles || []).filter((p) => p.id !== targetId),
      }));

      // 3. Forcibly end any live calls if connected with blocked member
      if (
        activeCallRef.current &&
        (activeCallRef.current.peer?.id === targetId ||
          activeCallRef.current.connectionId === targetId)
      ) {
        setActiveCall(null);
      }

      showToast("Member blocked.");
      return res;
    } catch (err) {
      showToast(err.message || "Failed to block member.");
      throw err;
    }
  };

  const value = {
    state,
    activeRoute,
    navigate,
    toastMessage,
    showToast,
    modalContent,
    openModal,
    closeModal,
    activeFilter,
    setActiveFilter,
    onLoginSuccess,
    logout,
    switchDemoActor,
    swipeProfile,
    sendMessage,
    giveChatConsent,
    updateProfile,
    updateDesires,
    addPassportPlan,
    toggleTravelVisibility,
    removeTravelPlan,
    toggleEventRsvp,
    updateSettings,
    togglePolicyConsent,
    activateBoost,
    setCurrency,
    simulatePurchase,
    markNotificationRead,
    triggerSound,
    activeCall,
    setActiveCall,
    startCall,
    endActiveCall,
    blockMember,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
