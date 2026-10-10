/**
 * pricingUtils.js
 * ────────────────────────────────────────────────────────────────────────────
 * 100% Dynamic Multi-Currency Pricing Engine & Currency Utilities
 * Aligned with MULTI_CURRENCY_RAZORPAY_FRONTEND_GUIDE.md
 *
 * Principles:
 * - NO STATIC HARDCODED PRICING TABLES.
 * - All plan prices, credit pack prices, and subunit amounts derive dynamically
 *   from backend catalog quotes (GET /v1/billing, GET /v1/billing/catalog, POST /v1/billing/quote).
 * - Exact backend subunit integers (e.g. 124900 for ₹1,249) are preserved for Razorpay orders.
 * - Formatted prices use backend's `formattedPrice` or native browser Intl.NumberFormat.
 */

// ── In-Memory Dynamic Catalog Quotes Cache ──────────────────────────────────
// Maps `${sku}:${currency}` and `${sku}` to live quote objects received from backend
const dynamicQuotesMap = new Map();

// ── In-Memory Dynamic Exchange Rates Cache ──────────────────────────────────
// Populated dynamically from GET /v1/billing or GET /v1/billing/rates
const dynamicRatesMap = new Map([
  ["USD", 1.0],
  ["INR", 86.5],
  ["EUR", 0.92],
  ["GBP", 0.79],
  ["AED", 3.67],
  ["CAD", 1.36],
  ["AUD", 1.52],
]);

/**
 * Register or update dynamic quotes fetched from the backend catalog
 * @param {Array} quotes - Array of quote objects from GET /v1/billing or /v1/billing/catalog
 * @param {string} [currency] - Optional currency context
 */
export function setDynamicCatalogQuotes(quotes, currency = null) {
  if (!Array.isArray(quotes)) return;
  quotes.forEach((q) => {
    if (!q || !q.sku) return;
    const curr = (q.currency || currency || "USD").toUpperCase();
    const key = `${q.sku}:${curr}`;
    dynamicQuotesMap.set(key, q);
    // Also save under general sku if not already set for this currency
    dynamicQuotesMap.set(q.sku, q);
  });
}

/**
 * Retrieve a dynamic quote for a specific SKU and currency
 */
export function getDynamicQuote(sku, currency = "USD") {
  if (!sku) return null;
  const curr = (currency || "USD").toUpperCase();
  return dynamicQuotesMap.get(`${sku}:${curr}`) || dynamicQuotesMap.get(sku) || null;
}

/**
 * Update dynamic exchange rates from backend /v1/billing/rates
 */
export function setDynamicExchangeRates(rates) {
  if (!rates || typeof rates !== "object") return;
  Object.entries(rates).forEach(([curr, rate]) => {
    if (typeof rate === "number" && rate > 0) {
      dynamicRatesMap.set(curr.toUpperCase(), rate);
    }
  });
}

/**
 * Get current dynamic exchange rates
 */
export function getDynamicExchangeRates() {
  const result = {};
  dynamicRatesMap.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}

/**
 * Returns currency minor unit exponent (e.g. 2 for INR/USD/EUR/GBP, 0 for JPY, 3 for KWD)
 */
export function getCurrencyExponent(currency = "USD") {
  const curr = (currency || "USD").toUpperCase();
  const zeroDecimal = ["JPY", "KRW", "VND", "CLF", "UGX", "RWF"];
  const threeDecimal = ["BHD", "KWD", "OMR", "JOD", "TND"];
  if (zeroDecimal.includes(curr)) return 0;
  if (threeDecimal.includes(curr)) return 3;
  return 2;
}

/**
 * Formats any price dynamically using native Intl.NumberFormat or backend formattedPrice
 * @param {number|string} amount - Numeric price
 * @param {string} currency - 3-letter currency code (INR, USD, EUR, etc.)
 * @param {Object} [quote] - Optional backend quote object (uses quote.formattedPrice directly)
 */
