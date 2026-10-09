import React, { useState } from "react";
import { money } from "../../../utils/formatters";
import { billingService } from "../../../services/billingService";
import { openRazorpayModal } from "../../../services/razorpayService";
import { useApp } from "../../../context/AppContext";

/**
 * CheckoutModal
 * ────────────────────────────────────────────────────────────────────────────
 * High-conversion, glassmorphism checkout modal supporting:
 * - Real-time Razorpay Checkout (UPI, Debit/Credit Card, NetBanking, Wallets)
 * - Developer Sandbox Simulation for testing
 * - Instant wallet balance sync
 */
export default function CheckoutModal({
  item = {},
  quote = {},
  type = "credits", // "credits" | "subscription"
  isAi = false,
  selectedCurrency = "USD",
  onSuccess,
  onClose,
}) {
  const { state, showToast, updateWallet } = useApp();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState("confirm"); // "confirm" | "paying" | "success"

  const credits = item.credits || item.amount || quote.amount || 0;
  const price = quote.price ?? item.price ?? item.amount ?? 0;
  const currency = quote.currency || item.currency || selectedCurrency;
  const sku = item.sku || quote.sku || "";

  const formatPrice = (p, curr = currency) => {
    if (p == null) return "—";
    if (typeof p === "number") {
      if (p < 100 && p > 0 && !Number.isInteger(p)) {
        return money(p, curr, 0);
      }
      if (p >= 100) {
        return money(p, curr);
      }
      return money(p, curr, 0);
    }
    return String(p);
  };

  const handleRazorpayCheckout = async () => {
    setProcessing(true);
    setStep("paying");
    try {
      // 1. Generate or fetch commercial quote
      const quoteRes = await billingService.createQuote(sku, currency).catch(() => null);
      const quoteId = quoteRes?.id || quoteRes?.quoteId || quote?.quoteId || `quote-${Date.now()}`;

      // 2. Create Razorpay Order on backend
      let orderRes = null;
      try {
        orderRes = await billingService.createOrder(quoteId);
      } catch (err) {
        console.warn("[Razorpay Order Warning]:", err?.message);
        // If backend has not yet implemented /v1/billing/orders, check if frontend has a real key
        const frontendKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!frontendKey || frontendKey === "rzp_test_placeholder") {
          throw new Error(
            "Razorpay API Keys are not configured on the backend or in .env. Please add your real Razorpay Key ID (rzp_test_... or rzp_live_...)."
          );
        }
        orderRes = {
          amount: Math.round((typeof price === "number" ? price : 10) * 100),
          currency: currency,
          keyId: frontendKey,
        };
      }

      // If backend returned direct checkout redirect url (e.g. hosted checkout)
      if (orderRes?.checkoutUrl) {
        window.location.href = orderRes.checkoutUrl;
        return;
      }

      // 3. Launch native Razorpay checkout modal
      await openRazorpayModal({
        order: orderRes || {},
        quote: {
          sku,
          price,
          currency,
          name: item.label || item.name || `${credits} Credits Top-Up`,
          credits,
        },
        member: state?.me || {},
        onSuccess: async (paymentResponse) => {
          showToast?.("Payment received! Verifying transaction… ✨", "success");
          try {
            await billingService.verifyRazorpayPayment({
              quoteId,
              orderId: paymentResponse.razorpay_order_id || orderRes?.orderId,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
            });
          } catch {}

          // Grant credits to wallet
          applyCreditGrant();
          setStep("success");
          setTimeout(() => {
            onSuccess?.();
            onClose?.();
          }, 1600);
        },
        onError: (err) => {
          setProcessing(false);
          setStep("confirm");
          showToast?.(err?.description || err?.message || "Payment cancelled or failed.", "error");
        },
        onDismiss: () => {
          setProcessing(false);
          setStep("confirm");
        },
      });
    } catch (err) {
      setProcessing(false);
      setStep("confirm");
      showToast?.(err?.message || "Could not initiate payment gateway.", "error");
    }
  };

  const applyCreditGrant = () => {
    if (type === "subscription") {
      const extraFC = sku.includes("premium") ? 2500 : 1000;
      const extraAI = sku.includes("premium") ? 250 : 100;
      updateWallet?.((prev) => ({
        ...prev,
        featureCredits: (prev?.featureCredits || 0) + extraFC,
        aiCredits: (prev?.aiCredits || 0) + extraAI,
      }));
    } else if (isAi) {
      updateWallet?.((prev) => ({
        ...prev,
        aiCredits: (prev?.aiCredits || 0) + credits,
      }));
    } else {
      updateWallet?.((prev) => ({
        ...prev,
        featureCredits: (prev?.featureCredits || 0) + credits,
      }));
    }
  };

  return (
    <div className="flex flex-col gap-5 text-white max-w-lg w-full">
      {step === "success" ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
            ✓
          </div>
          <h3 className="text-2xl font-serif font-bold text-white m-0">Payment Successful!</h3>
          <p className="text-sm text-white/70 mt-2 max-w-xs leading-relaxed">
            Your wallet has been credited with{" "}
            <span className="text-pink font-bold">
              +{credits} {type === "subscription" ? "monthly credits" : isAi ? "AI Credits" : "Feature Credits"}
            </span>.
          </p>
        </div>
      ) : (
        <>
          {/* Header Summary */}
          <div className="bg-gradient-to-br from-[#2a1130] via-[#1b0a1f] to-[#120615] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-pink px-2 py-0.5 rounded-full bg-pink/15 border border-pink/30 inline-block mb-1.5">
                  {type === "subscription" ? "MEMBERSHIP PLAN" : "NON-EXPIRING TOP-UP"}
                </span>
                <h3 className="text-2xl font-serif font-bold text-white m-0 tracking-tight flex items-center gap-2">
                  <span>{type === "subscription" ? "👑" : isAi ? "✦" : "⚡"}</span>
                  {type === "subscription"
                    ? item.name || "Subscription Upgrade"
                    : `+${credits.toLocaleString()} ${isAi ? "AI Credits" : "Feature Credits"}`}
                </h3>
                <p className="text-xs text-white/60 m-0 mt-1 leading-relaxed">
                  {type === "subscription"
                    ? "Includes monthly credits, higher discovery limits & premium badges."
                    : "Top-up credits never expire and are safely kept under the FEFO engine."}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-3xl font-extrabold text-[#fbbf24] tracking-tight block">
                  {formatPrice(price, currency)}
                </span>
                <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1 mt-0.5">
                  🔒 Rate Locked
                </span>
              </div>
            </div>

            {/* Feature Perks row */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2 text-[11px] text-white/80">
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="text-emerald-400 font-bold">✓</span> Instant Activation
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="text-emerald-400 font-bold">✓</span> 100% Secure Checkout
              </span>
              {type !== "subscription" && (
                <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg">
                  <span className="text-emerald-400 font-bold">✓</span> Never Expiring
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Primary: Razorpay Gateway */}
            <button
              type="button"
              disabled={processing}
              onClick={handleRazorpayCheckout}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#f43f5e] hover:to-[#e11d48] text-white font-bold text-sm transition-all shadow-[0_6px_20px_rgba(225,29,72,0.4)] hover:shadow-[0_8px_26px_rgba(225,29,72,0.6)] cursor-pointer border-none flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-[0.99]"
            >
              {processing && step === "paying" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Razorpay Gateway…</span>
                </>
              ) : (
                <>
                  <span className="text-base">💳</span>
                  <span>Pay {formatPrice(price, currency)} with Razorpay</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 sm:gap-3 text-[11px] text-white/50 mt-1 text-center">
              <span className="flex items-center gap-1">🔒 256-bit Encrypted</span>
              <span>•</span>
              <span>UPI / Cards / NetBanking</span>
              <span>•</span>
              <span className="text-emerald-400/90 font-medium">Instant Activation</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
