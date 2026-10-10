import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent } from "livekit-client";
import { callsService } from "../services/callsService";
import { getCurrentUserIdFromToken } from "../services/api";
import { socketService } from "../services/socketService";

export function useCall(initialCall) {
  const [call, setCall] = useState(initialCall);
  const [room, setRoom] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callReceipt, setCallReceipt] = useState(null);

  const pollRef = useRef(null);
  const durationRef = useRef(null);
  const roomRef = useRef(null);
  const callIdRef = useRef(initialCall?.id);

  // Keep ref up to date
  useEffect(() => {
    callIdRef.current = call?.id;
  }, [call?.id]);

  // Sync initialCall if updated from parent
  useEffect(() => {
    if (initialCall && initialCall.id !== call?.id) {
      setCall(initialCall);
    }
  }, [initialCall]);

  const userId =
    getCurrentUserIdFromToken() ||
    JSON.parse(localStorage.getItem("jm_user") || "{}")?.id ||
    "me";

  // Derived state
  const isCaller =
    initialCall?.isIncoming === false ||
    (userId && String(call?.caller) === String(userId)) ||
    (!initialCall?.isIncoming && !call?.receiver);

  const isReceiver =
    initialCall?.isIncoming === true ||
    (userId && String(call?.receiver) === String(userId));

  const isVideo = call?.medium === "video";
  const isRinging = call?.state === "invited" || call?.state === "ringing";
  const isAccepted = ["accepted", "active", "connected"].includes(call?.state);
  const isTerminal = ["ended", "declined", "cancelled"].includes(call?.state);
  const isSimulated = call?.simulated === true;

  // Join LiveKit room
  const joinRoom = useCallback(async (callId) => {
    const idToUse = callId || callIdRef.current;
    if (!idToUse || joining || roomRef.current) return;
    setJoining(true);
    setError(null);

    try {
      const res = await callsService.getCallToken(idToUse);
      const url = res?.url || res?.data?.url || res?.serverUrl;
      const token = res?.token || res?.data?.token;
      const medium = res?.medium || res?.data?.medium || (isVideo ? "video" : "audio");

      if (!url || !token) {
        throw new Error("Invalid LiveKit token response from server");
      }

      const r = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      roomRef.current = r;
      setRoom(r);

      // Room event handlers
      r.on(RoomEvent.Disconnected, () => {
        setRoom(null);
        roomRef.current = null;
      });

      r.on(RoomEvent.ParticipantDisconnected, () => {
        // Peer left — end call gracefully
        setCall((prev) => (prev ? { ...prev, state: "ended" } : prev));
      });

      r.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (!r.canPlaybackAudio) {
          r.startAudio().catch(() => {});
        }
      });

      await r.connect(url, token, { autoSubscribe: true });

      // Unlock browser audio context for crystal clear voice playback
      try {
        await r.startAudio();
      } catch (audioErr) {
        console.warn("[LiveKit] startAudio note:", audioErr);
      }

      // Enable microphone
      try {
        await r.localParticipant?.setMicrophoneEnabled(true);
        setMic(true);
      } catch (micErr) {
        console.warn("[LiveKit] Microphone access warning:", micErr);
      }

      // Enable camera for video calls
      if (medium === "video" || isVideo) {
        try {
          await r.localParticipant?.setCameraEnabled(true);
          setCamera(true);
        } catch (camErr) {
          console.warn("[LiveKit] Camera access warning:", camErr);
        }
      }

      // Start duration timer
      if (!durationRef.current) {
        durationRef.current = setInterval(() => {
          setCallSeconds((s) => s + 1);
        }, 1000);
      }
    } catch (e) {
      console.warn("[useCall] LiveKit connect note:", e.message);
      setError(e.message);
      try {
        await roomRef.current?.disconnect();
      } catch {}
      roomRef.current = null;
      setRoom(null);
    } finally {
      setJoining(false);
    }
  }, [joining, isVideo]);

  // Perform action: accept | decline | end
  const performAction = useCallback(async (action) => {
    const currentId = callIdRef.current;
    try {
      let updated = null;
      if (currentId) {
        updated = await callsService.callAction(currentId, action).catch(() => null);
      }

      if (updated && updated.id) {
        setCall(updated);
        const charged = updated.fc_charged ?? updated.fcCharged ?? updated.chargedCredits ?? updated.credits_charged;
        const mins = updated.billed_minutes ?? updated.billedMinutes;
        if (charged !== undefined || mins !== undefined) {
          setCallReceipt({ ...updated, fc_charged: charged, billed_minutes: mins });
        }
      } else {
        const nextState = action === "accept" ? "accepted" : action === "decline" ? "declined" : "ended";
        setCall((prev) => (prev ? { ...prev, state: nextState } : { state: nextState }));
      }

      if (action === "accept" && !isSimulated && currentId) {
        await joinRoom(currentId);
      } else if (["decline", "end"].includes(action)) {
        clearInterval(durationRef.current);
        durationRef.current = null;
        try {
          await roomRef.current?.disconnect();
        } catch {}
        roomRef.current = null;
        setRoom(null);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [isSimulated, joinRoom]);

  // Demo accept simulation (useful for testing bots / demo calls)
  const performDemoAccept = useCallback(async () => {
    const currentId = callIdRef.current;
    try {
      if (currentId) {
        await callsService.demoAccept(currentId).catch(() => {});
      }
      setCall((prev) => ({
        ...(prev || {}),
        state: "accepted",
        simulated: true,
      }));
      if (!durationRef.current) {
        durationRef.current = setInterval(() => {
          setCallSeconds((s) => s + 1);
        }, 1000);
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Real-time call state synchronization via Socket.io
  useEffect(() => {
    const currentId = call?.id;
    if (!currentId) return;

    const unAcc = socketService.on("call:accepted", async (data) => {
      console.log("⚡ [useCall Socket] Call accepted:", data);
      if (String(data.callId || data.id) === String(currentId) || !data.callId) {
        setCall((prev) => ({
          ...prev,
          state: "accepted",
        }));
        if (!roomRef.current && !joining && !isSimulated) {
          await joinRoom(data.callId || currentId);
        }
      }
    });

    const unDec = socketService.on("call:declined", async (data) => {
      console.log("⚡ [useCall Socket] Call declined:", data);
      if (String(data.callId || data.id) === String(currentId) || !data.callId) {
        setCall((prev) => ({
          ...prev,
          state: "declined",
        }));
        if (durationRef.current) {
          clearInterval(durationRef.current);
          durationRef.current = null;
        }
        try {
          await roomRef.current?.disconnect();
        } catch {}
        roomRef.current = null;
        setRoom(null);
      }
    });

    const unEnd = socketService.on("call:ended", async (data) => {
      console.log("⚡ [useCall Socket] Call ended:", data);
      if (String(data.callId || data.id) === String(currentId) || !data.callId) {
        setCall((prev) => ({
          ...prev,
          state: "ended",
        }));
        const charged = data.fc_charged ?? data.fcCharged ?? data.chargedCredits ?? data.credits_charged;
        const mins = data.billed_minutes ?? data.billedMinutes;
        if (charged !== undefined || mins !== undefined) {
          setCallReceipt({ ...data, fc_charged: charged, billed_minutes: mins });
        }
        if (durationRef.current) {
          clearInterval(durationRef.current);
          durationRef.current = null;
        }
        try {
          await roomRef.current?.disconnect();
        } catch {}
        roomRef.current = null;
        setRoom(null);
      }
    });

    // Gentle 15s fallback check only when websocket is not active
    pollRef.current = setInterval(async () => {
      if (socketService.isConnected) return;
      try {
        const data = await callsService.getCalls().catch(() => null);
        const list = Array.isArray(data) ? data : data?.items || data?.data?.items || data?.data || [];
        const found = list.find((c) => String(c.id) === String(currentId));
        if (!found) return;

        setCall((prev) => ({
          ...prev,
          ...found,
          peer: found.peer || prev?.peer,
        }));

        if (["accepted", "active"].includes(found.state) && !roomRef.current && !joining && !isSimulated) {
          await joinRoom(found.id);
        }

        if (["ended", "declined"].includes(found.state)) {
          if (durationRef.current) {
            clearInterval(durationRef.current);
            durationRef.current = null;
          }
          try {
            await roomRef.current?.disconnect();
          } catch {}
          roomRef.current = null;
          setRoom(null);
        }
      } catch {}
    }, 15000);

    return () => {
      unAcc();
      unDec();
      unEnd();
      clearInterval(pollRef.current);
    };
  }, [call?.id, joining, isSimulated, joinRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearInterval(durationRef.current);
      try {
        roomRef.current?.disconnect();
      } catch {}
      roomRef.current = null;
    };
  }, []);

  // Mic toggle
  const toggleMic = async () => {
    const next = !mic;
    try {
      await roomRef.current?.localParticipant?.setMicrophoneEnabled(next);
    } catch (e) {
      console.warn("Toggle mic note:", e);
    }
    setMic(next);
  };

  // Camera toggle
  const toggleCamera = async () => {
    const next = !camera;
    try {
      await roomRef.current?.localParticipant?.setCameraEnabled(next);
    } catch (e) {
      console.warn("Toggle camera note:", e);
    }
    setCamera(next);
  };

  // Speaker toggle
  const toggleSpeaker = () => {
    setSpeakerOn((prev) => !prev);
  };

  // Format time MM:SS
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return {
    call,
    room,
    joining,
    error,
    isCaller,
    isReceiver,
    isVideo,
    isRinging,
    isAccepted,
    isTerminal,
    isSimulated,
    mic,
    camera,
    speakerOn,
    callSeconds,
    callReceipt,
    formatTime,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    performAction,
    performDemoAccept,
    joinRoom,
  };
}

export default useCall;