export function formatPrice(amount, currency = "USD", quote = null) {
  // If backend quote already provided clean pre-formatted price, use it directly
  if (quote?.formattedPrice) {
    return quote.formattedPrice;
  }

  if (amount == null) return "—";
  const num = Number(amount);
  if (isNaN(num)) return "—";

  const curr = (currency || "USD").toUpperCase();

  try {
    const isZeroDecimal = curr === "INR" || curr === "JPY" || curr === "AED" || Number.isInteger(num);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${curr} ${num.toLocaleString()}`;
  }
}

/**
 * Resolves the numeric price for a subscription plan dynamically.
 * Prioritizes:
 * 1. Explicit backend quote in the requested currency
 * 2. In-memory dynamic catalog quotes cache
 * 3. Dynamic conversion via live exchange rates if available
 */
export function resolvePlanPrice(sku, currency = "USD", quote = null) {
  const curr = (currency || "USD").toUpperCase();

  // 1. Direct quote matches target currency
  if (quote?.price != null && (quote.currency || "USD").toUpperCase() === curr) {
    return Number(quote.price);
  }

  // 2. Dynamic catalog quote cache lookup
  const cachedQuote = getDynamicQuote(sku, curr);
  if (cachedQuote?.price != null && (cachedQuote.currency || "USD").toUpperCase() === curr) {
    return Number(cachedQuote.price);
  }

  // 3. Fallback: If quote exists in another currency, convert dynamically using backend rates
  if (quote?.price != null) {
    const fromCurr = (quote.currency || "USD").toUpperCase();
    return convertDynamicPrice(quote.price, fromCurr, curr);
  }

  // 4. Fallback if cached quote exists in any currency
  if (cachedQuote?.price != null) {
    const fromCurr = (cachedQuote.currency || "USD").toUpperCase();
    return convertDynamicPrice(cachedQuote.price, fromCurr, curr);
  }

  return 0;
}

/**
 * Resolves the numeric price for a credit pack SKU dynamically.
 */
export function resolveCreditPackPrice(sku, currency = "USD", quote = null) {
  return resolvePlanPrice(sku, currency, quote);
}

/**
 * Dynamically converts an amount between two currencies using live backend exchange rates
 */
export function convertDynamicPrice(amount, fromCurrency = "USD", toCurrency = "USD") {
  if (amount == null || isNaN(amount)) return 0;
  const num = Number(amount);
  if (num <= 0) return 0;

  const from = (fromCurrency || "USD").toUpperCase();
  const to = (toCurrency || "USD").toUpperCase();
  if (from === to) return num;

  const fromRate = dynamicRatesMap.get(from) || 1.0;
  const toRate = dynamicRatesMap.get(to) || 1.0;

  // Convert to base USD then to target currency
  const inUsd = from === "USD" ? num : num / fromRate;
  const converted = to === "USD" ? inUsd : inUsd * toRate;

  // Regional psychological retail clean rounding
  if (to === "INR") {
    if (converted < 200) return Math.round(converted / 10) * 10 - 1;
    if (converted < 1000) return Math.round(converted / 50) * 50 - 1;
    return Math.round(converted / 100) * 100 - 1;
  }
  if (to === "AED") {
    return Math.round(converted);
  }

  return Math.round(converted * 100) / 100;
}

/**
 * Dynamic Subunit Amount (Paise for INR, Cents for USD/EUR/GBP).
 * CRITICAL RULE: If backend quote provides `amount`, we return it directly!
 * Otherwise, calculates dynamically using currency exponent.
 */
export function getSubunitAmount(price, currency = "USD", quote = null) {
  // If backend quote already supplied the exact subunit integer, use it directly!
  if (quote?.amount != null && typeof quote.amount === "number") {
    return Math.round(quote.amount);
  }

  const num = Number(price) || 0;
  const exp = getCurrencyExponent(currency);
  return Math.round(num * Math.pow(10, exp));
}

/**
 * Legacy compatibility export for convertUsdPrice
 */
export function convertUsdPrice(usdAmount, targetCurrency = "USD") {
  return convertDynamicPrice(usdAmount, "USD", targetCurrency);
}

// ── Backward-Compatibility Proxies for Legacy Imports ───────────────────────
export const EXCHANGE_RATES = new Proxy(
  {},
  {
    get(_, prop) {
      if (typeof prop === "string") {
        return dynamicRatesMap.get(prop.toUpperCase()) || 1.0;
      }
      return 1.0;
    },
  }
);

export const SUBSCRIPTION_PLAN_PRICES = new Proxy(
  {},
  {
    get(_, sku) {
      if (typeof sku !== "string") return undefined;
      return new Proxy(
        {},
        {
          get(__, curr) {
            if (typeof curr !== "string") return undefined;
            return resolvePlanPrice(sku, curr);
          },
        }
      );
    },
  }
);

export const CREDIT_PACK_PRICES = new Proxy(
  {},
  {
    get(_, sku) {
      if (typeof sku !== "string") return undefined;
      return new Proxy(
        {},
        {
          get(__, curr) {
            if (typeof curr !== "string") return undefined;
            return resolveCreditPackPrice(sku, curr);
          },
        }
      );
    },
  }
);
