import React, { useState, useEffect } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { billingService } from "../../../services/billingService";
import { money, formatDate } from "../../../utils/formatters";

import MembershipTiers from "./MembershipTiers";
import CreditPacksSection from "./CreditPacksSection";
import CheckoutModal from "./CheckoutModal";
import { normalizePlanKey, getPlanDisplayName } from "../../../utils/planUtils";
import { resolvePlanPrice, setDynamicCatalogQuotes, setDynamicExchangeRates } from "../../../utils/pricingUtils";

/**
 * MembershipView
 * ────────────────────────────────────────────────────────────────────────────
 * Simplified, high-converting Membership & Top-Up Portal:
 * - Tab 1: Subscription Plans (Explore Free, Connect, Premium)
 * - Tab 2: Top-Up Credits (Feature Credits & AI Credits packs)
 * - Direct 1-Click Razorpay Checkout on all cards
 */
export default function MembershipView() {
  const { state, openModal, closeModal, updateWallet, updateSubscription, refreshWallet } = useApp();

  const [billing, setBilling] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [billingInterval, setBillingInterval] = useState("monthly"); // "monthly" | "quarterly"
  const [purchasing, setPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("jm_membership_tab") || "plans";
  });
  const [showInvoices, setShowInvoices] = useState(false);

  useEffect(() => {
    const handleSwitch = (e) => {
      if (e.detail && (e.detail === "plans" || e.detail === "topups")) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("jm_switch_membership_tab", handleSwitch);
    return () => window.removeEventListener("jm_switch_membership_tab", handleSwitch);
  }, []);

  const loadBillingData = async (curr = selectedCurrency) => {
    setLoading(true);
    try {
      const bRes = await billingService.getBillingState(curr).catch(() => null);
      if (bRes) {
        if (!bRes.availableQuotes || bRes.availableQuotes.length === 0) {
          const plansRes = await billingService.getPlans(curr).catch(() => null);
          if (plansRes?.plans) {
            bRes.availableQuotes = plansRes.plans.map((p) => ({
              sku: p.id,
              name: p.name,
              price: p.amount,
              formattedPrice: p.formatted,
              currency: plansRes.currency || curr,
              benefits: p.benefits,
            }));
          } else {
            const catRes = await billingService.getCatalog(curr).catch(() => null);
            if (catRes) {
              bRes.availableQuotes = Array.isArray(catRes)
                ? catRes
                : catRes.availableQuotes || catRes.quotes || catRes.items || [];
            }
          }
        }
        if (bRes.availableQuotes) {
          setDynamicCatalogQuotes(bRes.availableQuotes, curr);
        }
        if (bRes.rates) {
          setDynamicExchangeRates(bRes.rates);
        } else {
          billingService.getRates().then((r) => {
            if (r?.rates) setDynamicExchangeRates(r.rates);
          }).catch(() => {});
        }
        setBilling(bRes);
        refreshWallet?.();
        if (bRes.subscription || bRes.plan) {
          updateSubscription?.(bRes.subscription || bRes.plan);
        }
      }
    } catch {}

    try {
      const dRes = await billingService.getDocuments?.().catch(() => null);
      if (dRes?.items) setDocuments(dRes.items);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData(selectedCurrency);
  }, [selectedCurrency]);

  const handleSelectPlan = (sku) => {
    const isQuarterly = sku.includes("quarterly");
    const isPremium = sku.includes("premium");
    const quote = (billing?.availableQuotes || []).find((q) => q.sku === sku);
    const planName = isPremium ? "Premium VIP" : "Connect Plan";
    const planPrice = resolvePlanPrice(sku, selectedCurrency, quote);

    openModal(
      `Confirm ${planName} Upgrade`,
      <CheckoutModal
        item={{
          sku,
          name: planName,
          credits: isPremium ? 2500 : 1000,
          price: planPrice,
          currency: selectedCurrency,
        }}
        quote={quote || { sku, price: planPrice, currency: selectedCurrency }}
        type="subscription"
        selectedCurrency={selectedCurrency}
        onSuccess={() => loadBillingData(selectedCurrency)}
        onClose={() => closeModal()}
      />
    );
  };

  const rawPlan = (
    billing?.subscription?.planKey ||
    billing?.plan ||
    state.subscription?.planKey ||
    state.subscription?.plan ||
    state.subscription?.name ||
    state.entitlement?.plan ||
    "explore"
  );
  const activePlan = normalizePlanKey(rawPlan);
  const activePlanDisplayName = getPlanDisplayName(activePlan);

  const currentFC = state.wallet?.featureCredits !== undefined ? Number(state.wallet.featureCredits) : 0;
  const currentAI = state.wallet?.aiCredits !== undefined ? Number(state.wallet.aiCredits) : 0;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 min-h-screen font-sans">
      <PageHead
        showBack
        backTo="discover"
        backLabel="Back to Discovery"
        kicker="Membership & Dual Wallet"
        heading="Subscriptions & Credits"
        description="Choose a monthly plan for regular allowances, or top up instant non-expiring credits anytime."
      />

      {/* ── Top Status Banner: Current Active Status & Dual Balances ── */}
      <div className="bg-gradient-to-r from-[#2c1334] via-[#1c0c22] to-[#120716] border border-white/10 rounded-3xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink/20 border border-pink/40 flex items-center justify-center text-2xl shadow-lg">
            👑
          </div>
          <div>
            <span className="text-[11px] font-bold text-pink uppercase tracking-widest flex items-center gap-1.5">
              Current Membership · {activePlan === "explore" ? "Free Starter" : "Active Subscriber"}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white m-0 tracking-tight">
              {activePlanDisplayName} Plan
            </h3>
            <span className="text-xs text-white/60">
              {activePlan === "premium"
                ? "VIP access · Unlimited Passport · 2,500 FC monthly"
                : activePlan === "connect"
                ? "Full connection suite · 1,000 FC monthly"
                : "Explore starter tier · Introductory signup credits active"}
            </span>
          </div>
        </div>

        {/* Dual Balances Display */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col min-w-[130px]">
            <span className="text-[10px] uppercase font-bold text-amber-300/80">
              Feature Credits
            </span>
            <span className="text-lg font-extrabold text-amber-300">
              ⚡ {currentFC.toLocaleString()} FC
            </span>
            <span className="text-[10px] text-amber-200/60 mt-0.5">
              Voice/Video Calls & Likes
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col min-w-[130px]">
            <span className="text-[10px] uppercase font-bold text-purple-300/80">
              AI Credits
            </span>
            <span className="text-lg font-extrabold text-purple-300">
              ✦ {currentAI.toLocaleString()} AI
            </span>
            <span className="text-[10px] text-purple-200/60 mt-0.5">
              AI Wingman & Coaching
            </span>
          </div>
        </div>
      </div>

      {/* ── 2 Main Flow Tabs: Subscription Plans VS Top-Up Credits ── */}
      <div className="flex items-center justify-center sm:justify-start gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl mb-7 max-w-md backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${
            activeTab === "plans"
              ? "bg-gradient-to-r from-pink to-rose-600 text-white shadow-[0_4px_16px_rgba(233,22,113,0.4)]"
              : "bg-transparent text-white/60 hover:text-white"
          }`}
        >
          <Icon name="crown" className="w-4 h-4" />
          <span>Subscription Plans</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("topups")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${
            activeTab === "topups"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_4px_16px_rgba(245,158,11,0.35)]"
              : "bg-transparent text-white/60 hover:text-white"
          }`}
        >
          <Icon name="sparkle" className="w-4 h-4" />
          <span>Top-Up Credits</span>
        </button>
      </div>

      {loading ? (
        <Loader text="Loading membership details and quotes…" />
      ) : (
        <div className="flex flex-col gap-8">
          {/* TAB 1: SUBSCRIPTION PLANS */}
          {activeTab === "plans" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Filter controls: Billing Interval & Currency */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-full">
                  <button
                    type="button"
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      billingInterval === "monthly"
                        ? "bg-pink text-white shadow-lg"
                        : "text-muted hover:text-white"
                    }`}
                    onClick={() => setBillingInterval("monthly")}
                  >
                    <span>Monthly</span>
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      billingInterval === "quarterly"
                        ? "bg-pink text-white shadow-lg"
                        : "text-muted hover:text-white"
                    }`}
                    onClick={() => setBillingInterval("quarterly")}
                  >
                    <span>Quarterly (Save Up to 20%)</span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      ✦ Value
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-muted font-semibold">Currency:</span>
                  <div className="relative w-32">
                    <select
                      className="w-full bg-black/40 border border-white/10 rounded-xl h-10 px-3 text-xs text-white appearance-none focus:outline-none focus:border-pink/60 transition-all cursor-pointer"
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiers Grid */}
              <MembershipTiers
                activePlan={activePlan}
                billingInterval={billingInterval}
                selectedCurrency={selectedCurrency}
                purchasing={purchasing}
                availableQuotes={billing?.availableQuotes}
                onSelectPlan={handleSelectPlan}
              />
            </div>
          )}

          {/* TAB 2: CREDIT PACKS TOP-UP */}
          {activeTab === "topups" && (
            <div className="animate-fade-in">
              <CreditPacksSection
                selectedCurrency={selectedCurrency}
                onReload={loadBillingData}
                availableQuotes={billing?.availableQuotes}
              />
            </div>
          )}

          {/* Collapsible Statements & Invoices Accordion */}
          <div className="mt-4 pt-6 border-t border-white/10 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowInvoices((prev) => !prev)}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <div>
                  <h4 className="text-sm font-bold text-white m-0">Statements & Invoices</h4>
                  <p className="text-xs text-white/50 m-0">View past payment receipts and billing history</p>
                </div>
              </div>
              <span className="text-white/60 text-xs font-bold px-3 py-1 rounded-lg bg-white/5">
                {showInvoices ? "Hide ▲" : "View ▼"}
              </span>
            </button>

            {showInvoices && (
              <div className="bg-gradient-to-b from-[#190a1e] to-[#110514] rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col gap-4 shadow-xl animate-fade-in">
                {documents.length > 0 ? (
                  <div className="w-full overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="bg-black/40 text-[11px] text-muted uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3.5 border-b border-white/10">Date</th>
                          <th className="p-3.5 border-b border-white/10">Description</th>
                          <th className="p-3.5 border-b border-white/10">Amount</th>
                          <th className="p-3.5 border-b border-white/10">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id}>
                            <td className="p-3.5 border-b border-white/5 text-xs text-white">
                              {formatDate(doc.created_at || doc.createdAt, state.prefs?.timezone)}
                            </td>
                            <td className="p-3.5 border-b border-white/5 text-xs text-white">
                              {doc.documentType || "Juicy Match Membership"}
                            </td>
                            <td className="p-3.5 border-b border-white/5 text-xs text-white font-semibold">
                              {money(doc.amount_cents || doc.amount || 0, doc.currency || "USD")}
                            </td>
                            <td className="p-3.5 border-b border-white/5 text-xs">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Paid
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-6 text-center text-white/50 text-xs">
                    No past billing statements on record.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
