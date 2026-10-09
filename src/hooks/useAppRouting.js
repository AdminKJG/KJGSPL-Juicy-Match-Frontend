import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { getStoredTokens } from "../services/api";

export function useAppRouting({ authenticated }) {
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
  }, [authenticated]);

  // Handle browser history popstate changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      const isAuth = Boolean(authenticated);
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
  }, [authenticated]);

  const navigate = useCallback((route) => {
    const cleanRoute = String(route || "").replace(/^#?\/?/, "");
    const target = cleanRoute || "discover";
    const fullPath = `/${target}`;
    if (window.location.pathname !== fullPath) {
      window.history.pushState({}, "", fullPath);
    }
    setActiveRoute(target);
  }, []);

  const openModal = useCallback((title, content) => {
    setModalContent({ title, content });
  }, []);

  const closeModal = useCallback(() => {
    setModalContent(null);
  }, []);

  const showToast = useCallback((message, type = "info", options = {}) => {
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
  }, []);

  return {
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
  };
}
