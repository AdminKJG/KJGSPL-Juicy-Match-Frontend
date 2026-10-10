import { request } from "./api";

export const billingService = {
  // 13.1 Billing & Dual Wallet Status (GET /v1/billing?currency=...)
  getBillingState: async (currency = "USD") => {
    const q = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    return await request(`/billing${q}`, { auth: true });
  },

  // 13.2 Member Journey & Plan Entitlements (GET /v1/journey)
  getJourney: async () => {
    return await request("/journey", { auth: true });
  },

  // 13.3 Commerce Catalog & Guaranteed Price Quotes (GET /v1/billing/catalog?currency=...)
  getCatalog: async (currency = "USD") => {
    const q = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    return await request(`/billing/catalog${q}`, { auth: true });
  },

  // 13.3.1 Dynamic Localized Plans (GET /v1/billing/plans?currency=...)
  getPlans: async (currency = "INR") => {
    const q = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    return await request(`/billing/plans${q}`, { auth: true });
  },

  // 13.3.2 Live Currency Exchange Rates (GET /v1/billing/rates)
  getRates: async () => {
    return await request("/billing/rates", { auth: false });
  },

  createQuote: async (sku, currency = "USD") => {
    return await request("/billing/quote", {
      method: "POST",
      body: { sku, currency },
      auth: true,
    });
  },

  // 13.4 Purchase Completion & Simulated Purchase (POST /v1/billing/purchase)
  purchaseQuote: async (quoteId, outcome = "approved") => {
    return await request("/billing/purchase", {
      method: "POST",
      body: { quoteId, outcome },
      auth: true,
    });
  },

  demoPurchase: async (sku, quoteId, currency = "USD") => {
    return await request("/billing/purchase", {
      method: "POST",
      body: { quoteId: quoteId || `quote_${Date.now()}`, outcome: "approved", currency },
      auth: true,
    });
  },

  // 13.5 Razorpay / Stripe Order Creation (POST /v1/billing/create-order or POST /v1/billing/orders)
  createOrder: async (quoteIdOrOptions, clientId = null, currency = "INR", amount = null) => {
    const curr = (typeof quoteIdOrOptions === "object" ? quoteIdOrOptions?.currency : currency) || "INR";
    const targetPlanId =
      typeof quoteIdOrOptions === "object"
        ? quoteIdOrOptions?.planId || quoteIdOrOptions?.sku
        : quoteIdOrOptions;

    // 1. Try modern /v1/billing/create-order endpoint with subunit precision
    try {
      return await request("/billing/create-order", {
        method: "POST",
        body: {
          planId: targetPlanId,
          currency: curr,
        },
        auth: true,
      });
    } catch (orderErr) {
      console.warn("[Billing] /billing/create-order note, falling back to /billing/orders:", orderErr.message);
      // 2. Fallback to /billing/orders
      const qId = typeof quoteIdOrOptions === "string" ? quoteIdOrOptions : quoteIdOrOptions?.quoteId || targetPlanId;
      const cId = clientId || `client-order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload = { quoteId: qId, clientId: cId, channel: "web", planId: targetPlanId };
      if (curr) payload.currency = curr;
      if (amount != null) payload.amount = amount;
      return await request("/billing/orders", {
        method: "POST",
        body: payload,
        auth: true,
      });
    }
  },

  refreshOrder: async (orderId) => {
    return await request(`/billing/orders/${orderId}/refresh`, {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  verifyCheckout: async (nonce, verificationData) => {
    return await request(`/checkout/${nonce}/verify`, {
      method: "POST",
      body: verificationData,
      auth: true,
    });
  },

  verifyRazorpayPayment: async ({
    quoteId,
    orderId,
    paymentId,
    signature,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }) => {
    const finalOrderId = razorpay_order_id || orderId;
    const finalPaymentId = razorpay_payment_id || paymentId;
    const finalSignature = razorpay_signature || signature;

    const payload = {
      quoteId,
      razorpay_order_id: finalOrderId,
      razorpay_payment_id: finalPaymentId,
      razorpay_signature: finalSignature,
      orderId: finalOrderId,
      paymentId: finalPaymentId,
      signature: finalSignature,
    };

    try {
      return await request("/billing/orders/verify", {
        method: "POST",
        body: payload,
        auth: true,
      });
    } catch {
      return await request("/billing/purchase", {
        method: "POST",
        body: {
          quoteId,
          outcome: "approved",
          paymentId: finalPaymentId,
          orderId: finalOrderId,
          signature: finalSignature,
          gateway: "razorpay",
        },
        auth: true,
      });
    }
  },

  // 13.6 Discovery Packs & Profile Boost (Feature Credits consumption)
  buyProfilePack: async () => {
    return await request("/discovery/packs/profiles", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  buyLikesPack: async () => {
    return await request("/discovery/packs/likes", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  activateBoost: async () => {
    return await request("/discovery/boost", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  activatePassportPass: async () => {
    return await request("/passport/pass/activate", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 13.7 Low-Credit Email Alerts (GET / PUT /v1/members/me/credit-alerts)
  getCreditAlerts: async () => {
    return await request("/members/me/credit-alerts", { auth: true });
  },

  updateCreditAlerts: async (thresholds) => {
    return await request("/members/me/credit-alerts", {
      method: "PUT",
      body: thresholds,
      auth: true,
    });
  },

  // 13.8 In-App Purchase Sync & Restore
  syncPurchases: async () => {
    return await request("/billing/sync", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  restorePurchases: async () => {
    return await request("/billing/restore", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 13.9 Cancel Subscription Auto-Renewal
  cancelSubscription: async () => {
    return await request("/billing/cancel", {
      method: "POST",
      body: {},
      auth: true,
    });
  },
};
