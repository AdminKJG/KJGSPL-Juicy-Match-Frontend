# Juicy Match — Backend API Specification: Billing, Dual-Credit Wallet & Razorpay

> **For the Backend Engineering Team**  
> This specification documents all required endpoints, request/response schemas, ledger accounting rules, and the complete Razorpay payment gateway integration.  
> The frontend client renders **100% dynamically** from these endpoints with **zero hardcoded JSON/data**.

---

## 1. Architecture Overview

### 1.1 Dual-Credit Balance Model
Juicy Match separates utility features and AI intelligence into two independent balances:
1. **Feature Credits (FC)**:
   - **Voice Calls**: 5 FC / connected minute (billed to caller only; receiver is 100% free).
   - **Video Calls**: 15 FC / connected minute (billed to caller only; receiver is 100% free).
   - **+10 Daily Extra Profiles**: 50 FC.
   - **+10 Daily Extra Likes**: 50 FC.
   - **30-Minute Profile Boost**: 300 FC.
   - **24-Hour Passport Pass**: 50 FC (Explore & Connect members; Premium VIP includes permanent Passport).
2. **AI Credits (AI)**:
   - **Profile Bio Polish / Coaching**: 2 AI Credits.
   - **Icebreaker Generation**: 1 AI Credit.
   - **Compatibility & Chemistry Report**: 3 AI Credits.
   - **Conversation Wingman Replies**: 1 AI Credit.

### 1.2 First-Expiring-First-Out (FEFO) Engine
- **Monthly Subscription Grants**: Expire every 30 days at the end of the billing cycle.
- **Purchased Top-Up Credits**: **Never expire** (`expires_at = null`).
- When a user spends credits, the backend automatically consumes expiring subscription credits first. Non-expiring top-up credits are preserved permanently even if subscriptions lapse.

---

## 2. Environment Variables (.env)

```env
# Razorpay Credentials (from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
```

---

## 3. Endpoints Specification

### 3.1 Fetch Billing Overview & Quotes (`GET /v1/billing` or `GET /v1/billing/catalog`)
Retrieves the member's dual wallet, active subscription tier, audit ledger history, and purchasable catalog quotes.

> [!IMPORTANT]
> **Authentication Required**: Both `/v1/billing` and `/v1/billing/catalog` require the user's JWT access token:
> `Authorization: Bearer <JWT_ACCESS_TOKEN>`
> If you make a raw request in your browser or Postman without this header, the backend will return `{"error":"Sign in required"}`.
> In the frontend application, this header is automatically attached from the logged-in session. If you want `/v1/billing/catalog` to be viewable before login, your backend developer can remove the auth middleware from just that route.

