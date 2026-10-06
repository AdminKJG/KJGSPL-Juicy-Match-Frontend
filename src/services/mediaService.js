import { request, getStoredTokens } from "./api";

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const mediaService = {
  // 6.1 Upload Media (Photo or Voice Note)
  uploadMedia: async (base64, kind = "photo") => {
    const cleanBase64 = typeof base64 === "string" && base64.includes(",")
      ? base64.split(",")[1]
      : base64;
    return await request("/media", {
      method: "POST",
      body: { kind, base64: cleanBase64 },
      auth: true,
    });
  },

  // 6.2 List Media Vault & Grants
  getMedia: async (ownerId = null) => {
    const endpoint = ownerId ? `/media?owner=${encodeURIComponent(ownerId)}` : "/media";
    return await request(endpoint, { auth: true });
  },

  // 6.3 Direct Media Streaming URL (with JWT token query for authenticated <img> tags)
  getRawMediaUrl: (mediaIdOrUrl) => {
    if (!mediaIdOrUrl || typeof mediaIdOrUrl !== "string") return "";
    if (mediaIdOrUrl.startsWith("data:") || mediaIdOrUrl.startsWith("blob:")) {
      return mediaIdOrUrl;
    }

    const { token } = getStoredTokens();
    const tokenQuery = token ? `token=${encodeURIComponent(token)}` : "";

    let target = mediaIdOrUrl.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      const clean = target.replace(/^\/?(api\/)?/, "");
      const pathWithV1 = clean.startsWith("v1/")
        ? clean
        : clean.startsWith("media/")
        ? `v1/${clean}`
        : `v1/media/${clean}`;
      target = RAW_BASE_URL ? `${RAW_BASE_URL}/${pathWithV1}` : `/${pathWithV1}`;
    }

    if (tokenQuery && !target.includes("token=")) {
      target += (target.includes("?") ? "&" : "?") + tokenQuery;
    }
    return target;
  },

  // Authenticated Binary Fetch (generates secure blob URL for 100% reliable <img> rendering)
  fetchMediaBlobUrl: async (mediaIdOrUrl) => {
    if (!mediaIdOrUrl || typeof mediaIdOrUrl !== "string") return "";
    if (mediaIdOrUrl.startsWith("data:") || mediaIdOrUrl.startsWith("blob:")) {
      return mediaIdOrUrl;
    }

    // 1. Fast local cache lookup by UUID or key
    try {
      const uuidMatch = mediaIdOrUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (uuidMatch && uuidMatch[1]) {
        const cached = localStorage.getItem(`jm_media_cache_${uuidMatch[1]}`);
        if (cached && (cached.startsWith("data:") || cached.startsWith("blob:"))) {
          return cached;
        }
      }
      const directKeyCached = localStorage.getItem(`jm_media_cache_${mediaIdOrUrl}`);
      if (directKeyCached && (directKeyCached.startsWith("data:") || directKeyCached.startsWith("blob:"))) {
        return directKeyCached;
      }
    } catch {}

    // 2. Fetch authenticated binary stream from backend
    try {
      const url = mediaService.getRawMediaUrl(mediaIdOrUrl);
      const { token } = getStoredTokens();
      const headers = {
        Accept: "image/*,video/*,*/*",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, {
        headers,
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch {}

    // 3. Look up in local chat store (jm_chat_store_v1) by UUID, ID, or clientId
    try {
      const uuidMatch = mediaIdOrUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      const targetUuid = uuidMatch ? uuidMatch[1] : null;
      const rawStore = localStorage.getItem("jm_chat_store_v1");
      if (rawStore) {
        const store = JSON.parse(rawStore);
        for (const connKey of Object.keys(store)) {
          const list = store[connKey];
          if (Array.isArray(list)) {
            const found = list.find((m) => {
              if (!m) return false;
              const mUrl = m.mediaUrl || m.media_url;
              if (!mUrl || (!mUrl.startsWith("data:") && !mUrl.startsWith("blob:"))) return false;
              const b = typeof m.body === "string" ? m.body : "";
              return (
                (targetUuid && (b.includes(targetUuid) || m.mediaId === targetUuid || m.media_id === targetUuid)) ||
                m.id === mediaIdOrUrl ||
                m.clientId === mediaIdOrUrl ||
                m.client_id === mediaIdOrUrl
              );
            });
            if (found && (found.mediaUrl || found.media_url)) {
              return found.mediaUrl || found.media_url;
            }
          }
        }
      }
    } catch {}

    // 4. Scan any jm_media_cache_* in localStorage
    try {
      const uuidMatch = mediaIdOrUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("jm_media_cache_")) {
          const val = localStorage.getItem(key);
          if (val && (val.startsWith("data:image/") || val.startsWith("blob:"))) {
            if (uuidMatch && key.includes(uuidMatch[1])) {
              return val;
            }
          }
        }
      }
    } catch {}

    return null;
  },

  // 6.4 Set Primary Profile Photo
  setPrimaryPhoto: async (mediaId) => {
    return await request(`/media/${mediaId}/primary`, {
      method: "PUT",
      body: {},
      auth: true,
    });
  },

  // 6.5 Delete Media
  deleteMedia: async (mediaId) => {
    return await request(`/media/${mediaId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  // 6.6 Grant or Revoke Photo Access for Specific Connection
  grantPhotoAccess: async (mediaId, targetId, state = "granted") => {
    return await request(`/media/${mediaId}/grant`, {
      method: "POST",
      body: { viewer: targetId, target: targetId, state },
      auth: true,
    });
  },

  // 6.7 Photo Request Operations
  getPhotoRequests: async () => {
    return await request("/photo-requests", { auth: true });
  },

  requestPhotoAccess: async (targetId) => {
    return await request("/photo-requests", {
      method: "POST",
      body: { target: targetId },
      auth: true,
    });
  },

  respondToPhotoRequest: async (requestId, action = "grant") => {
    return await request(`/photo-requests/${requestId}/respond`, {
      method: "POST",
      body: { action },
      auth: true,
    });
  },
};
