const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

let csrf = "";

export const getStoredTokens = () => {
  try {
    const token = localStorage.getItem("jm_access_token");
    const refreshToken = localStorage.getItem("jm_refresh_token");
    return { token, refreshToken };
  } catch {
    return { token: null, refreshToken: null };
  }
};

export const setStoredTokens = (token, refreshToken) => {
  try {
    if (token) localStorage.setItem("jm_access_token", token);
    else localStorage.removeItem("jm_access_token");

    if (refreshToken) localStorage.setItem("jm_refresh_token", refreshToken);
    else localStorage.removeItem("jm_refresh_token");
  } catch {}
};

export const getCurrentUserIdFromToken = () => {
  try {
    const { token } = getStoredTokens();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.id || parsed.sub || parsed.userId || parsed.memberId || parsed.account?.id || null;
  } catch {
    return null;
  }
};

export const clearStoredTokens = () => {
  try {
    localStorage.removeItem("jm_access_token");
    localStorage.removeItem("jm_refresh_token");
  } catch {}
};

export const bootSession = async () => {
  try {
    const sessionUrl = RAW_BASE_URL ? `${RAW_BASE_URL}/v1/session` : "/v1/session";
    const { token } = getStoredTokens();
    const headers = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(sessionUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.csrf) {
        csrf = data.csrf;
      }
      return data;
    }
  } catch {}
  return null;
};

export async function request(path, options = {}) {
  const { method = "GET", body, auth = true, headers = {} } = options;

  let cleanPath = path;
  if (!cleanPath.startsWith("http://") && !cleanPath.startsWith("https://")) {
    let relative = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
    // Guarantee /v1 prefix for backend routes
    if (!relative.startsWith("/v1") && !relative.startsWith("/api")) {
      relative = `/v1${relative}`;
    } else if (relative.startsWith("/api")) {
      relative = relative.replace(/^\/api/, "/v1");
    }
    cleanPath = RAW_BASE_URL ? `${RAW_BASE_URL}${relative}` : relative;
  }

  const { token, refreshToken } = getStoredTokens();
  const isMutation = method !== "GET" && method !== "HEAD";

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Set CSRF token for mutations
  if (isMutation && csrf) {
    requestHeaders["X-CSRF-Token"] = csrf;
  }

  if (auth && token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: requestHeaders,
    credentials: "include",
    cache: "no-store",
    ...(body !== undefined
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : isMutation
        ? { body: "{}" }
        : {}),
  };

  let response;
  try {
    response = await fetch(cleanPath, config);
  } catch (err) {
    throw new Error(
      "Connection error. Please check your backend connection and retry."
    );
  }

  // Handle 401 Unauthorized & try refresh token if available
  if (response.status === 401 && auth && refreshToken && !cleanPath.includes("/auth/")) {
    try {
      const refreshUrl = RAW_BASE_URL ? `${RAW_BASE_URL}/v1/auth/refresh` : "/v1/auth/refresh";
      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.csrf) csrf = refreshData.csrf;
        setStoredTokens(refreshData.token, refreshData.refreshToken);
        // Retry original request with new token
        requestHeaders["Authorization"] = `Bearer ${refreshData.token}`;
        response = await fetch(cleanPath, { ...config, headers: requestHeaders });
      }
    } catch {}
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: "Non-JSON response received from server." };
  }

  // Capture updated CSRF token from response if present
  if (data?.csrf) {
    csrf = data.csrf;
  }

  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.message ||
      (Array.isArray(data.errors) ? data.errors.join(", ") : "Request failed.");
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
