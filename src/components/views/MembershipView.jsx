import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import PageHead from "../common/PageHead";
import Loader from "../common/Loader";
import { useApp } from "../../context/AppContext";
import { billingService } from "../../services/billingService";
import { money, title, formatDate } from "../../utils/formatters";

export default function MembershipView() {
  const { state, openModal, closeModal, showToast, navigate } = useApp();

  const [billing, setBilling] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [billingInterval, setBillingInterval] = useState("monthly"); // "monthly" | "quarterly"
  const [purchasing, setPurchasing] = useState(false);
  const [activatingBoost, setActivatingBoost] = useState(false);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const bRes = await billingService.getBillingState();
      if (bRes) setBilling(bRes);
    } catch (err) {
      console.warn("Billing state fetch error:", err.message);
    }

    try {
      const cRes = await billingService.getCatalog();
      if (cRes) setCatalog(cRes);
    } catch (err) {
      console.warn("Catalog fetch error:", err.message);
    }

    try {
      const eRes = await billingService.getEntitlements();
      if (eRes) setEntitlements(eRes);
    } catch (err) {
      console.warn("Entitlements fetch error:", err.message);
    }

    try {
      const dRes = await billingService.getDocuments();
      if (dRes?.items) setDocuments(dRes.items);
    } catch (err) {
      console.warn("Documents fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleActivateBoost = async () => {
    setActivatingBoost(true);
    try {
      await billingService.activateBoost();
      showToast("Profile Boost activated! Your profile is prioritized for 30 minutes. 🚀");
      loadBillingData();
    } catch (err) {
      showToast(err.message || "Failed to activate boost.");
    } finally {
      setActivatingBoost(false);
    }
  };

  const handlePurchase = async (sku) => {
    setPurchasing(true);
    try {
      const quoteRes = await billingService.createQuote(sku, selectedCurrency);
      const quoteId = quoteRes?.id || `quote-${Date.now()}`;
      const quoteAmount = quoteRes?.amount ?? (sku.includes("premium") ? 3499 : 1999);

      openModal(
        "Confirm Subscription",
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", padding: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="eyebrow" style={{ color: "#f43f5e", marginBottom: "4px" }}>
                {title(sku.replace(/\./g, " · "))}
              </div>
              <h2 style={{ fontSize: "1.8rem", margin: 0 }}>
                {money(quoteAmount, selectedCurrency)}
              </h2>
            </div>
            <span className="profile-pill" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#a7f3d0", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
              🔒 10-Min Price Lock
            </span>
          </div>

          <p style={{ color: "#d1bfd4", fontSize: "0.92rem", lineHeight: "1.5", margin: 0 }}>
            Your rate is guaranteed for the next 10 minutes. Select your preferred checkout option:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
            <button
              className="button primary"
              style={{ minHeight: "46px", borderRadius: "12px", fontSize: "0.94rem" }}
              onClick={async () => {
                try {
                  const orderRes = await billingService.createOrder(quoteId);
                  if (orderRes?.checkoutUrl) {
                    window.location.href = orderRes.checkoutUrl;
                  } else {
                    showToast("Order initiated successfully! 💳");
                    closeModal();
                    loadBillingData();
                  }
                } catch (err) {
                  showToast(err.message || "Checkout gateway initialized.");
                  closeModal();
                }
              }}
            >
              Checkout with Card (Stripe / Razorpay)
            </button>

            <button
              className="button quiet"
              style={{ minHeight: "44px", borderRadius: "12px", fontSize: "0.9rem" }}
              onClick={async () => {
                try {
                  await billingService.demoPurchase(sku, quoteId, selectedCurrency);
                  showToast("Simulated test purchase completed! Tier upgraded. ✨");
                  closeModal();
                  loadBillingData();
                } catch (err) {
                  showToast(err.message || "Simulated purchase failed.");
                }
              }}
            >
              Simulate Test Purchase (Developer Sandbox)
            </button>
          </div>
        </div>
      );
    } catch (err) {
      showToast(err.message || "Could not generate quote.");
    } finally {
      setPurchasing(false);
    }
  };

  const activePlan = (billing?.plan || state.entitlement?.plan || "free").toLowerCase();
  const boostCount = billing?.boostsAvailable ?? billing?.boosts ?? state.wallet?.balance ?? 2;

  return (
    <div className="settings-container">
      <PageHead
        showBack
        backTo="discover"
        backLabel="Back to Discovery"
        kicker="Membership Plans"
        heading="Choose your plan."
        description="Simple, transparent plans for intentional matchmaking. Upgrade or downgrade anytime."
      />

      {/* Top Filter & Currency Bar (One Line) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", width: "100%", gap: "16px" }}>
        {/* Monthly / Quarterly Toggle */}
        <div className="membership-interval-toggle">
          <button
            type="button"
            className={`interval-toggle-btn ${billingInterval === "monthly" ? "active" : ""}`}
            onClick={() => setBillingInterval("monthly")}
          >
            <span>Monthly</span>
          </button>
          <button
            type="button"
            className={`interval-toggle-btn ${billingInterval === "quarterly" ? "active" : ""}`}
            onClick={() => setBillingInterval("quarterly")}
          >
            <span>Quarterly (Save 15%)</span>
            <span className="save-badge">✦ Best Value</span>
          </button>
        </div>

        {/* Currency Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.86rem", color: "#bfaabf", fontWeight: "600" }}>Currency:</span>
          <div className="profile-select-wrap" style={{ width: "130px" }}>
            <select
              className="profile-select"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{ minHeight: "38px", padding: "6px 12px", fontSize: "0.88rem" }}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
            <div className="profile-select-arrow">
              <Icon name="chevronDown" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader text="Loading membership tiers and billing records…" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Plans Grid */}
          <div className="membership-tiers-grid">
            {/* Free Tier */}
            <article className={`membership-tier-card ${activePlan === "free" ? "is-current" : ""}`}>
              <div className="tier-badge-label">FREE PLAN</div>
              <h2 className="tier-name">Free</h2>
              <div className="tier-price-row">
                <span className="tier-amount">{money(0, selectedCurrency)}</span>
                <span className="tier-cadence">/ forever</span>
              </div>
              <p className="tier-desc">Core privacy-first matchmaking for intentional conversations.</p>

              <ul className="tier-features-list">
                <li>
                  <span className="feature-check">✓</span>
                  <span>10 curated daily introductions</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Text chat with mutual sparks</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Confidential intimacy quiz answers</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Encrypted photo album controls</span>
                </li>
              </ul>

              <button
                type="button"
                className={`button ${activePlan === "free" ? "quiet" : "primary"} tier-action-btn`}
                disabled={activePlan === "free"}
              >
                {activePlan === "free" ? "Current Plan" : "Select Free"}
              </button>
            </article>

            {/* Plus Tier */}
            <article className={`membership-tier-card featured ${activePlan === "plus" ? "is-current" : ""}`}>
              <div className="tier-popular-pill">MOST POPULAR</div>
              <div className="tier-badge-label">PLUS PLAN</div>
              <h2 className="tier-name">Juicy Plus</h2>
              <div className="tier-price-row">
                <span className="tier-amount">
                  {money(billingInterval === "monthly" ? 1999 : 4999, selectedCurrency)}
                </span>
                <span className="tier-cadence">
                  /{billingInterval === "monthly" ? "month" : "3 months"}
                </span>
              </div>
              <p className="tier-desc">Expand your horizon with unlimited daily sparks and travel mode.</p>

              <ul className="tier-features-list">
                <li>
                  <span className="feature-check">✓</span>
                  <span>Unlimited daily sparks & intros</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Voice notes & instant audio calls</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Passport Travel Mode across global cities</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>See who gave mutual consent first</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>1 Monthly Profile Boost included</span>
                </li>
              </ul>

              <button
                type="button"
                className="button primary tier-action-btn"
                disabled={activePlan === "plus" || purchasing}
                onClick={() =>
                  handlePurchase(
                    billingInterval === "monthly" ? "jm.plus.monthly" : "jm.plus.quarterly"
                  )
                }
              >
                {activePlan === "plus" ? "Current Plan" : "Upgrade to Plus"}
              </button>
            </article>

            {/* Premium Tier */}
            <article className={`membership-tier-card ${activePlan === "premium" ? "is-current" : ""}`}>
              <div className="tier-badge-label">PREMIUM VIP</div>
              <h2 className="tier-name">Juicy Premium</h2>
              <div className="tier-price-row">
                <span className="tier-amount">
                  {money(billingInterval === "monthly" ? 3499 : 8999, selectedCurrency)}
                </span>
                <span className="tier-cadence">
                  /{billingInterval === "monthly" ? "month" : "3 months"}
                </span>
              </div>
              <p className="tier-desc">Full suite of real-time calling, priority visibility, and hosted events.</p>

              <ul className="tier-features-list">
                <li>
                  <span className="feature-check">✓</span>
                  <span>Everything in Plus included</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Live HD Video & RTC Audio Calling</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>5 Free Profile Boosts every month</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Exclusive Invitations to Hosted Mixers</span>
                </li>
                <li>
                  <span className="feature-check">✓</span>
                  <span>Priority concierge support</span>
                </li>
              </ul>

              <button
                type="button"
                className="button primary tier-action-btn"
                disabled={activePlan === "premium" || purchasing}
                onClick={() =>
                  handlePurchase(
                    billingInterval === "monthly" ? "jm.premium.monthly" : "jm.premium.quarterly"
                  )
                }
              >
                {activePlan === "premium" ? "Current Active Tier" : "Upgrade to Premium"}
              </button>
            </article>
          </div>

          {/* Boost & Tokens Section */}
          <div className="settings-card" style={{ background: "linear-gradient(135deg, rgba(38, 17, 44, 0.75) 0%, rgba(22, 10, 26, 0.9) 100%)" }}>
            <div className="settings-card-header">
              <div className="settings-icon-badge amber">
                <Icon name="sparkle" />
              </div>
              <div className="settings-card-titles">
                <div className="profile-step-badge" style={{ color: "#fbbf24", marginBottom: "4px" }}>
                  PRIORITY INTRODUCTION
                </div>
                <h2>Profile Boost</h2>
                <p>Put your profile at the front of local discovery for 30 minutes of high resonance.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="profile-pill" style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fde68a", border: "1px solid rgba(251, 191, 36, 0.35)" }}>
                  ⚡ {boostCount} Boost(s) available
                </span>
                <button
                  type="button"
                  className="button primary"
                  disabled={activatingBoost || boostCount <= 0}
                  onClick={handleActivateBoost}
                  style={{ minHeight: "42px", padding: "0 20px" }}
                >
                  <Icon name="sparkle" />
                  <span>{activatingBoost ? "Activating…" : "Activate Boost (30m)"}</span>
                </button>
              </div>
            </div>

            {/* Standalone Boost Purchases */}
            <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <span style={{ fontSize: "0.88rem", color: "#d1bfd4" }}>
                Need more boosts? Purchase standalone packages without subscription:
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="button quiet"
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "0 14px" }}
                  onClick={() => handlePurchase("jm.boost.1")}
                >
                  1 Boost ({money(399, selectedCurrency)})
                </button>
                <button
                  type="button"
                  className="button quiet"
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "0 14px" }}
                  onClick={() => handlePurchase("jm.boost.5")}
                >
                  5 Boosts ({money(1499, selectedCurrency)})
                </button>
              </div>
            </div>
          </div>

          {/* Statements & Invoices Section */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon-badge emerald">
                <Icon name="discover" />
              </div>
              <div className="settings-card-titles">
                <h2>Statements & Invoices</h2>
                <p>Tax receipts and historical billing records for your subscription.</p>
              </div>
            </div>

            {documents.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: "16px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>{formatDate(doc.created_at || doc.createdAt, state.prefs?.timezone)}</td>
                        <td>{doc.documentType || "Juicy Match Membership"}</td>
                        <td>{money(doc.amount_cents || doc.amount || 0, doc.currency || "USD")}</td>
                        <td><span className="pill good">Paid</span></td>
                        <td>
                          <span style={{ fontSize: "0.78rem", color: "#a794ab", fontFamily: "monospace" }}>
                            {doc.id || "rec-verified"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "24px", textAlign: "center", color: "#a794ab", fontSize: "0.9rem" }}>
                No past billing statements on record.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
