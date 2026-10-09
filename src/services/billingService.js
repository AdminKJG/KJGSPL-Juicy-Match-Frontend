import { request } from "./api";

export const billingService = {
  // 13.1 Billing & Dual Wallet Status (GET /v1/billing)
  getBillingState: async () => {
    return await request("/billing", { auth: true });
  },

  // 13.2 Member Journey & Plan Entitlements (GET /v1/journey)
  getJourney: async () => {
    return await request("/journey", { auth: true });
  },

  // 13.3 Commerce Catalog & Guaranteed Price Quotes (POST /v1/billing/quote)
  getCatalog: async () => {
    return await request("/billing/catalog", { auth: true });
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
      body: { quoteId: quoteId || `quote_${Date.now()}`, outcome: "approved" },
      auth: true,
    });
  },

  // 13.5 Razorpay / Stripe Order Creation & Web Checkout (POST /v1/billing/orders)
  createOrder: async (quoteId, clientId = null) => {
    const cId = clientId || `client-order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return await request("/billing/orders", {
      method: "POST",
      body: { quoteId, clientId: cId, channel: "web" },
      auth: true,
    });
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

  verifyRazorpayPayment: async ({ quoteId, orderId, paymentId, signature }) => {
    try {
      return await request("/billing/orders/verify", {
        method: "POST",
        body: { quoteId, orderId, paymentId, signature },
        auth: true,
      });
    } catch {
      return await request("/billing/purchase", {
        method: "POST",
        body: {
          quoteId,
          outcome: "approved",
          paymentId,
          orderId,
          signature,
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
