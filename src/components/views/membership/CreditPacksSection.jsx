import React from "react";
import { useApp } from "../../../context/AppContext";
import CheckoutModal from "./CheckoutModal";
import { formatPrice, resolveCreditPackPrice } from "../../../utils/pricingUtils";

/**
 * CreditPacksSection
 * ────────────────────────────────────────────────────────────────────────────
 * Renders Top-Up packs for Feature Credits (FC) and AI Credits.
 * Note: Purchased top-ups NEVER expire (Section 1.2 FEFO engine).
 */
export default function CreditPacksSection({ selectedCurrency = "USD", onReload, availableQuotes = [] }) {
  const { openModal, closeModal } = useApp();

  const rawQuotes = Array.isArray(availableQuotes) ? availableQuotes : [];

  const defaultFcQuotes = [
    {
      sku: "credits.feature.500",
      amount: 500,
      name: "500 Feature Credits",
      desc: "100 voice mins or 33 video mins",
      badge: null,
    },
    {
      sku: "credits.feature.1000",
      amount: 1000,
      name: "1,000 Feature Credits",
      desc: "200 voice mins or 66 video mins",
      badge: "Popular",
    },
    {
      sku: "credits.feature.2500",
      amount: 2500,
      name: "2,500 Feature Credits",
      desc: "500 voice mins or 166 video mins",
      badge: "Best Value",
    },
  ];

  const defaultAiQuotes = [
    {
      sku: "credits.ai.50",
      amount: 50,
      name: "50 AI Credits",
      desc: "50 wingman replies or 25 bio advice",
      badge: null,
    },
    {
      sku: "credits.ai.150",
      amount: 150,
      name: "150 AI Credits",
      desc: "150 wingman replies or 75 bio advice",
      badge: "Popular",
    },
    {
      sku: "credits.ai.400",
      amount: 400,
      name: "400 AI Credits",
      desc: "Comprehensive chemistry & AI coaching",
      badge: "Best Value",
    },
  ];

  const matchedFcQuotes = rawQuotes.filter(
    (q) =>
      (q.kind === "topup" || q.type === "topup" || !q.plan) &&
      (q.sku?.includes("feature") || q.sku?.includes(".fc.") || q.name?.toLowerCase().includes("feature"))
  );
  const activeFcSources = matchedFcQuotes.length > 0 ? matchedFcQuotes : defaultFcQuotes;

  const fcPacks = activeFcSources.map((s) => {
    const sku = s.sku;
    const credits = s.amount ?? s.credits ?? 0;
    const price = resolveCreditPackPrice(sku, selectedCurrency, s);
    return {
      sku,
      credits,
      price,
      formattedPrice: s.formattedPrice || null,
      amount: s.amount,
      rawQuote: s,
      currency: selectedCurrency,
      label: s.name || `${credits} Feature Credits`,
      desc: s.desc || `${Math.floor(credits / 5)} voice mins or ${Math.floor(credits / 15)} video mins`,
      badge: s.badge || null,
    };
  });

  const matchedAiQuotes = rawQuotes.filter(
    (q) =>
      (q.kind === "topup" || q.type === "topup" || !q.plan) &&
      (q.sku?.includes(".ai.") || q.sku?.includes("credits.ai") || q.name?.toLowerCase().includes("ai"))
  );
  const activeAiSources = matchedAiQuotes.length > 0 ? matchedAiQuotes : defaultAiQuotes;

  const aiPacks = activeAiSources.map((s) => {
    const sku = s.sku;
    const credits = s.amount ?? s.credits ?? 0;
    const price = resolveCreditPackPrice(sku, selectedCurrency, s);
    return {
      sku,
      credits,
      price,
      formattedPrice: s.formattedPrice || null,
      amount: s.amount,
      rawQuote: s,
      currency: selectedCurrency,
      label: s.name || `${credits} AI Credits`,
      desc: s.desc || `${credits} wingman replies or bio advice`,
      badge: s.badge || null,
    };
  });

  const handleBuyPack = (pack, isAi = false) => {
    openModal(
      `Top Up ${pack.credits} ${isAi ? "AI Credits" : "Feature Credits"}`,
      <CheckoutModal
        item={pack}
        type="credits"
        isAi={isAi}
        selectedCurrency={selectedCurrency}
        onSuccess={() => onReload?.()}
        onClose={() => closeModal()}
      />
    );
  };

  return (
    <div className="bg-gradient-to-b from-[#1a0a20] to-[#120615] rounded-3xl border border-white/10 p-6 md:p-8 flex flex-col gap-7 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#fbbf24] px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 inline-block mb-1.5">
            DUAL-CREDIT WALLET STORE
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white m-0 tracking-tight">
            Non-Expiring Top-Up Credits
          </h3>
          <p className="text-xs sm:text-sm text-white/60 m-0 mt-1">
            Top-up balances are preserved forever under our First-Expiring-First-Out engine even if subscriptions lapse.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
          <span>🔒 Razorpay / Cards / UPI</span>
        </div>
      </div>

      {/* Feature Credits Grid */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-amber-300 m-0 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">⚡</span>
            <span>Feature Credits Packs</span>
            <span className="text-[11px] font-normal text-white/50 lowercase hidden sm:inline">(voice & video calls, daily stacks, boosts)</span>
          </h4>
        </div>

        {fcPacks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-white/50 flex flex-col items-center justify-center gap-2">
            <span className="text-xl">⚡</span>
            <span>Waiting for live Feature Credit packages from backend catalog.</span>
            <span className="text-[11px] text-white/30">Requires backend GET /v1/billing to include availableQuotes.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fcPacks.map((pack) => (
              <div
                key={pack.sku}
                className="bg-gradient-to-b from-black/40 via-amber-950/10 to-black/30 border border-amber-500/25 hover:border-amber-400/60 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 relative group overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(245,158,11,0.18)]"
              >
                {pack.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                    {pack.badge}
                  </span>
                )}
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80 mb-1">
                    Non-Expiring
                  </div>
                  <div className="text-2xl font-extrabold text-white flex items-center gap-1.5 tracking-tight group-hover:text-amber-300 transition-colors">
                    <span className="text-amber-400">⚡</span>
                    <span>+{pack.credits.toLocaleString()} FC</span>
                  </div>
                  <p className="text-xs text-white/60 m-0 mt-2 leading-relaxed">{pack.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-white/50 block font-medium">Price</span>
                    <span className="font-extrabold text-white text-base">
                      {pack.formattedPrice || formatPrice(pack.price, pack.currency, pack.rawQuote)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyPack(pack, false)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs transition-all cursor-pointer border-none shadow-[0_4px_12px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95"
                  >
                    Top Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Credits Grid */}
      <div className="flex flex-col gap-3.5 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-purple-300 m-0 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs">✦</span>
            <span>AI Credits Packs</span>
            <span className="text-[11px] font-normal text-white/50 lowercase hidden sm:inline">(wingman replies, compatibility reports, bio guide)</span>
          </h4>
        </div>

        {aiPacks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-white/50 flex flex-col items-center justify-center gap-2">
            <span className="text-xl">✦</span>
            <span>Waiting for live AI Credit packages from backend catalog.</span>
            <span className="text-[11px] text-white/30">Requires backend GET /v1/billing to include availableQuotes.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {aiPacks.map((pack) => (
              <div
                key={pack.sku}
                className="bg-gradient-to-b from-black/40 via-purple-950/15 to-black/30 border border-purple-500/25 hover:border-purple-400/60 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 relative group overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(168,85,247,0.18)]"
              >
                {pack.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm">
                    {pack.badge}
                  </span>
                )}
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-purple-400/80 mb-1">
                    Non-Expiring
                  </div>
                  <div className="text-2xl font-extrabold text-white flex items-center gap-1.5 tracking-tight group-hover:text-purple-300 transition-colors">
                    <span className="text-purple-400">✦</span>
                    <span>+{pack.credits.toLocaleString()} AI</span>
                  </div>
                  <p className="text-xs text-white/60 m-0 mt-2 leading-relaxed">{pack.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-white/50 block font-medium">Price</span>
                    <span className="font-extrabold text-white text-base">
                      {pack.formattedPrice || formatPrice(pack.price, pack.currency, pack.rawQuote)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyPack(pack, true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink hover:from-purple-400 hover:to-[#ff2a85] text-white font-extrabold text-xs transition-all cursor-pointer border-none shadow-[0_4px_12px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95"
                  >
                    Top Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
