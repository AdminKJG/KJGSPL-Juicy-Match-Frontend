# Juicy Match — Backend API Specification: Multi-Currency Pricing & Razorpay Integration

> **Target Audience**: Backend Engineering Team  
> **Status**: High Priority Architecture Document  
> **Goal**: Resolve multi-currency dynamic pricing (USD, INR, EUR, GBP, AED, CAD, AUD), accurate Razorpay payment amounts (paise vs cents), and global subscription plan state synchronization.

---

## 1. Executive Summary & Problem Statement

### The Problem
1. **Symbol vs Value Desync**: When a user switches currency in the frontend (e.g. from USD `$` to INR `₹`), the UI must display the real localized market price (e.g. ₹1,249 instead of ₹14.99).
2. **Razorpay Subunit Trap**: Razorpay amounts are charged in the smallest currency unit:
   - For `USD`: $14.99 = `1499` cents.
   - For `INR`: ₹1,249 = `124900` paise.
   - If the backend returns `14.99` with currency `INR`, Razorpay creates an order for **1499 paise = ₹14.99**, selling a ₹1,249 subscription for just 15 rupees!
3. **Plan State Synchronization**: The user's active subscription tier (e.g., `premium` or `connect`) must be returned consistently in `GET /v1/billing` so the member profile and topbar show their active tier (`VIP` or `PRO`) instead of defaulting to `FREE`.

---

## 2. Standard Pricing & Regional Matrix Table

The backend catalog and quote engine must adhere to this pricing schedule:

### 2.1 Subscription Plans

| SKU | Plan | Interval | USD ($) | INR (₹) | EUR (€) | GBP (£) | AED (د.إ) | CAD ($) | AUD ($) |
|---|---|---|---|---|---|---|---|---|---|
| `jm.connect.monthly` | Connect | Monthly | **$14.99** | **₹1,249** | €13.99 | £11.99 | د.إ55 | CA$20.49 | A$22.99 |
| `jm.connect.quarterly` | Connect | 3-Month | **$39.99** | **₹3,299** | €36.99 | £31.99 | د.إ145 | CA$54.49 | A$60.99 |
| `jm.premium.monthly` | Premium VIP | Monthly | **$24.99** | **₹2,099** | €22.99 | £19.99 | د.إ92 | CA$33.99 | A$37.99 |
| `jm.premium.quarterly` | Premium VIP | 3-Month | **$64.99** | **₹5,499** | €59.99 | £51.99 | د.إ239 | CA$88.49 | A$99.49 |
| `jm.explore.free` | Explore | Forever | **$0.00** | **₹0** | €0.00 | £0.00 | د.إ0 | CA$0.00 | A$0.00 |

### 2.2 Top-Up Feature Credits (FC) — Never Expire

| SKU | Credits | Voice Mins | Video Mins | USD ($) | INR (₹) | EUR (€) | GBP (£) | AED (د.إ) |
|---|---|---|---|---|---|---|---|---|
| `credits.feature.100` | 100 FC | 20m | 6m | $1.99 | ₹169 | €1.89 | £1.59 | د.إ7 |
| `credits.feature.500` | 500 FC | 100m | 33m | $4.99 | ₹419 | €4.69 | £3.99 | د.إ18 |
| `credits.feature.1000` | 1,000 FC | 200m | 66m | $8.99 | ₹749 | €8.39 | £7.19 | د.إ33 |
| `credits.feature.1500` | 1,500 FC | 300m | 100m | $12.99 | ₹1,099 | €11.99 | £10.29 | د.إ48 |
| `credits.feature.2500` | 2,500 FC | 500m | 166m | $19.99 | ₹1,699 | €18.49 | £15.99 | د.إ73 |

### 2.3 Top-Up AI Credits (AI) — Never Expire

| SKU | Credits | AI Actions | USD ($) | INR (₹) | EUR (€) | GBP (£) | AED (د.إ) |
|---|---|---|---|---|---|---|---|
| `credits.ai.50` | 50 AI | 50 replies / 25 bio | $2.99 | ₹249 | €2.79 | £2.39 | د.إ11 |
| `credits.ai.150` | 150 AI | 150 replies / 75 bio | $6.99 | ₹599 | €6.49 | £5.49 | د.إ26 |
| `credits.ai.200` | 200 AI | Complete Coach suite | $8.99 | ₹749 | €8.39 | £7.19 | د.إ33 |
| `credits.ai.400` | 400 AI | Unlimited seasonal coach | $14.99 | ₹1,249 | €13.99 | £11.99 | د.إ55 |

---

## 3. Required API Endpoints

### 3.1 `GET /v1/billing` & `GET /v1/billing/catalog`

Support the optional `currency` query parameter (default: `USD`).

- **Route**: `GET /v1/billing?currency=INR`
- **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Response `200 OK`**:
```json
{
  "featureCredits": 1000,
  "aiCredits": 100,
  "balance": 0,
  "plan": "premium",
  "subscription": {
    "planKey": "premium",
    "name": "Premium VIP",
    "status": "active",
    "expiresAt": "2026-11-10T00:00:00.000Z",
    "autoRenew": true
  },
  "availableQuotes": [
    {
      "sku": "jm.connect.monthly",
      "plan": "connect",
      "name": "Connect Plan",
      "interval": "month",
      "currency": "INR",
      "price": 1249,
      "amount": 124900,
      "featureCredits": 1000,
      "aiCredits": 100
    },
    {
      "sku": "jm.premium.monthly",
      "plan": "premium",
      "name": "Premium VIP",
      "interval": "month",
      "currency": "INR",
      "price": 2099,
      "amount": 209900,
      "featureCredits": 2500,
      "aiCredits": 250
    },
    {
      "sku": "credits.feature.500",
      "kind": "topup",
      "name": "500 Feature Credits",
      "currency": "INR",
      "price": 419,
      "amount": 41900,
      "credits": 500
    }
  ]
}
```

