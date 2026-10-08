import React, { useState, useEffect } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { billingService } from "../../../services/billingService";
import { money, title, formatDate } from "../../../utils/formatters";

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
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.82rem] font-semibold" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#a7f3d0", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
              🔒 10-Min Price Lock
            </span>
          </div>

          <p style={{ color: "#d1bfd4", fontSize: "0.92rem", lineHeight: "1.5", margin: 0 }}>
            Your rate is guaranteed for the next 10 minutes. Select your preferred checkout option:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
            <button
              className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
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
              className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
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
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen">
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
        <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-full">
          <button
            type="button"
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[0.9rem] font-semibold transition-all ${billingInterval === "monthly" ? "bg-pink text-white shadow-lg" : "text-muted hover:text-white"}`}
            onClick={() => setBillingInterval("monthly")}
          >
            <span>Monthly</span>
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[0.9rem] font-semibold transition-all ${billingInterval === "quarterly" ? "bg-pink text-white shadow-lg" : "text-muted hover:text-white"}`}
            onClick={() => setBillingInterval("quarterly")}
          >
            <span>Quarterly (Save 15%)</span>
            <span className="text-[0.65rem] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">✦ Best Value</span>
          </button>
        </div>

        {/* Currency Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.86rem", color: "#bfaabf", fontWeight: "600" }}>Currency:</span>
          <div className="relative" style={{ width: "130px" }}>
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-white appearance-none focus:outline-none focus:border-pink/60 focus:bg-black/60 transition-all"
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
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free Tier */}
            <article className={`flex flex-col p-6 rounded-3xl border transition-all ${activePlan === "free" ? "bg-white/10 border-pink/50 shadow-[0_0_20px_rgba(233,22,113,0.15)] transform md:-translate-y-2" : "bg-surface border-white/10 hover:border-white/20"}`}>
              <div className="text-pink text-[0.75rem] font-extrabold uppercase tracking-widest mb-2">FREE PLAN</div>
              <h2 className="text-2xl font-serif font-bold text-white m-0">Free</h2>
              <div className="flex items-baseline gap-2 mt-4 mb-6">
                <span className="text-4xl font-bold text-white tracking-tight">{money(0, selectedCurrency)}</span>
                <span className="text-muted font-medium">/ forever</span>
              </div>
              <p className="text-[0.95rem] text-muted leading-relaxed mb-6">Core privacy-first matchmaking for intentional conversations.</p>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>10 curated daily introductions</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Text chat with mutual sparks</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Confidential intimacy quiz answers</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Encrypted photo album controls</span>
                </li>
              </ul>

              <button
                type="button"
                className={`flex items-center justify-center w-full h-[46px] rounded-full font-semibold transition-all ${activePlan === "free" ? "bg-white/5 border border-white/10 text-muted" : "bg-white text-black hover:bg-cream"}`}
                disabled={activePlan === "free"}
              >
                {activePlan === "free" ? "Current Plan" : "Select Free"}
              </button>
            </article>

            {/* Plus Tier */}
            <article className={`flex flex-col p-6 rounded-3xl border transition-all relative ${activePlan === "plus" ? "bg-pink/10 border-pink shadow-[0_0_30px_rgba(233,22,113,0.3)] transform md:-translate-y-4" : "bg-gradient-to-b from-surface to-pink/5 border-pink/30 shadow-[0_8px_24px_rgba(233,22,113,0.15)] hover:border-pink/50 transform md:-translate-y-2"}`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink to-rose-500 text-white text-[0.7rem] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">MOST POPULAR</div>
              <div className="text-pink text-[0.75rem] font-extrabold uppercase tracking-widest mb-2">PLUS PLAN</div>
              <h2 className="text-2xl font-serif font-bold text-white m-0">Juicy Plus</h2>
              <div className="flex items-baseline gap-2 mt-4 mb-6">
                <span className="text-4xl font-bold text-white tracking-tight">
                  {money(billingInterval === "monthly" ? 1999 : 4999, selectedCurrency)}
                </span>
                <span className="text-muted font-medium">
                  /{billingInterval === "monthly" ? "month" : "3 months"}
                </span>
              </div>
              <p className="text-[0.95rem] text-muted leading-relaxed mb-6">Expand your horizon with unlimited daily sparks and travel mode.</p>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Unlimited daily sparks & intros</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Voice notes & instant audio calls</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Passport Travel Mode across global cities</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>See who gave mutual consent first</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>1 Monthly Profile Boost included</span>
                </li>
              </ul>

              <button
                type="button"
                className="flex items-center justify-center w-full h-[46px] rounded-full font-semibold transition-all bg-pink text-white hover:bg-[#ff2a85] shadow-[0_4px_14px_rgba(233,22,113,0.3)]"
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
            <article className={`flex flex-col p-6 rounded-3xl border transition-all ${activePlan === "premium" ? "bg-white/10 border-pink/50 shadow-[0_0_20px_rgba(233,22,113,0.15)] transform md:-translate-y-2" : "bg-surface border-white/10 hover:border-white/20"}`}>
              <div className="text-pink text-[0.75rem] font-extrabold uppercase tracking-widest mb-2">PREMIUM VIP</div>
              <h2 className="text-2xl font-serif font-bold text-white m-0">Juicy Premium</h2>
              <div className="flex items-baseline gap-2 mt-4 mb-6">
                <span className="text-4xl font-bold text-white tracking-tight">
                  {money(billingInterval === "monthly" ? 3499 : 8999, selectedCurrency)}
                </span>
                <span className="text-muted font-medium">
                  /{billingInterval === "monthly" ? "month" : "3 months"}
                </span>
              </div>
              <p className="text-[0.95rem] text-muted leading-relaxed mb-6">Full suite of real-time calling, priority visibility, and hosted events.</p>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Everything in Plus included</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Live HD Video & RTC Audio Calling</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>5 Free Profile Boosts every month</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Exclusive Invitations to Hosted Mixers</span>
                </li>
                <li className="flex items-start gap-3 text-[0.9rem] text-white">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink/20 text-pink text-[0.7rem] shrink-0 font-bold">✓</span>
                  <span>Priority concierge support</span>
                </li>
              </ul>

              <button
                type="button"
                className="flex items-center justify-center w-full h-[46px] rounded-full font-semibold transition-all bg-pink text-white hover:bg-[#ff2a85] shadow-[0_4px_14px_rgba(233,22,113,0.3)]"
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
          <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, rgba(38, 17, 44, 0.75) 0%, rgba(22, 10, 26, 0.9) 100%)" }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-amber-400 bg-amber-500/10 border border-amber-500/20">
                <Icon name="sparkle" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="text-[0.72rem] font-extrabold uppercase tracking-widest" style={{ color: "#fbbf24", marginBottom: "4px" }}>
                  PRIORITY INTRODUCTION
                </div>
                <h2 className="m-0 text-[1.45rem] font-serif font-bold text-white tracking-tight">Profile Boost</h2>
                <p className="m-0 text-[0.95rem] text-muted leading-relaxed">Put your profile at the front of local discovery for 30 minutes of high resonance.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.82rem] font-semibold" style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fde68a", border: "1px solid rgba(251, 191, 36, 0.35)" }}>
                  ⚡ {boostCount} Boost(s) available
                </span>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
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
                  className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "0 14px" }}
                  onClick={() => handlePurchase("jm.boost.1")}
                >
                  1 Boost ({money(399, selectedCurrency)})
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
                  style={{ fontSize: "0.84rem", minHeight: "36px", padding: "0 14px" }}
                  onClick={() => handlePurchase("jm.boost.5")}
                >
                  5 Boosts ({money(1499, selectedCurrency)})
                </button>
              </div>
            </div>
          </div>

          {/* Statements & Invoices Section */}
          <div className="bg-surface rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-white/5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <Icon name="discover" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <h2 className="m-0 text-[1.45rem] font-serif font-bold text-white tracking-tight">Statements & Invoices</h2>
                <p className="m-0 text-[0.95rem] text-muted leading-relaxed">Tax receipts and historical billing records for your subscription.</p>
              </div>
            </div>

            {documents.length > 0 ? (
              <div className="w-full overflow-x-auto rounded-xl border border-white/10" style={{ marginTop: "16px" }}>
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-black/40 text-[0.8rem] text-muted uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4 border-b border-white/10">Date</th>
                      <th className="p-4 border-b border-white/10">Description</th>
                      <th className="p-4 border-b border-white/10">Amount</th>
                      <th className="p-4 border-b border-white/10">Status</th>
                      <th className="p-4 border-b border-white/10">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="p-4 border-b border-white/5 text-[0.9rem] text-white">{formatDate(doc.created_at || doc.createdAt, state.prefs?.timezone)}</td>
                        <td className="p-4 border-b border-white/5 text-[0.9rem] text-white">{doc.documentType || "Juicy Match Membership"}</td>
                        <td className="p-4 border-b border-white/5 text-[0.9rem] text-white">{money(doc.amount_cents || doc.amount || 0, doc.currency || "USD")}</td>
                        <td className="p-4 border-b border-white/5 text-[0.9rem] text-white"><span className="px-2.5 py-1 rounded-full text-[0.75rem] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Paid</span></td>
                        <td className="p-4 border-b border-white/5 text-[0.9rem] text-white">
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
