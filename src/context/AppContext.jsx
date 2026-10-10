import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { demoActors, initialMe } from "../data/seedData";
import { playSound } from "../utils/formatters";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { chatService } from "../services/chatService";
import { blockService } from "../services/blockService";
import { billingService } from "../services/billingService";
import { preferenceService } from "../services/preferenceService";
import { notificationService } from "../services/notificationService";
import { socketService } from "../services/socketService";
import {
  setStoredTokens,
  clearStoredTokens,
  getCurrentUserIdFromToken,
} from "../services/api";
import { getInitialAppState, STORAGE_KEY } from "./initialState";
import { normalizePlanKey, getPlanDisplayName } from "../utils/planUtils";
import { useAppRouting } from "../hooks/useAppRouting";
import { useCallManager } from "../hooks/useCallManager";
import { useLiveStreamManager } from "../hooks/useLiveStreamManager";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, setState] = useState(getInitialAppState);
  const justLoggedInAtRef = useRef(0);

  // Dedicated App Routing, Modals, and Toasts Hook
  const {
    activeRoute,
    setActiveRoute,
    navigate,
    toastMessage,
    showToast,
    modalContent,
    openModal,
    closeModal,
    activeFilter,
    setActiveFilter,
  } = useAppRouting({ authenticated: state.authenticated });

  // Dedicated Call Management Hook
  const {
    activeCall,
    setActiveCall,
    activeCallRef,
    insufficientCreditsData,
    setInsufficientCreditsData,
    startCall,
    endActiveCall,
  } = useCallManager({ state, showToast });

  // Dedicated Live Stream Management Hook
  const {
    activeLiveStreams,
    activeLiveStreamModal,
    openLiveStream,
    closeLiveStream,
    isPeerLive,
    refreshLiveStreams,
  } = useLiveStreamManager({
    authenticated: state.authenticated,
    me: state.me,
    showToast,
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Listen for session expiry from API interceptor
  useEffect(() => {
    const handleSessionExpired = (e) => {
      clearStoredTokens();
      setState((prev) => ({
        ...prev,
        authenticated: false,
        me: initialMe,
        discoverProfiles: [],
        connections: [],
      }));
      const msg = e?.detail?.message || "Session expired. Please sign in again.";
      showToast(msg, "info");
      navigate("signin");
    };
    window.addEventListener("jm-session-expired", handleSessionExpired);
    return () => window.removeEventListener("jm-session-expired", handleSessionExpired);
  }, [navigate, showToast]);

  // Apply reduced motion
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      Boolean(state.prefs?.reducedMotion)
    );
  }, [state.prefs?.reducedMotion]);

  // Load real profile, connections, subscription, notifications & preferences from API on auth
  useEffect(() => {
    if (!state.authenticated) return;
    let cancelled = false;
    const loadRealData = async () => {
      try {
        const [meData, connRes, billingRes, notifRes, unreadRes, prefRes] = await Promise.allSettled([
          profileService.getMe(),
          chatService.getConnections(),
          billingService.getBillingState(),
          notificationService.getNotifications({ limit: 50 }),
          notificationService.getUnreadCount(),
          notificationService.getPreferences(),
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
            const normalizedItems = items.map((c) => {
              const validId = c.id || c.connectionId || c.connection_id;
              return { ...c, id: validId, connectionId: validId };
            });
            setState((prev) => ({ ...prev, connections: normalizedItems }));
          }
        }

        if (billingRes.status === "fulfilled" && billingRes.value) {
          const b = billingRes.value;
          setState((prev) => ({
            ...prev,
            wallet: extractWallet(b, prev.wallet),
            subscription: extractSubscription(b, prev.subscription),
          }));
        }

        // Notifications & unread badge
        let loadedItems = [];
        let loadedUnread = 0;
        if (notifRes.status === "fulfilled" && notifRes.value) {
          const rawNotifs = notifRes.value;
          loadedItems = Array.isArray(rawNotifs)
            ? rawNotifs
            : rawNotifs?.items || rawNotifs?.data?.items || rawNotifs?.data || [];
          loadedUnread =
            typeof rawNotifs?.unreadCount === "number"
              ? rawNotifs.unreadCount
              : loadedItems.filter((n) => !n.read_at && !n.read).length;
        }

        if (unreadRes.status === "fulfilled" && typeof unreadRes.value?.unreadCount === "number") {
          loadedUnread = unreadRes.value.unreadCount;
        }

        setState((prev) => ({
          ...prev,
          notifications: Array.isArray(loadedItems) ? loadedItems : prev.notifications,
          unreadNotificationCount: loadedUnread,
        }));

        // Notification Preferences
        if (prefRes.status === "fulfilled" && prefRes.value) {
          const p = prefRes.value?.preferences || prefRes.value?.data || prefRes.value;
          if (p && typeof p === "object") {
            setState((prev) => ({
              ...prev,
              prefs: {
                ...prev.prefs,
                ...p,
              },
            }));
          }
        }
      } catch (err) {
        console.warn("[AppContext] Initial loadRealData warning:", err.message);
      }
    };
    loadRealData();
    return () => { cancelled = true; };
  }, [state.authenticated]);

  // Real-time Notification Socket Listener (notification:received & notification:badge_update)
  useEffect(() => {
    if (!state.authenticated) return;

    // Connect socket if not yet connected
    socketService.connect();

    // 1. Handle incoming notification pushed by backend
    const handleNewNotification = (rawPayload) => {
      if (!rawPayload) return;
      const notif = rawPayload.notification || rawPayload.data || rawPayload;
      if (!notif || (!notif.id && !notif.title)) return;

      console.log("🔔 [JM Socket] Real-time notification received:", notif);

      // Play subtle chime sound
      playSound(state.prefs?.sound !== false);

      // Prepend to notifications list & increment unread counter
      setState((prev) => {
        const currentList = prev.notifications || [];
        const exists = currentList.some((item) => item.id === notif.id);
        const nextList = exists ? currentList : [notif, ...currentList];
        const nextUnread = typeof prev.unreadNotificationCount === "number"
          ? prev.unreadNotificationCount + (exists ? 0 : 1)
          : nextList.filter((n) => !n.read_at && !n.read).length;
        return {
          ...prev,
          notifications: nextList,
          unreadNotificationCount: nextUnread,
        };
      });

      // Suppress redundant security popup toast if user literally just signed in on this client (avoid double toast with "Welcome back")
      const isRecentSelfLogin =
        Date.now() - justLoggedInAtRef.current < 6000 &&
        (notif.category === "security" ||
          (typeof notif.title === "string" && notif.title.toLowerCase().includes("login")));

      if (!isRecentSelfLogin) {
        // Display rich in-app toast preview with deep-link navigation
        const toastTitle = notif.title || "New Notification";
        const toastSnippet = notif.body ? ` — ${notif.body}` : "";
        showToast(`${toastTitle}${toastSnippet}`, "info", {
          onClick: () => {
            if (notif.id) {
              notificationService.markNotificationRead(notif.id).catch(() => {});
              markNotificationRead(notif.id);
            }
            if (notif.route) {
              navigate(notif.route.replace(/^\//, ""));
            }
          },
        });
      }
    };

    // 2. Handle badge update pushed by backend
    const handleBadgeUpdate = (data) => {
      const count =
        typeof data?.unreadCount === "number"
          ? data.unreadCount
          : typeof data?.count === "number"
          ? data.count
          : typeof data === "number"
          ? data
          : null;
      if (count !== null) {
        console.log("🔢 [JM Socket] Notification badge updated:", count);
        setState((prev) => ({
          ...prev,
          unreadNotificationCount: Math.max(0, count),
        }));
      }
    };

    const unsubRecv = socketService.on("notification:received", handleNewNotification);
    const unsubNew = socketService.on("notification:new", handleNewNotification);
    const unsubBadge = socketService.on("notification:badge_update", handleBadgeUpdate);
    const unsubCount = socketService.on("notification:count", handleBadgeUpdate);

    return () => {
      unsubRecv();
      unsubNew();
      unsubBadge();
      unsubCount();
    };
  }, [state.authenticated, state.prefs?.sound, navigate, showToast]);

  const triggerSound = () => {
    playSound(state.prefs?.sound);
  };

  const extractWallet = (b, prevWallet = {}) => {
    if (!b) return prevWallet;
    const raw = b?.data || b?.billing || b;
    const walletObj = raw?.wallet || raw;

    let fc = undefined;
    if (walletObj.featureCredits !== undefined) fc = walletObj.featureCredits;
    else if (walletObj.feature_credits !== undefined) fc = walletObj.feature_credits;
    else if (walletObj.fc !== undefined) fc = walletObj.fc;
    else if (raw.featureCredits !== undefined) fc = raw.featureCredits;
    else if (raw.feature_credits !== undefined) fc = raw.feature_credits;
    else if (raw.credits !== undefined && typeof raw.credits === "number") fc = raw.credits;

    let ai = undefined;
    if (walletObj.aiCredits !== undefined) ai = walletObj.aiCredits;
    else if (walletObj.ai_credits !== undefined) ai = walletObj.ai_credits;
    else if (walletObj.ai !== undefined) ai = walletObj.ai;
    else if (raw.aiCredits !== undefined) ai = raw.aiCredits;
    else if (raw.ai_credits !== undefined) ai = raw.ai_credits;

    let bal = undefined;
    if (walletObj.balance !== undefined) bal = walletObj.balance;
    else if (raw.balance !== undefined) bal = raw.balance;

    return {
      featureCredits: fc !== undefined ? Number(fc) : (prevWallet.featureCredits ?? 0),
      aiCredits: ai !== undefined ? Number(ai) : (prevWallet.aiCredits ?? 0),
      balance: bal !== undefined ? Number(bal) : (prevWallet.balance ?? 0),
    };
  };

  const extractSubscription = (b, prevSub = {}) => {
    if (!b) return prevSub;
    const raw = b?.data || b?.billing || b;
    const subObj = raw?.subscription || raw?.sub || raw?.plan || b;

    const candidatePlan =
      (typeof subObj === "string" ? subObj : null) ||
      subObj?.planKey ||
      subObj?.plan_key ||
      (typeof subObj?.plan === "string" ? subObj.plan : subObj?.plan?.id || subObj?.plan?.planKey || subObj?.plan?.name) ||
      subObj?.planId ||
      subObj?.plan_id ||
      subObj?.tier ||
      subObj?.tier_name ||
      subObj?.sku ||
      subObj?.name ||
      raw?.planKey ||
      raw?.plan_key ||
      (typeof raw?.plan === "string" ? raw.plan : raw?.plan?.id || raw?.plan?.planKey || raw?.plan?.name) ||
      raw?.planId ||
      raw?.plan_id ||
      raw?.tier ||
      raw?.membership ||
      b?.plan ||
      b?.tier;

    if (!candidatePlan && prevSub?.planKey && prevSub.planKey !== "explore") {
      return prevSub;
    }

    const key = normalizePlanKey(candidatePlan || prevSub?.planKey || "explore");
    const subResult = typeof subObj === "object" && subObj !== null ? { ...prevSub, ...subObj } : { ...prevSub };

    return {
      ...subResult,
      planKey: key,
      plan: candidatePlan || key,
      name: subObj?.name || getPlanDisplayName(key),
      status: subObj?.status || "active",
    };
  };

  const updateWallet = (newWalletData) => {
    setState((prev) => {
      const delta = typeof newWalletData === "function" ? newWalletData(prev.wallet) : newWalletData;
      return {
        ...prev,
        wallet: {
          ...prev.wallet,
          ...delta,
        },
      };
    });
  };

  const updateSubscription = (subData) => {
    setState((prev) => {
      const delta = typeof subData === "function" ? subData(prev.subscription) : subData;
      return {
        ...prev,
        subscription: extractSubscription(delta, prev.subscription),
      };
    });
  };

  const refreshWallet = async () => {
    try {
      const bRes = await billingService.getBillingState();
      if (bRes) {
        setState((prev) => ({
          ...prev,
          wallet: extractWallet(bRes, prev.wallet),
          subscription: extractSubscription(bRes, prev.subscription),
        }));
      }
    } catch {}
  };

  // Auth actions
  const onLoginSuccess = async (account, token, refreshToken, options = {}) => {
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

    if (!options.silent) {
      justLoggedInAtRef.current = Date.now();
      const msg = options.message || `Welcome back, ${displayName}! 👋`;
      showToast(msg, "success");
    }

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
    navigate("signin");

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
      let newConnId = null;

      if (action === "like") {
        newConnId = "conn-" + Date.now();
        updatedConnections = [
          {
            id: newConnId,
            connectionId: newConnId,
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
        c.id === connectionId || c.connectionId === connectionId
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

  const giveChatConsent = async (connectionId) => {
    const cleanId = (connectionId && connectionId !== "undefined" && connectionId !== "null") ? String(connectionId).trim() : null;
    if (!cleanId) return { ok: false };
    try {
      await chatService.giveConsent(cleanId, true);
    } catch (err) {
      console.warn("giveChatConsent note:", err.message);
    }
    setState((prev) => ({
      ...prev,
      connections: (prev.connections || []).map((c) => {
        const cId = c.id || c.connectionId;
        return cId === cleanId
          ? { ...c, myConsent: true, state: "active", peerConsent: true }
          : c;
      }),
    }));
    showToast("Conversation opened with mutual consent.");
    return { ok: true };
  };

  // Profile update with OCC
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

  // Settings update & backend preference persistence
  const updateSettings = async (newPrefs) => {
    setState((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        ...newPrefs,
      },
    }));
    showToast("Your preferences and notifications are saved. ✨");
    try {
      await notificationService.updatePreferences(newPrefs);
    } catch (err) {
      console.warn("[AppContext] updatePreferences API error:", err.message);
    }
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
            amount_cents: 1999,
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

  // ── Notification Module Actions ──────────────────────────────────────────────
  // 4.3 Mark Single Notification as Read
  const markNotificationRead = async (notifId) => {
    if (!notifId) return;
    setState((prev) => {
      const target = (prev.notifications || []).find((n) => n.id === notifId);
      const wasUnread = target && !target.read_at && !target.read;
      return {
        ...prev,
        notifications: (prev.notifications || []).map((n) =>
          n.id === notifId ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
        ),
        unreadNotificationCount: wasUnread
          ? Math.max(0, (prev.unreadNotificationCount || 1) - 1)
          : prev.unreadNotificationCount,
      };
    });

    try {
      const res = await notificationService.markNotificationRead(notifId);
      if (res && typeof res.unreadCount === "number") {
        setState((prev) => ({ ...prev, unreadNotificationCount: res.unreadCount }));
      }
    } catch (err) {
      console.warn("[AppContext] markNotificationRead API error:", err.message);
    }
  };

  // 4.4 Mark All Notifications as Read
  const markAllNotificationsRead = async () => {
    const nowIso = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => ({
        ...n,
        read_at: n.read_at || nowIso,
      })),
      unreadNotificationCount: 0,
    }));

    try {
      const res = await notificationService.markAllNotificationsRead();
      if (res && typeof res.unreadCount === "number") {
        setState((prev) => ({ ...prev, unreadNotificationCount: res.unreadCount }));
      }
    } catch (err) {
      console.warn("[AppContext] markAllNotificationsRead API error:", err.message);
    }
  };

  // 4.5 Dismiss / Delete Notification
  const deleteNotification = async (notifId) => {
    if (!notifId) return;
    let wasUnread = false;
    setState((prev) => {
      const target = (prev.notifications || []).find((n) => n.id === notifId);
      if (target && !target.read_at && !target.read) wasUnread = true;
      return {
        ...prev,
        notifications: (prev.notifications || []).filter((n) => n.id !== notifId),
        unreadNotificationCount: wasUnread
          ? Math.max(0, (prev.unreadNotificationCount || 1) - 1)
          : prev.unreadNotificationCount,
      };
    });

    try {
      const res = await notificationService.deleteNotification(notifId);
      if (res && typeof res.unreadCount === "number") {
        setState((prev) => ({ ...prev, unreadNotificationCount: res.unreadCount }));
      }
    } catch (err) {
      console.warn("[AppContext] deleteNotification API error:", err.message);
    }
  };

  // 4.1 Refresh Notification List
  const refreshNotifications = async (options = {}) => {
    try {
      const res = await notificationService.getNotifications(options);
      const items = Array.isArray(res) ? res : res?.items || [];
      const unreadCount = typeof res?.unreadCount === "number"
        ? res.unreadCount
        : items.filter((n) => !n.read_at && !n.read).length;
      setState((prev) => ({
        ...prev,
        notifications: items,
        unreadNotificationCount: unreadCount,
      }));
      return { items, unreadCount };
    } catch (err) {
      console.warn("[AppContext] refreshNotifications error:", err.message);
      return null;
    }
  };

  // 4.2 Refresh Unread Badge Counter
  const refreshUnreadNotificationCount = async () => {
    try {
      const { unreadCount } = await notificationService.getUnreadCount();
      setState((prev) => ({ ...prev, unreadNotificationCount: unreadCount }));
      return unreadCount;
    } catch {
      return 0;
    }
  };

  // 4.6 Send Test Email
  const sendTestEmail = async (payload) => {
    return await notificationService.sendTestEmail(payload);
  };

  // Block Member (POST /v1/block + cascading state cleanup)
  const blockMember = async (targetId) => {
    if (!targetId) return;
    try {
      const res = await blockService.blockMember(targetId);

      setState((prev) => ({
        ...prev,
        connections: (prev.connections || []).filter(
          (c) => c.peer?.id !== targetId && c.id !== targetId
        ),
        discoverProfiles: (prev.discoverProfiles || []).filter((p) => p.id !== targetId),
      }));

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
    deleteAccount,
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
    markAllNotificationsRead,
    deleteNotification,
    refreshNotifications,
    refreshUnreadNotificationCount,
    sendTestEmail,
    triggerSound,
    activeCall,
    setActiveCall,
    startCall,
    endActiveCall,
    insufficientCreditsData,
    setInsufficientCreditsData,
    updateWallet,
    updateSubscription,
    refreshWallet,
    blockMember,
    activeLiveStreams,
    activeLiveStreamModal,
    openLiveStream,
    closeLiveStream,
    isPeerLive,
    refreshLiveStreams,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