---

### 3.2 Create Guaranteed Commercial Quote (`POST /v1/billing/quote`)

Locks the price for 15 minutes and returns the exact subunit amount (`amount` in paise/cents) for payment gateways.

- **Route**: `POST /v1/billing/quote`
- **Request Body**:
```json
{
  "sku": "jm.premium.monthly",
  "currency": "INR"
}
```
- **Response `200 OK`**:
```json
{
  "id": "quote_94a7e2b10a",
  "quoteId": "quote_94a7e2b10a",
  "sku": "jm.premium.monthly",
  "name": "Premium VIP Monthly",
  "currency": "INR",
  "price": 2099,
  "amount": 209900,
  "formattedPrice": "₹2,099",
  "expiresAt": "2026-10-10T13:30:00.000Z"
}
```

---

### 3.3 Create Razorpay Order (`POST /v1/billing/orders`)

Uses the locked quote to generate an official Razorpay Order.

- **Route**: `POST /v1/billing/orders`
- **Request Body**:
```json
{
  "quoteId": "quote_94a7e2b10a",
  "currency": "INR",
  "channel": "web"
}
```
- **Backend Implementation Logic**:
```javascript
const Razorpay = require("razorpay");
const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Fetch quote by quoteId
const quote = await db.quotes.findOne({ id: req.body.quoteId });
if (!quote || new Date(quote.expiresAt) < new Date()) {
  return res.status(400).json({ error: "Quote expired or invalid" });
}

// 2. Create Razorpay order (amount in subunits: 209900 paise = ₹2,099)
const order = await rzp.orders.create({
  amount: quote.amount, // 209900
  currency: quote.currency, // "INR"
  receipt: `rcpt_${quote.id}_${Date.now()}`,
  notes: {
    sku: quote.sku,
    userId: req.user.id,
    quoteId: quote.id,
  },
});

// 3. Return to client
return res.status(200).json({
  orderId: order.id,
  keyId: process.env.RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
});
```

---

### 3.4 Verify Razorpay Payment & Grant Entitlements (`POST /v1/billing/orders/verify`)

Verifies the cryptographic HMAC SHA-256 signature from Razorpay, updates the ledger, and upgrades the member.

- **Route**: `POST /v1/billing/orders/verify`
- **Request Body**:
```json
{
  "quoteId": "quote_94a7e2b10a",
  "orderId": "order_OD94kd82ms0",
  "paymentId": "pay_PL39dk201kds",
  "signature": "8f8b0304245b74109..."
}
```
- **Backend Verification Logic**:
```javascript
const crypto = require("crypto");

const body = req.body.orderId + "|" + req.body.paymentId;
const expectedSignature = crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
  .update(body.toString())
  .digest("hex");

if (expectedSignature !== req.body.signature) {
  return res.status(400).json({ error: "Invalid payment signature" });
}

// 1. Fetch quote
const quote = await db.quotes.findOne({ id: req.body.quoteId });

// 2. If it's a subscription upgrade:
if (quote.sku.includes("premium")) {
  await db.users.updateOne(
    { id: req.user.id },
    {
      $set: {
        "subscription.planKey": "premium",
        "subscription.status": "active",
        "subscription.name": "Premium VIP",
        "subscription.expiresAt": new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
      $inc: {
        "wallet.featureCredits": 2500,
        "wallet.aiCredits": 250,
      },
    }
  );
} else if (quote.sku.includes("connect")) {
  await db.users.updateOne(
    { id: req.user.id },
    {
      $set: {
        "subscription.planKey": "connect",
        "subscription.status": "active",
        "subscription.name": "Connect Plan",
        "subscription.expiresAt": new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
      $inc: {
        "wallet.featureCredits": 1000,
        "wallet.aiCredits": 100,
      },
    }
  );
} else if (quote.sku.includes("credits.")) {
  // Top-Up Credits (never expire)
  const isAi = quote.sku.includes(".ai.");
  const credits = quote.credits || quote.amountCredits;
  await db.users.updateOne(
    { id: req.user.id },
    {
      $inc: isAi ? { "wallet.aiCredits": credits } : { "wallet.featureCredits": credits },
    }
  );
}

return res.status(200).json({ success: true, status: "completed" });
```

---

## 4. Frontend Integration Summary

The frontend has already been fully updated to support this workflow:
1. **Dynamic Currency Switching**:
   - When the user selects `INR (₹)`, prices automatically update to localized rates (e.g., Connect: ₹1,249, Premium: ₹2,099, 500 FC: ₹419).
   - Changing currency immediately calls `GET /v1/billing?currency=...` and `GET /v1/billing/catalog?currency=...`.
2. **Subunit Precision**:
   - Razorpay orders receive amounts in paise (`getSubunitAmount(1249, "INR") = 124900 paise`), preventing undercharging bugs.
3. **Topbar & Profile Plan Sync**:
   - Checks `state.subscription.planKey`, `account.membership`, and `account.tier` to proudly display `✦ VIP` for Premium and `✦ PRO` for Connect members.
