/**
 * planUtils.js
 * ────────────────────────────────────────────────────────────────────────────
 * Central plan normalization, display taxonomy, and user-friendly naming.
 * Resolves UUIDs into human-friendly plan names (Explore, Connect, Premium VIP)
 * and explains Feature Credits (FC) vs AI Credits (AI).
 */

export function normalizePlanKey(plan) {
  if (!plan) return "explore";
  const str = String(plan).toLowerCase().trim();
  if (str.includes("premium") || str.includes("00000003") || str.includes("vip")) return "premium";
  if (str.includes("connect") || str.includes("00000002") || str.includes("plus")) return "connect";
  if (str.includes("explore") || str.includes("00000001") || str.includes("free") || str.includes("starter")) return "explore";
  return "explore";
}

export function getPlanDisplayName(plan) {
  const key = normalizePlanKey(plan);
  if (key === "premium") return "Premium VIP";
  if (key === "connect") return "Connect Plan";
  return "Explore (Free)";
}

export function getPlanBadge(plan) {
  const key = normalizePlanKey(plan);
  if (key === "premium") return "VIP";
  if (key === "connect") return "PRO";
  return null;
}

export function getPlanSubtitle(plan) {
  const key = normalizePlanKey(plan);
  if (key === "premium") return "All VIP perks active · 2,500 FC monthly";
  if (key === "connect") return "1,000 FC/mo · Full connection suite";
  return "Upgrade to Connect or Premium";
}

export const CREDIT_TAXONOMY = {
  fc: {
    symbol: "⚡",
    short: "FC",
    name: "Feature Credits",
    tagline: "Calls & Actions",
    description: "Voice calls (5 FC/min), Video calls (15 FC/min), and Profile Boosts.",
  },
  ai: {
    symbol: "✦",
    short: "AI",
    name: "AI Credits",
    tagline: "Smart Assistant",
    description: "AI Wingman, profile optimization, and smart conversation icebreakers.",
  },
};
