import { request } from "./api";

export const billingService = {
  // 13.1 Billing & Wallet Status
  getBillingState: async () => {
    return await request("/billing", { auth: true });
  },

  // 13.2 Commerce Catalog & Guaranteed Price Quotes
  getCatalog: async () => {
    return await request("/billing/catalog", { auth: false });
  },

  createQuote: async (sku, currency = "USD") => {
    return await request("/billing/quote", {
      method: "POST",
      body: { sku, currency },
      auth: true,
    });
  },

  // 13.3 Razorpay Order Creation & Web Checkout
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

  // 13.4 Activate Profile Boost
  activateBoost: async () => {
    return await request("/boosts/activate", {
      method: "POST",
      body: {},
      auth: true,
    });
  },

  // 13.5 In-App Purchase Sync & Restore
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

  // 13.6 Cancel Subscription Auto-Renewal
  cancelSubscription: async () => {
    return await request("/billing/cancel", {
      method: "POST",
      body: {},
      auth: true,
    });
  },
};
