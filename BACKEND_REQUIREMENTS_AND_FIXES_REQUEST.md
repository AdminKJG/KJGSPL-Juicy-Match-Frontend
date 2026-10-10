# Juicy Match — Backend Technical Specification & Fix Request Document

> **Document Status**: High Priority Action Items  
> **Prepared For**: Backend Engineering Team  
> **Prepared By**: Frontend Engineering Team  
> **Date**: October 10, 2026  
> **Target Systems**: Livestreaming WebRTC (LiveKit), Server-Sent Events (SSE), Dynamic Currency Billing  

---

## Executive Summary

This document details two high-priority blockers that require immediate backend updates and verifications:
1. **Livestream Real-Time Video & Voice Failure**: Viewers joining a live broadcast cannot see or hear the host in real time, and the SSE connection fails with HTTP `401 Unauthorized`.
2. **Multi-Currency Pricing Architecture**: Ensuring that switching currency in the app updates all subscription plan prices and transaction amounts via backend exchange rates, rather than merely swapping the currency icon on the frontend.

---

## PART 1: Livestreaming Real-Time Video & Voice Blockers

### 1.1. Blocker A: `401 Unauthorized` on SSE Endpoint (`/events`)

#### The Problem:
When any user opens or joins a live stream, the browser attempts to establish an SSE connection:
```http
GET https://kkl6cd17-8100.inc1.devtunnels.ms/v1/livestreams/62ac19da-f2e5-46b1-8967-93e810a80cc2/events?ticket=6d73ece7-e75b-439b-8484-91367493b80c
Status: 401 Unauthorized
```

#### Why This Happens:
1. The browser's native `EventSource` API **cannot send custom HTTP headers** (`Authorization: Bearer <token>`).
2. The frontend correctly requests a single-use ticket via `POST /v1/livestreams/:id/events-ticket` and receives a valid ticket (`6d73ece7-...`).
3. However, the backend route handler for `GET /v1/livestreams/:id/events` is protected by standard `authMiddleware`, which strictly checks `req.headers.authorization`. Because headers are absent on `EventSource`, the middleware rejects the request with `401 Unauthorized`.

#### Required Backend Fix:
Update the authentication middleware for the `/events` route to accept **either** `req.query.ticket` **or** `req.query.token`:

```javascript
// Example Express / Node.js Middleware Fix
async function sseAuthMiddleware(req, res, next) {
  try {
    // 1. Check if single-use ticket was provided in query string
    const ticket = req.query.ticket;
    if (ticket) {
      const ticketData = await redisClient.get(`sse_ticket:${ticket}`); // Or in-memory store
      if (ticketData) {
        req.user = JSON.parse(ticketData);
        await redisClient.del(`sse_ticket:${ticket}`); // Single-use consumption
        return next();
      }
    }

    // 2. Check if accessToken was provided in query string
    const queryToken = req.query.token || req.query.accessToken;
    if (queryToken) {
      const decoded = jwt.verify(queryToken, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    }

    // 3. Fallback to standard Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    }

    return res.status(401).json({ error: "Unauthorized: Missing valid ticket or token for SSE stream." });
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired credentials." });
  }
}
```

---

### 1.2. Blocker B: WebRTC Video & Audio Not Connecting (Black Screen / No Sound)

#### The Problem:
When a viewer joins an active stream:
- The UI connects to the chat channel, but **no video and no voice** from the host are received.
- The player displays: `"LiveKit SFU unreachable"` or times out waiting for remote media tracks.

#### Why Video and Voice Flow Fails (LiveKit SFU Architecture):
Video and audio **do not travel through HTTP or SSE**; they stream peer-to-server-to-peer through **LiveKit WebRTC SFU**. For real-time video and audio to work, the following 4 conditions **must be satisfied** on the backend:

#### 1. LiveKit Server URL (`wsUrl` / `url`)
In `POST /v1/livestreams/:id/token`, the backend returns `{ url, token, role, roomName }`.
- **Current Issue**: If the backend returns `ws://localhost:7880` or `http://localhost:7880`, this URL **only works on the host's local machine**. Any other device or browser accessing the tunnel (`kkl6cd17-8100.inc1.devtunnels.ms`) cannot reach `localhost:7880`!
- Furthermore, Microsoft devtunnel (`kkl6cd17-8100`) only tunnels port **8100** (HTTP). LiveKit requires port **7880** (WebSocket) as well as UDP ports for WebRTC ICE candidates (`7881` or `50000-60000`).
- **Backend Fix**:
  - **Recommended for Production & Staging**: Use a **LiveKit Cloud instance** (e.g., `wss://<project-name>.livekit.cloud`) with `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. LiveKit Cloud handles STUN/TURN, ICE candidates, and global NAT traversal automatically with zero firewall blockers.
  - **If self-hosting**: The backend must return the public, reachable domain of the LiveKit server (e.g. `wss://live.juicymatch.ai` or tunnel port 7880).

