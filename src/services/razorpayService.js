/**
 * Razorpay Payment Gateway Service
 * ────────────────────────────────────────────────────────────────────────────
 * Handles dynamic script loading, order initialization, and secure checkout popup.
 */

let scriptLoadingPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Failed to load Razorpay SDK from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
};

/**
 * Initiates Razorpay checkout flow
 * @param {Object} params
 * @param {Object} params.order - Server order response (contains orderId, keyId, amount, currency)
 * @param {Object} params.quote - Commercial quote details (sku, name, price, credits)
 * @param {Object} params.member - Current user state (profile, email)
 * @param {Function} params.onSuccess - Callback on payment success
 * @param {Function} params.onError - Callback on payment failure
 * @param {Function} params.onDismiss - Callback when checkout is closed by user
 */
export const openRazorpayModal = async ({
  order = {},
  quote = {},
  member = {},
  onSuccess,
  onError,
  onDismiss,
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error("Razorpay SDK could not be loaded. Please check your internet connection.");
  }

  const keyId =
    order.keyId ||
    order.key ||
    order.razorpayKeyId ||
    import.meta.env.VITE_RAZORPAY_KEY_ID;

  if (!keyId || keyId === "rzp_test_placeholder" || keyId.trim() === "") {
    throw new Error(
      "Razorpay Key ID is not configured. Please add your real Razorpay Key ID (rzp_test_... or rzp_live_...) to your .env or backend orders API."
    );
  }

  const orderId = order.orderId || order.id || order.razorpayOrderId;
  const isRealRazorpayOrder = typeof orderId === "string" && orderId.startsWith("order_") && orderId.length >= 14 && !orderId.includes("client");
  const amount = order.amount || (quote.price ? Math.round(quote.price * 100) : 100);
  const currency = order.currency || quote.currency || "INR";

  const options = {
    key: keyId,
    amount: amount,
    currency: currency,
    name: "Juicy Match",
    description: quote.name || `${quote.credits || quote.amount || ""} Credits Top-Up`,
    image: "/assets/logo.jpg",
    ...(isRealRazorpayOrder ? { order_id: orderId } : {}),
    prefill: {
      name: member?.profile?.name || member?.profile?.pseudonym || "Juicy Match Member",
      email: member?.email || member?.account?.email || "",
      contact: member?.profile?.phone || member?.phone || "",
    },
    notes: {
      sku: quote.sku || "",
      credits: String(quote.credits || quote.amount || 0),
      channel: "web",
    },
    theme: {
      color: "#e11d48",
      backdrop_color: "rgba(18, 13, 22, 0.85)",
    },
    handler: function (response) {
      if (typeof onSuccess === "function") {
        onSuccess(response);
      }
    },
    modal: {
      ondismiss: function () {
        if (typeof onDismiss === "function") {
          onDismiss();
        }
      },
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (failResponse) {
      if (typeof onError === "function") {
        onError(failResponse.error || failResponse);
      }
    });
    rzp.open();
    return rzp;
  } catch (err) {
    if (typeof onError === "function") {
      onError(err);
    }
    throw err;
  }
};
