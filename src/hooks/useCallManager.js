import { useState, useEffect, useRef, useCallback } from "react";
import { callsService } from "../services/callsService";
import { socketService } from "../services/socketService";
import { playSound } from "../utils/formatters";

export function useCallManager({ state, showToast }) {
  const [activeCall, setActiveCall] = useState(null);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState(null);
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

    const handleStorage = (event) => {
      if (event.key === "jm_last_call_event" && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (!data || !data.type) return;
          if (data.tabId && data.tabId === tabIdRef.current) return;

          if (data.type === "CALL_INITIATED" && !isCallFromMe(data) && isCallForMe(data)) {
            if (!activeCallRef.current) {
              setActiveCall({
                id: data.callId || `call-${Date.now()}`,
                connectionId: data.connectionId,
                medium: data.medium || "audio",
                peer: data.caller || { pseudonym: data.callerName || "Match", id: data.callerId },
                isIncoming: true,
                initialStatus: "ringing",
              });
            }
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
      }
    };
    window.addEventListener("storage", handleStorage);

    // ── Real-Time Socket.io Master Integration ──────────────────────────────
    if (state.authenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    const unCallInc = socketService.on("call:incoming", (data) => {
      if (activeCallRef.current) return;

      const connId = data.connectionId || data.connection_id;
      const callerObj = data.caller || {};
      const callerId = callerObj.id || data.callerId || data.caller_id;
      const callerName = callerObj.pseudonym || callerObj.name || data.callerName || "Match";

      setActiveCall({
        id: data.callId || data.id || `call-${Date.now()}`,
        connectionId: connId,
        medium: data.kind || data.medium || "audio",
        peer: {
          id: callerId,
          pseudonym: callerName,
          portrait: callerObj.avatarUrl || callerObj.portrait || callerObj.photo,
          photo: callerObj.photo || callerObj.avatarUrl,
        },
        isIncoming: true,
        initialStatus: "ringing",
        state: "invited",
        caller: callerId,
      });

      try {
        playSound("call");
      } catch {}
    });

    const unCallAcc = socketService.on("call:accepted", (data) => {
      if (activeCallRef.current) {
        setActiveCall((prev) => (prev ? { ...prev, state: "accepted", initialStatus: "connected" } : null));
      }
    });

    const unCallDec = socketService.on("call:declined", (data) => {
      if (activeCallRef.current) {
        showToast("Call declined");
        setActiveCall(null);
      }
    });

    const unCallEnd = socketService.on("call:ended", (data) => {
      if (activeCallRef.current) {
        showToast("Call ended");
        setActiveCall(null);
      }
    });

    // Low-frequency 30s background fallback check for missed calls
    const pollTimer = setInterval(async () => {
      if (document.hidden || activeCallRef.current || socketService.isConnected) return;
      try {
        const isRinging = (s) => {
          const str = String(s || "").toLowerCase();
          return str === "ringing" || str === "invited" || str === "initiated" || str === "calling" || str === "pending" || str === "active";
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

        const activeRes = await callsService.getCalls().catch(() => null);
        const activeList = parseList(activeRes);

        if (activeList.length > 0) {
          const found = activeList.find((c) => isRinging(c.state || c.status) && isCallForMe(c) && !isCallFromMe(c));
          if (found && !activeCallRef.current) {
            const connId = found.connectionId || found.connection_id;
            setActiveCall({
              id: found.id,
              connectionId: connId,
              medium: found.medium || "audio",
              peer: buildPeer(found, connId),
              isIncoming: true,
              initialStatus: "ringing",
              state: found.state || "invited",
              caller: found.caller || found.caller_id,
              receiver: found.receiver || found.receiver_id,
            });
            return;
          }
        }
      } catch {}
    }, 30000);

    return () => {
      if (callsChannel) {
        try { callsChannel.close(); } catch {}
      }
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollTimer);
      unCallInc();
      unCallAcc();
      unCallDec();
      unCallEnd();
    };
  }, [state.authenticated, isCallFromMe, isCallForMe, showToast, state.connections]);

  // Global Start Call (Outgoing) with Pre-Authorization Credit Verification
  const startCall = async (arg1, medium = "audio", peer = null) => {
    try {
      const connectionId = typeof arg1 === "object" && arg1 !== null ? (arg1.connectionId || arg1.id) : arg1;
      const actualMedium = typeof arg1 === "object" && arg1 !== null ? (arg1.medium || arg1.mode || medium) : medium;
      const actualPeer = typeof arg1 === "object" && arg1 !== null ? (arg1.peer || peer) : peer;

      const cleanConnId = (connectionId && connectionId !== "undefined" && connectionId !== "null") ? String(connectionId).trim() : null;
      if (!cleanConnId) {
        showToast("Valid connection is required to start a call.");
        return;
      }

      const isVideo = actualMedium === "video";
      const requiredCredits = isVideo ? 15 : 5;
      const currentCredits = state.wallet?.featureCredits !== undefined ? Number(state.wallet.featureCredits) : 0;

      // 1. Pre-authorization check (>= 5 FC audio, >= 15 FC video)
      if (currentCredits < requiredCredits) {
        setInsufficientCreditsData({
          medium: actualMedium,
          requiredCredits,
          currentCredits,
          connectionId: cleanConnId,
          peer: actualPeer,
        });
        showToast(`⚠️ You need at least ${requiredCredits} FC for ${isVideo ? "Video" : "Voice"} Call.`, "warning");
        return;
      }

      const myId = state.me?.id || state.me?.account?.id || state.me?.accountId || state.me?.user?.id || "";
      const myPseudonym = state.me?.profile?.pseudonym || state.me?.account?.profile?.pseudonym || state.me?.pseudonym || "You";

      showToast(`Calling ${actualPeer?.pseudonym || "Match"}…`);
      const tempCallId = `call-${Date.now()}`;

      const newCallData = {
        id: tempCallId,
        connectionId: cleanConnId,
        medium: actualMedium,
        peer: actualPeer || { pseudonym: "Match" },
        isIncoming: false,
        initialStatus: "ringing",
      };

      // Set active call as OUTGOING on caller side
      setActiveCall(newCallData);

      // Broadcast to other tabs / devices
      const callPayload = {
        type: "CALL_INITIATED",
        tabId: tabIdRef.current,
        callId: tempCallId,
        connectionId: cleanConnId,
        medium: actualMedium,
        caller: {
          id: myId,
          pseudonym: myPseudonym,
          portrait: state.me?.profile?.portrait ?? 0,
          photo: state.me?.profile?.photo,
        },
        receiverId: actualPeer?.id,
        receiverName: actualPeer?.pseudonym || "Match",
        timestamp: Date.now(),
      };

      try {
        const bc = new BroadcastChannel("jm_calls_channel");
        bc.postMessage(callPayload);
      } catch {}

      try {
        localStorage.setItem("jm_last_call_event", JSON.stringify({ ...callPayload, _salt: Math.random() }));
      } catch {}

      // Dispatch real backend API call
      try {
        const callRes = await callsService.initiateCall(cleanConnId, actualMedium);
        const realId = callRes?.id || callRes?.data?.id;
        if (realId) {
          setActiveCall((prev) =>
            prev
              ? {
                  ...prev,
                  ...(callRes || {}),
                  id: realId,
                  state: callRes?.state || "invited",
                }
              : prev
          );
          const updatedPayload = { ...callPayload, callId: realId };
          try { new BroadcastChannel("jm_calls_channel").postMessage(updatedPayload); } catch {}
          try { localStorage.setItem("jm_last_call_event", JSON.stringify({ ...updatedPayload, _salt: Math.random() })); } catch {}
        }
      } catch (err) {
        console.warn("[JM Start Call API note]:", err.message);
        // Check for 402 Insufficient Balance
        if (err.status === 402 || err.data?.code === 402 || err.message?.toLowerCase().includes("credit")) {
          setActiveCall(null);
          setInsufficientCreditsData({
            medium: actualMedium,
            requiredCredits: err.data?.details?.required || requiredCredits,
            currentCredits: err.data?.details?.current || currentCredits,
            connectionId: cleanConnId,
            peer: actualPeer,
          });
        }
      }
    } catch (err) {
      showToast(err.message || "Could not start call.");
    }
  };

  const endActiveCall = () => {
    setActiveCall(null);
  };

  return {
    activeCall,
    setActiveCall,
    activeCallRef,
    insufficientCreditsData,
    setInsufficientCreditsData,
    startCall,
    endActiveCall,
  };
}
