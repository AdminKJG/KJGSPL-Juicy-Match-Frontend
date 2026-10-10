import { useState, useEffect, useCallback } from "react";
import { livestreamService } from "../services/livestreamService";
import { blockService } from "../services/blockService";
import { socketService } from "../services/socketService";

export function useLiveStreamManager({ authenticated, me, showToast }) {
  const [activeLiveStreams, setActiveLiveStreams] = useState([]);
  const [activeLiveStreamModal, setActiveLiveStreamModal] = useState(null); // { stream, role: "host" | "viewer" }

  const openLiveStream = useCallback((stream, role = "viewer") => {
    if (!stream) return;
    const myId = me?.id || me?.account?.id;
    const myName = (me?.profile?.pseudonym || me?.account?.pseudonym || me?.name || "").trim().toLowerCase();
    const hostId = stream.hostId || stream.creator || stream.userId;
    const hostName = (stream.pseudonym || stream.hostName || stream.creator || "").trim().toLowerCase();

    const isMine = Boolean(
      role === "host" ||
      (myId && hostId && String(myId) === String(hostId)) ||
      (myName && hostName && myName === hostName)
    );

    setActiveLiveStreamModal({ stream, role: isMine ? "host" : "viewer" });
  }, [me]);

  const closeLiveStream = useCallback(() => {
    setActiveLiveStreamModal(null);
  }, []);

  const isPeerLive = useCallback(
    (target) => {
      if (!target || !activeLiveStreams || activeLiveStreams.length === 0) return null;

      const targetKeys = new Set();

      if (typeof target === "string" || typeof target === "number") {
        const str = String(target).trim().toLowerCase();
        if (str) targetKeys.add(str);
      } else if (typeof target === "object") {
        const keys = [
          target.id,
          target.peerId,
          target.hostId,
          target.userId,
          target.accountId,
          target.connectionId,
          target.pseudonym,
          target.name,
          target.username,
          target.creator,
          target.hostName,
          target.peer?.id,
          target.peer?.pseudonym,
          target.peer?.name,
        ];
        keys.forEach((k) => {
          if (k) {
            const clean = String(k).trim().toLowerCase();
            if (clean) targetKeys.add(clean);
          }
        });
      }

      if (targetKeys.size === 0) return null;

      return (
        activeLiveStreams.find((s) => {
          const sKeys = [
            s.id,
            s.streamId,
            s.hostId,
            s.creatorId,
            s.creator,
            s.userId,
            s.hostName,
            s.pseudonym,
            s.creatorName,
          ];
          return sKeys.some((k) => {
            if (!k) return false;
            return targetKeys.has(String(k).trim().toLowerCase());
          });
        }) || null
      );
    },
    [activeLiveStreams]
  );

  const refreshLiveStreams = useCallback(async () => {
    if (!authenticated) return [];
    try {
      const items = await livestreamService.getLiveStreams(me);
      const blocked = blockService.getBlockedMemberIds();
      const cleanItems = (Array.isArray(items) ? items : []).filter(
        (s) =>
          !blocked.includes(String(s.hostId)) &&
          !blocked.includes(String(s.creatorId)) &&
          !blocked.includes(String(s.id))
      );
      setActiveLiveStreams(cleanItems);
      return cleanItems;
    } catch {
      return [];
    }
  }, [authenticated, me]);

  // Global sync for active live streams
  useEffect(() => {
    if (!authenticated) return;
    refreshLiveStreams();
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (socketService.isConnected) return;
      refreshLiveStreams();
    }, 60000);

    let channel = null;
    const handleBroadcastData = (data) => {
      if (!data || !data.type) return;
      if (data.type === "HOST_STARTED_LIVE") {
        const streamId = data.streamId || data.id;
        if (streamId) {
          const incomingStream = {
            id: streamId,
            streamId,
            title: data.title || "Live Stream",
            hostName: data.hostName || "Host",
            hostId: data.hostId,
            hostPhoto: data.hostPhoto || data.photo,
            hostPortrait: data.hostPortrait ?? data.portrait ?? 0,
            viewerCount: data.viewerCount || 1,
            startedAt: data.startedAt || new Date().toISOString(),
            state: "live",
            status: "live",
          };
          setActiveLiveStreams((prev) => {
            const clean = (prev || []).filter((s) => (s.id || s.streamId) !== streamId);
            return [incomingStream, ...clean];
          });
        }
        refreshLiveStreams();
      } else if (data.type === "HOST_ENDED_LIVE") {
        const streamId = data.streamId || data.id;
        if (streamId) {
          setActiveLiveStreams((prev) =>
            (prev || []).filter((s) => (s.id || s.streamId) !== streamId)
          );
        }
        refreshLiveStreams();
      }
    };

    try {
      channel = new BroadcastChannel("jm_live_channel");
      channel.onmessage = (e) => handleBroadcastData(e.data);
    } catch {}

    const handleStorage = (e) => {
      if (e.key === "jm_last_live_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handleBroadcastData(data);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [authenticated, refreshLiveStreams]);

  // Global Livestream Notifications Synchronization (real-time notification when mutual friend goes live)
  useEffect(() => {
    if (!authenticated) return;

    let liveChannel = null;
    const handleLiveEvent = (data) => {
      if (!data || data.type !== "HOST_STARTED_LIVE") return;
      const myId = me?.id || me?.account?.id || me?.accountId || "";
      if (String(data.hostId) === String(myId)) return;

      const hostName = data.hostName || "A friend";
      if (showToast) {
        showToast(
          `🔴 ${hostName} is now live! Tap to join stream.`,
          "info",
          {
            onClick: () => {
              openLiveStream(
                {
                  id: data.streamId || data.id,
                  streamId: data.streamId || data.id,
                  title: data.title || "Live Stream",
                  hostName: data.hostName,
                  hostId: data.hostId,
                  hostPhoto: data.hostPhoto,
                },
                "viewer"
              );
            },
          }
        );
      }
    };

    try {
      liveChannel = new BroadcastChannel("jm_live_channel");
      liveChannel.onmessage = (e) => handleLiveEvent(e.data);
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
  }, [authenticated, me, showToast, openLiveStream]);

  return {
    activeLiveStreams,
    activeLiveStreamModal,
    openLiveStream,
    closeLiveStream,
    isPeerLive,
    refreshLiveStreams,
  };
}
