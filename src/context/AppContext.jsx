import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { demoActors } from "../data/seedData";
import { playSound } from "../utils/formatters";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { chatService } from "../services/chatService";
import { blockService } from "../services/blockService";
import { billingService } from "../services/billingService";
import {
  setStoredTokens,
  clearStoredTokens,
  getCurrentUserIdFromToken,
} from "../services/api";
import { getInitialAppState, STORAGE_KEY } from "./initialState";
import { useAppRouting } from "../hooks/useAppRouting";
import { useCallManager } from "../hooks/useCallManager";
import { useLiveStreamManager } from "../hooks/useLiveStreamManager";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, setState] = useState(getInitialAppState);

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
    const handleSessionExpired = () => {
      setState((prev) => ({ ...prev, authenticated: false }));
      showToast("Session expired. Please sign in again.");
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

  // Load real profile, connections & subscription from API on auth
  useEffect(() => {
    if (!state.authenticated) return;
    let cancelled = false;
    const loadRealData = async () => {
      try {
        const [meData, connRes, billingRes] = await Promise.allSettled([
          profileService.getMe(),
          chatService.getConnections(),
          billingService.getBillingState(),
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
            wallet: {
              ...prev.wallet,
              featureCredits: b.featureCredits ?? prev.wallet?.featureCredits ?? 100,
              aiCredits: b.aiCredits ?? prev.wallet?.aiCredits ?? 20,
              balance: b.balance ?? prev.wallet?.balance ?? 0,
            },
            subscription: b.subscription || prev.subscription,
          }));
        }
      } catch {}
    };
    loadRealData();
    return () => { cancelled = true; };
  }, [state.authenticated]);

  const triggerSound = () => {
    playSound(state.prefs?.sound);
  };

  const updateWallet = (newWalletData) => {
    setState((prev) => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        ...newWalletData,
      },
    }));
  };

  const refreshWallet = async () => {
    try {
      const bRes = await billingService.getBillingState();
      if (bRes) {
        setState((prev) => ({
          ...prev,
          wallet: {
            ...prev.wallet,
            featureCredits: bRes.featureCredits ?? prev.wallet?.featureCredits ?? 100,
            aiCredits: bRes.aiCredits ?? prev.wallet?.aiCredits ?? 20,
            balance: bRes.balance ?? prev.wallet?.balance ?? 0,
          },
          subscription: bRes.subscription || prev.subscription,
        }));
      }
    } catch {}
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
    triggerSound,
    activeCall,
    setActiveCall,
    startCall,
    endActiveCall,
    insufficientCreditsData,
    setInsufficientCreditsData,
    updateWallet,
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