#### 2. Room Name Consistency
- When the host starts a stream, the backend generates a LiveKit token assigned to a specific room:
  `room: "jm-live-" + streamId` (or the stream's UUID).
- When any viewer joins the same stream, their LiveKit token **must be assigned the exact same room identifier**:
  `room: "jm-live-" + streamId`.
- **Verify**: Ensure that the host and viewer tokens are generated with the identical room string. If the room names differ, they are in separate isolated rooms.

#### 3. Token Permissions (`AccessToken` Grants)
In `livekit-server-sdk`, ensure the grants are properly set based on role:

```javascript
import { AccessToken } from "livekit-server-sdk";

// Host Token Generation
function generateHostLiveKitToken(userId, userName, streamId) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: userName,
    ttl: "4h",
  });

  at.addGrant({
    room: `jm-live-${streamId}`,
    roomJoin: true,
    canPublish: true,        // Critical: Host must be allowed to publish video/audio
    canPublishData: true,    // Critical: For chat & reactions data channel
    canSubscribe: true,
  });

  return at.toJwt();
}

// Viewer Token Generation
function generateViewerLiveKitToken(userId, userName, streamId) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: userName,
    ttl: "2h",
  });

  at.addGrant({
    room: `jm-live-${streamId}`,
    roomJoin: true,
    canPublish: false,       // Viewers do not publish camera/mic
    canPublishData: true,    // Critical: Viewers can publish chat & heart reactions
    canSubscribe: true,      // Critical: Viewers must be allowed to receive host tracks
  });

  return at.toJwt();
}
```

#### 4. Active Stream Status Check
- `GET /v1/livestreams` must only return streams where `state = 'live'` and `endedAt = null`.
- If the host disconnects or ends the stream, the backend must update the record to `state = 'ended'` so viewers are not directed to dead rooms.

---

## PART 2: Multi-Currency Dynamic Pricing & Currency Converter API

### The Problem:
Currently in the app, when a user selects a different currency (e.g., INR ₹, USD $, EUR €, GBP £), only the frontend currency symbol is swapped, while the numerical prices remain static, or transactions fail because the payment gateway does not receive the converted rate.

### Expected Architecture:
All plan pricing, coin package prices, and payment gateway charge amounts must be dynamically calculated on the backend based on live or configured exchange rates.

### Required Backend Endpoints:

#### 1. Dynamic Plan & Price List with Currency Parameter
- **Method**: `GET`
- **Path**: `/v1/billing/plans?currency=USD|INR|EUR|GBP`
- **Auth**: Optional / Authenticated
- **Behavior**: The backend looks up the base price (e.g. USD) and converts all plans to the requested currency.

**Sample Response (`200 OK`)**:
```json
{
  "currency": "INR",
  "currencySymbol": "₹",
  "plans": [
    {
      "id": "plan_monthly_pro",
      "name": "Juicy Match Pro (Monthly)",
      "baseAmountUSD": 19.99,
      "amount": 1699,
      "formatted": "₹1,699",
      "period": "month",
      "benefits": ["Unlimited Likes", "See Who Liked You", "5 Free Boosts", "HD Video Streaming"]
    },
    {
      "id": "plan_annual_vip",
      "name": "Juicy Match VIP (Annual)",
      "baseAmountUSD": 99.99,
      "amount": 8499,
      "formatted": "₹8,499",
      "period": "year",
      "discountPercent": 30
    }
  ]
}
```

#### 2. Currency Rates Endpoint (For Instant Frontend Conversion)
- **Method**: `GET`
- **Path**: `/v1/billing/rates`
- **Response (`200 OK`)**:
```json
{
  "base": "USD",
  "rates": {
    "USD": 1.0,
    "INR": 86.5,
    "EUR": 0.92,
    "GBP": 0.79,
    "AED": 3.67
  },
  "updatedAt": "2026-10-10T12:00:00Z"
}
```

#### 3. Dynamic Order Creation with Currency Parameter
- **Method**: `POST`
- **Path**: `/v1/billing/create-order`
- **Body**:
```json
{
  "planId": "plan_monthly_pro",
  "currency": "INR"
}
```
- **Behavior**: Backend creates the Razorpay or Stripe order with the exact converted amount in the specified currency (e.g. `169900` paise for ₹1699) so the user is charged correctly.

---

## PART 3: Checklist for Backend Verification

Please verify and run the following checks on the backend:

1. [ ] **Test `/events` authorization**:
   ```bash
   curl -I "https://kkl6cd17-8100.inc1.devtunnels.ms/v1/livestreams/<STREAM_ID>/events?ticket=<VALID_TICKET>"
   ```
   *Expected Result*: HTTP `200 OK` with `Content-Type: text/event-stream`.

2. [ ] **Verify LiveKit Token Response**:
   ```bash
   curl -X POST "https://kkl6cd17-8100.inc1.devtunnels.ms/v1/livestreams/<STREAM_ID>/token" \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json"
   ```
   *Verify*:
   - Does `url` point to an externally reachable LiveKit address (NOT `localhost:7880`)?
   - Is `roomName` identical for both host and viewers?
   - Does decoded JWT token contain `canPublish: true` for host and `canSubscribe: true` for viewer?

3. [ ] **Verify Dynamic Currency Billing**:
   - Ensure `GET /v1/billing/plans?currency=INR` returns converted prices (`amount`, `currency`).
   - Ensure `POST /v1/billing/create-order` accepts `currency` and creates the gateway order in that currency.