- **Method**: `GET`
- **Route**: `/v1/billing` (or `/v1/billing/catalog`)
- **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Response `200 OK`**:
```json
{
  "featureCredits": 100,
  "aiCredits": 20,
  "balance": 0,
  "subscription": {
    "plan": "00000000-0000-0000-0000-000000000001",
    "planKey": "explore",
    "name": "Explore",
    "expiresAt": "2099-12-31T23:59:59.000Z",
    "autoRenew": false,
    "source": "signup",
    "status": "active"
  },
  "grants": [
    {
      "id": "grant-001",
      "creditType": "feature",
      "amount": 100,
      "remaining": 100,
      "source": "signup",
      "expiresAt": null,
      "createdAt": "2026-10-09T12:00:00.000Z"
    }
  ],
  "availableQuotes": [
    {
      "sku": "jm.connect.monthly",
      "plan": "connect",
      "name": "Connect Monthly",
      "price": 14.99,
      "currency": "USD",
      "featureCredits": 1000,
      "aiCredits": 100,
      "interval": "month"
    },
    {
      "sku": "jm.connect.quarterly",
      "plan": "connect",
      "name": "Connect 3-Month",
      "price": 39.99,
      "currency": "USD",
      "featureCredits": 1000,
      "aiCredits": 100,
      "interval": "quarter"
    },
    {
      "sku": "jm.premium.monthly",
      "plan": "premium",
      "name": "Premium Monthly",
      "price": 24.99,
      "currency": "USD",
      "featureCredits": 2500,
      "aiCredits": 250,
      "interval": "month"
    },
    {
      "sku": "jm.premium.quarterly",
      "plan": "premium",
      "name": "Premium 3-Month",
      "price": 64.99,
      "currency": "USD",
      "featureCredits": 2500,
      "aiCredits": 250,
      "interval": "quarter"
    },
    {
      "sku": "credits.feature.100",
      "kind": "topup",
      "name": "100 Feature Credits",
      "price": 4.99,
      "currency": "USD",
      "amount": 100,
      "desc": "20 voice mins or 6 video mins"
    },
    {
      "sku": "credits.feature.500",
      "kind": "topup",
      "name": "500 Feature Credits",
      "price": 19.99,
      "currency": "USD",
      "amount": 500,
      "desc": "100 voice mins or 33 video mins",
      "badge": "Popular"
    },
    {
      "sku": "credits.feature.1500",
      "kind": "topup",
      "name": "1,500 Feature Credits",
      "price": 49.99,
      "currency": "USD",
      "amount": 1500,
      "desc": "300 voice mins or 100 video mins",
      "badge": "Best Value"
    },
    {
      "sku": "credits.ai.50",
      "kind": "topup",
      "name": "50 AI Credits",
      "price": 4.99,
      "currency": "USD",
      "amount": 50,
      "desc": "50 wingman replies or 25 bio polishes"
    },
    {
      "sku": "credits.ai.200",
      "kind": "topup",
      "name": "200 AI Credits",
      "price": 14.99,
      "currency": "USD",
      "amount": 200,
      "desc": "Comprehensive chemistry & AI wingman",
      "badge": "Popular"
    }
  ]
}
```

---

### 3.2 Create Commercial Price Quote (`POST /v1/billing/quote`)
Generates a signed quote with a 10-minute rate lock.

- **Method**: `POST`
- **Route**: `/v1/billing/quote`
- **Request Body**:
```json
{
  "sku": "credits.feature.500",
  "currency": "USD"
}
```
- **Response `200 OK`**:
```json
{
  "quoteId": "quote_8f9a2b1c",
  "sku": "credits.feature.500",
  "amount": 1999,
  "currency": "USD",
  "price": 19.99,
  "expiresAt": "2026-10-09T12:15:00.000Z"
}
```

---

### 3.3 Create Razorpay Order (`POST /v1/billing/orders`)
Initializes a payment order on Razorpay and returns the order identifier to the frontend.

- **Method**: `POST`
- **Route**: `/v1/billing/orders`
- **Request Body**:
```json
{
  "quoteId": "quote_8f9a2b1c",
  "clientId": "client-order-1728472910-xyz",
  "channel": "web"
}
```

- **Backend Implementation (Node.js)**:
```javascript
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function createOrder(req, res) {
  const { quoteId } = req.body;
  const quote = await db.quotes.findUnique({ where: { id: quoteId } });

  // Amount must be in smallest currency unit (paise for INR, cents for USD/EUR)
  const amountInSmallestUnit = Math.round(quote.price * 100);

  const options = {
    amount: amountInSmallestUnit,
    currency: quote.currency || "USD",
    receipt: `rcpt_${Date.now()}`,
    notes: {
      quoteId,
      userId: req.user.id,
      sku: quote.sku,
    },
  };

  const razorpayOrder = await razorpay.orders.create(options);

  return res.json({
    orderId: razorpayOrder.id, // e.g. "order_EK9876543210"
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
```

- **Response `200 OK`**:
```json
{
  "orderId": "order_EK9876543210",
  "amount": 1999,
  "currency": "USD",
  "keyId": "rzp_live_xxxxxxxxxxxxxxxx"
}
```

---

### 3.4 Verify Razorpay Payment & Credit Wallet (`POST /v1/billing/orders/verify`)
Called automatically when Razorpay Checkout modal completes successfully.

- **Method**: `POST`
- **Route**: `/v1/billing/orders/verify`
- **Request Body**:
```json
{
  "quoteId": "quote_8f9a2b1c",
  "orderId": "order_EK9876543210",
  "paymentId": "pay_29QQoUBcxrtvMp",
  "signature": "9ef4dff0293e77530a29e177dbe6a79191d4e4ec15ff110d100c56f50fcb09ab"
}
```

