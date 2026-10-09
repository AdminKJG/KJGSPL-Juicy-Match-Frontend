import React from "react";
import { money } from "../../../utils/formatters";
import { normalizePlanKey } from "../../../utils/planUtils";

/**
 * MembershipTiers
 * ────────────────────────────────────────────────────────────────────────────
 * Renders the 3 subscription tiers aligned with Section 1.3:
 * - Explore (Free, $0)
 * - Connect ($14.99/mo, $39.99/3mo)
 * - Premium ($24.99/mo, $64.99/3mo)
 */
export default function MembershipTiers({
  activePlan: propActivePlan = "explore",
  billingInterval = "monthly",
  selectedCurrency = "USD",
  purchasing = false,
  availableQuotes = [],
  onSelectPlan,
}) {
  const activePlan = normalizePlanKey(propActivePlan);

  const quotes = Array.isArray(availableQuotes) ? availableQuotes : [];
  const connectQuote = quotes.find(
    (q) => (q.plan === "connect" || q.sku?.includes("connect")) &&
           (billingInterval === "monthly" ? (q.interval === "month" || q.sku?.includes("monthly")) : (q.interval === "quarter" || q.sku?.includes("quarterly")))
  );
  const premiumQuote = quotes.find(
    (q) => (q.plan === "premium" || q.sku?.includes("premium")) &&
           (billingInterval === "monthly" ? (q.interval === "month" || q.sku?.includes("monthly")) : (q.interval === "quarter" || q.sku?.includes("quarterly")))
  );

  const formatTierPrice = (quote, fallbackCents) => {
    if (quote?.price != null) {
      const p = quote.price;
      const cur = quote.currency || selectedCurrency;
      if (p < 100 && p > 0 && !Number.isInteger(p)) {
        return money(p, cur, 0);
      }
      if (p >= 100) {
        return money(p, cur);
      }
      return money(p, cur, 0);
    }
    return money(fallbackCents, selectedCurrency);
  };

  const connectFcGrant = connectQuote?.featureCredits ?? 1000;
  const connectAiGrant = connectQuote?.aiCredits ?? 100;
  const connectSku = connectQuote?.sku || (billingInterval === "monthly" ? "jm.connect.monthly" : "jm.connect.quarterly");

  const premiumFcGrant = premiumQuote?.featureCredits ?? 2500;
  const premiumAiGrant = premiumQuote?.aiCredits ?? 250;
  const premiumSku = premiumQuote?.sku || (billingInterval === "monthly" ? "jm.premium.monthly" : "jm.premium.quarterly");
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      {/* ── 1. Explore (Free) ── */}
      <article
        className={`flex flex-col p-6 sm:p-7 rounded-3xl border transition-all ${
          activePlan === "explore"
            ? "bg-white/10 border-pink/50 shadow-[0_0_20px_rgba(233,22,113,0.15)] md:-translate-y-1"
            : "bg-surface border-white/10 hover:border-white/20"
        }`}
      >
        <div className="text-pink text-[0.72rem] font-extrabold uppercase tracking-widest mb-1.5">
          STARTER PLAN
        </div>
        <h3 className="text-2xl font-serif font-bold text-white m-0">Explore</h3>
        <div className="flex items-baseline gap-2 mt-3 mb-5">
          <span className="text-4xl font-bold text-white tracking-tight">
            {money(0, selectedCurrency)}
          </span>
          <span className="text-muted font-medium text-xs">/ forever</span>
        </div>
        <p className="text-[0.92rem] text-muted leading-relaxed mb-6">
          Core privacy-first matchmaking with initial signup credit grants.
        </p>

        <ul className="flex flex-col gap-3 mb-8 flex-1 text-xs sm:text-[0.88rem] text-white">
          <li className="flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>100 Feature Credits</strong> on signup</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>20 AI Credits</strong> on signup</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>10 Disclosed profiles & likes daily</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Voice & Video calls (5-15 FC/min)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>10 min Go Live broadcast / month</span>
          </li>
        </ul>

        <button
          type="button"
          disabled={activePlan === "explore"}
          className={`flex items-center justify-center w-full h-[46px] rounded-full font-semibold transition-all text-xs cursor-pointer ${
            activePlan === "explore"
              ? "bg-white/5 border border-white/10 text-white/50 cursor-default"
              : "bg-white text-black hover:bg-cream"
          }`}
        >
          {activePlan === "explore" ? "Current Active Plan" : "Free Plan"}
        </button>
      </article>

      {/* ── 2. Connect ($14.99 / mo) ── */}
      <article
        className={`flex flex-col p-6 sm:p-7 rounded-3xl border transition-all relative ${
          activePlan === "connect"
            ? "bg-pink/15 border-pink shadow-[0_0_30px_rgba(233,22,113,0.3)] md:-translate-y-3"
            : "bg-gradient-to-b from-surface to-pink/5 border-pink/30 shadow-[0_8px_24px_rgba(233,22,113,0.15)] hover:border-pink/50 md:-translate-y-2"
        }`}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink to-rose-500 text-white text-[0.68rem] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
          POPULAR CHOICE
        </div>
        <div className="text-pink text-[0.72rem] font-extrabold uppercase tracking-widest mb-1.5">
          CONNECT PLAN
        </div>
        <h3 className="text-2xl font-serif font-bold text-white m-0">Connect</h3>
        <div className="flex items-baseline gap-2 mt-3 mb-5">
          <span className="text-4xl font-bold text-white tracking-tight">
            {formatTierPrice(connectQuote, billingInterval === "monthly" ? 1499 : 3999)}
          </span>
          <span className="text-muted font-medium text-xs">
            /{billingInterval === "monthly" ? "month" : "3 months"}
          </span>
        </div>
        <p className="text-[0.92rem] text-muted leading-relaxed mb-6">
          Generous monthly credits for regular calls, discovery and AI coaching.
        </p>

        <ul className="flex flex-col gap-3 mb-8 flex-1 text-xs sm:text-[0.88rem] text-white">
          <li className="flex items-start gap-2.5">
            <span className="text-pink font-bold">✓</span>
            <span><strong>{connectFcGrant.toLocaleString()} Feature Credits</strong> / month (~{Math.floor(connectFcGrant / 5)}m voice)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-pink font-bold">✓</span>
            <span><strong>{connectAiGrant.toLocaleString()} AI Credits</strong> / month (Wingman & Bio polish)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-pink font-bold">✓</span>
            <span><strong>20 Daily profiles & likes</strong> quota</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-pink font-bold">✓</span>
            <span>Advanced Search & Saved filters</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-pink font-bold">✓</span>
            <span>Passport 24h passes for 50 FC</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-pink font-bold">✓</span>
            <span>60 min Go Live broadcast / month</span>
          </li>
        </ul>

        <button
          type="button"
          disabled={activePlan === "connect" || purchasing}
          onClick={() => onSelectPlan(connectSku)}
          className="flex items-center justify-center w-full h-[46px] rounded-full font-bold transition-all bg-pink text-white hover:bg-[#ff2a85] shadow-[0_4px_14px_rgba(233,22,113,0.4)] text-xs cursor-pointer"
        >
          {activePlan === "connect" ? "Current Active Plan" : "Upgrade to Connect"}
        </button>
      </article>

      {/* ── 3. Premium VIP ($24.99 / mo) ── */}
      <article
        className={`flex flex-col p-6 sm:p-7 rounded-3xl border transition-all ${
          activePlan === "premium"
            ? "bg-purple-900/20 border-purple-500/70 shadow-[0_0_30px_rgba(168,85,247,0.3)] md:-translate-y-2"
            : "bg-surface border-white/10 hover:border-white/20"
        }`}
      >
        <div className="text-purple-400 text-[0.72rem] font-extrabold uppercase tracking-widest mb-1.5">
          PREMIUM VIP
        </div>
        <h3 className="text-2xl font-serif font-bold text-white m-0">Premium</h3>
        <div className="flex items-baseline gap-2 mt-3 mb-5">
          <span className="text-4xl font-bold text-white tracking-tight">
            {formatTierPrice(premiumQuote, billingInterval === "monthly" ? 2499 : 6499)}
          </span>
          <span className="text-muted font-medium text-xs">
            /{billingInterval === "monthly" ? "month" : "3 months"}
          </span>
        </div>
        <p className="text-[0.92rem] text-muted leading-relaxed mb-6">
          Unlimited lifestyle experience with included Passport and maximum grants.
        </p>

        <ul className="flex flex-col gap-3 mb-8 flex-1 text-xs sm:text-[0.88rem] text-white">
          <li className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold">✓</span>
            <span><strong>{premiumFcGrant.toLocaleString()} Feature Credits</strong> / month (~{Math.floor(premiumFcGrant / 5)}m voice)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold">✓</span>
            <span><strong>{premiumAiGrant.toLocaleString()} AI Credits</strong> / month for coach & insights</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold">✓</span>
            <span><strong>30 Daily profiles & likes</strong> quota</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold">✓</span>
            <span><strong>Passport Included</strong> (no pass FC required)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold">✓</span>
            <span>120 min Go Live broadcast / month</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-purple-400 font-bold">✓</span>
            <span>Priority concierge support & badges</span>
          </li>
        </ul>

        <button
          type="button"
          disabled={activePlan === "premium" || purchasing}
          onClick={() => onSelectPlan(premiumSku)}
          className="flex items-center justify-center w-full h-[46px] rounded-full font-bold transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_4px_14px_rgba(147,51,234,0.4)] text-xs cursor-pointer"
        >
          {activePlan === "premium" ? "Current Active Plan" : "Upgrade to Premium"}
        </button>
      </article>
    </div>
  );
}