- **Backend Implementation (Signature Verification & Ledger)**:
```javascript
import crypto from "crypto";

export async function verifyOrder(req, res) {
  const { quoteId, orderId, paymentId, signature } = req.body;

  // 1. Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ error: "Invalid Razorpay payment signature" });
  }

  // 2. Fetch Quote Details
  const quote = await db.quotes.findUnique({ where: { id: quoteId } });
  const isAi = quote.sku.includes(".ai.");
  const creditsGranted = quote.amount || quote.credits;

  // 3. Atomically Credit Wallet
  await db.$transaction([
    // Increment balance
    db.wallet.update({
      where: { userId: req.user.id },
      data: isAi
        ? { aiCredits: { increment: creditsGranted } }
        : { featureCredits: { increment: creditsGranted } },
    }),
    // Create Audit Ledger record (non-expiring for top-up)
    db.ledger.create({
      data: {
        userId: req.user.id,
        amount: creditsGranted,
        creditType: isAi ? "ai" : "feature",
        operationType: "topup",
        paymentId,
        orderId,
        expiresAt: null, // Purchased top-ups NEVER expire
        createdAt: new Date(),
      },
    }),
  ]);

  return res.json({
    success: true,
    message: "Payment verified and credits added to wallet",
    creditsGranted,
  });
}
```

---

### 3.5 On-Demand Utility Unlocks (Feature Credit Burning)

All endpoints check that member's `wallet.featureCredits >= cost`. Deduct FC and unlock immediately.

| Endpoint | Method | Cost | Action Performed |
| :--- | :---: | :---: | :--- |
| `/v1/discovery/packs/profiles` | `POST` | **50 FC** | Adds **+10 candidate profiles** to member's daily discovery pool. |
| `/v1/discovery/packs/likes` | `POST` | **50 FC** | Adds **+10 daily likes** to member's quota for the UTC day. |
| `/v1/discovery/boost` | `POST` | **300 FC** | Activates **30-minute priority placement** in local discovery queues. |
| `/v1/passport/pass/activate` | `POST` | **50 FC** | Grants **24-hour Passport access** to explore and match in any city. |

- **Sample Deduction Implementation**:
```javascript
export async function buyProfilePack(req, res) {
  const userId = req.user.id;
  const userWallet = await db.wallet.findUnique({ where: { userId } });

  if ((userWallet?.featureCredits ?? 0) < 50) {
    return res.status(402).json({ error: "Insufficient Feature Credits (50 FC required)" });
  }

  await db.$transaction([
    db.wallet.update({
      where: { userId },
      data: { featureCredits: { decrement: 50 } },
    }),
    db.dailyAllowances.update({
      where: { userId_date: { userId, date: todayUTC() } },
      data: { extraProfiles: { increment: 10 } },
    }),
    db.ledger.create({
      data: {
        userId,
        amount: -50,
        creditType: "feature",
        operationType: "spend_discovery_profiles",
      },
    }),
  ]);

  return res.json({ success: true, extraProfilesGranted: 10 });
}
```

---

## 4. Razorpay Webhooks (Recommended for Asynchronous Safety)

Configure webhook URL in Razorpay Dashboard: `https://your-api.com/v1/billing/webhooks/razorpay`  
Events to listen for:
- `order.paid`
- `payment.captured`
- `payment.failed`

Validate webhook signature using `RAZORPAY_WEBHOOK_SECRET` with `crypto.createHmac('sha256', secret)`.

---

## 5. Verification Checklist for Backend Team

- [ ] `GET /v1/billing` returns `availableQuotes` array with `kind: "topup"` and subscription plans.
- [ ] `POST /v1/billing/orders` returns `{ orderId, amount, currency, keyId }`.
- [ ] `POST /v1/billing/orders/verify` verifies HMAC SHA-256 signature and adds credits with `expires_at: null`.
- [ ] Feature credit utility unlock endpoints validate balance $\ge$ cost and record ledger entry.
- [ ] Connected calls meter caller at 5 FC/min (audio) and 15 FC/min (video).
