# Juicy Match Complete WebApp API Specification

## 1. Authentication & Onboarding

### 1.1 Fetch Public Legal Policies
- **Endpoint:** `GET /public/policies` (or `/api/public/policies`)
- **Auth:** None (Public)
- **Response (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": "policy-terms-v1",
        "kind": "terms",
        "title": "Terms of Service",
        "jurisdiction": "GLOBAL",
        "version": 1,
        "body": "..."
      }
    ]
  }
  ```

### 1.2 Register Account
- **Endpoint:** `POST /auth/register`
- **Auth:** None (Public)
- **Request Body:**
  ```json
  {
    "email": "member@example.com",
    "password": "SecurePassword123!",
    "pseudonym": "Leo",
    "age": 28,
    "policyIds": ["policy-terms-v1", "policy-privacy-v1"]
  }
  ```

### 1.3 Verify Email
- **Endpoint:** `POST /auth/verify-email`
- **Auth:** None (Public)
- **Request Body:** `{ "email": "member@example.com", "code": "123456" }`

### 1.4 Resend Verification Code
- **Endpoint:** `POST /auth/resend-verification`
- **Request Body:** `{ "email": "member@example.com" }`

### 1.5 Login
- **Endpoint:** `POST /auth/login`
- **Request Body:** `{ "email": "member@example.com", "password": "SecurePassword123!" }`

### 1.6 Refresh Token
- **Endpoint:** `POST /auth/refresh`
- **Request Body:** `{ "refreshToken": "..." }`

### 1.7 Logout
- **Endpoint:** `POST /auth/logout`

### 1.8 Change Password
- **Endpoint:** `POST /auth/change-password`
- **Request Body:** `{ "currentPassword": "...", "newPassword": "..." }`

### 1.9 Demo Actors & Login
- **List Actors:** `GET /demo/actors`
- **Demo Login:** `POST /demo/login` with `{ "id": "actor-id" }`

---

## 2. User Account & Profile Management

### 2.1 Fetch Current Member Profile & Account
- **Endpoint:** `GET /me`
- **Auth:** Bearer Token
- **Response (`200 OK`):** Returns `{ "account": {...}, "revision": 5, "profile": {...} }`

### 2.2 Update Profile
- **Endpoint:** `PUT /me/profile`
- **Auth:** Bearer Token
- **Request Body:** `{ "revision": 5, "profile": {...} }`

### 2.3 Delete Account
- **Endpoint:** `DELETE /me`
- **Request Body:** `{ "reason": "Found someone" }`

### 2.4 Active Sessions Management
- **List Sessions:** `GET /sessions`
- **Revoke Other Sessions:** `POST /sessions/revoke-others`

### 2.5 Server Global Config
- **Endpoint:** `GET /config` (or `/public/config`)

---

## 3. Media & Photo Vault

### 3.1 Upload Media (Photo or Voice Note)
- **Endpoint:** `POST /media`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "kind": "photo", // "photo" | "voice"
    "base64": "/9j/4AAQSkZJRgABAQ...",
    "isPrimary": true
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "id": "med-101",
    "url": "/media/med-101",
    "kind": "photo",
    "isPrimary": true,
    "createdAt": "2026-09-26T10:00:00Z"
  }
  ```

### 3.2 List Owned Media
- **Endpoint:** `GET /media`
- **Auth:** Bearer Token
- **Response (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": "med-101",
        "kind": "photo",
        "isPrimary": true,
        "createdAt": "2026-09-26T10:00:00Z"
      }
    ]
  }
  ```

### 3.3 Get Raw Media Binary (Stream/Image)
- **Endpoint:** `GET /media/:id`
- **Auth:** Bearer Token

### 3.4 Set Primary Photo (Avatar)
- **Endpoint:** `PUT /media/:id/primary`
- **Auth:** Bearer Token
- **Response (`200 OK`):** `{ "success": true }`

### 3.5 Delete Media
- **Endpoint:** `DELETE /media/:id`
- **Auth:** Bearer Token
- **Response (`200 OK`):** `{ "success": true }`

### 3.6 Grant or Revoke Photo Access for Specific Connection
- **Endpoint:** `POST /media/:id/grant`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "viewer": "jm-member-peer-id",
    "state": "granted" // "granted" | "revoked"
  }
  ```

### 3.7 Photo Request Operations
- **List Requests:** `GET /photo-requests`
- **Request Photo Access:** `POST /photo-requests` with `{ "owner": "peer-id" }`
- **Respond to Request:** `POST /photo-requests/:id/respond` with `{ "action": "approve", "mediaId": "med-101" }`

---

## 4. Intimacy & Desires Quiz (Voice & Text)

### 4.1 Fetch Desires Quiz Questions & Saved Answers
- **Endpoint:** `GET /desires`
- **Auth:** Bearer Token

### 4.2 Save Desires Answers
- **Endpoint:** `POST /desires`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "revision": 2,
    "answers": {
      "spark": ["slow-burn"],
      "note": "Looking for genuine connection."
    }
  }
  ```

### 4.3 AI Voice Transcription (Whisper Speech-to-Text)
- **Endpoint:** `POST /desires/transcribe`
- **Auth:** Bearer Token
- **Request Body:** `{ "audio": "base64EncodedAudioData...", "consent": true }`

---

## 5. Discovery & Swiping

### 5.1 Fetch Discovery Feed
- **Endpoint:** `GET /discover`
- **Auth:** Bearer Token
- **Response (`200 OK`):** Returns `{ "issued": 3, "dailyCap": 10, "items": [...] }`

### 5.2 Swipe Action (Like, Pass, Save, Withdraw)
- **Endpoint:** `POST /swipes`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "target": "jm-member-42",
    "action": "like" // "like" | "pass" | "save" | "withdraw"
  }
  ```
- **Response (`200 OK`):** `{ "matched": true, "connectionId": "conn-999" }`

### 5.3 Undo Last Pass
- **Endpoint:** `POST /swipes/undo`
- **Auth:** Bearer Token
- **Request Body:** `{ "target": "jm-member-42" }`

---

## 6. Connections & Chat (Messaging & Voice)

### 6.1 List Connections (Mutual, Inbound, Outbound)
- **Endpoint:** `GET /connections`
- **Auth:** Bearer Token

### 6.2 Mutual Chat Consent
- **Endpoint:** `POST /connections/:id/consent`
- **Request Body:** `{ "accept": true }`

### 6.3 Fetch Conversation Messages
- **Endpoint:** `GET /connections/:id/messages`
- **Auth:** Bearer Token

### 6.4 Send Text Message
- **Endpoint:** `POST /connections/:id/messages`
- **Auth:** Bearer Token
- **Request Body:** `{ "clientId": "uuid-v4", "body": "Hello Maya!", "replyToId": null }`

### 6.5 Send Voice Note
- **Endpoint:** `POST /connections/:id/voice`
- **Auth:** Bearer Token
- **Request Body:** `{ "clientId": "uuid-v4", "mediaId": "med-voice-888" }`

### 6.6 Edit Message
- **Endpoint:** `PATCH /connections/:id/messages/:messageId`
- **Request Body:** `{ "body": "Corrected text" }`

### 6.7 Delete Message
- **Endpoint:** `DELETE /connections/:id/messages/:messageId`
- **Request Body:** `{ "deleteForEveryone": true }`

### 6.8 Clear Entire Conversation
- **Endpoint:** `DELETE /connections/:id/messages`

### 6.9 Add Message Emoji Reaction
- **Endpoint:** `POST /connections/:id/messages/:messageId/reaction`
- **Request Body:** `{ "emoji": "❤️" }`

### 6.10 Mark Messages As Read
- **Endpoint:** `POST /connections/:id/read`
- **Request Body:** `{ "lastReadMessageId": "msg-1" }`

### 6.11 Demo Bot Simulated Reply
- **Endpoint:** `POST /connections/:id/demo-reply`

### 6.12 Block & Report Member
- **Block:** `POST /block` with `{ "target": "peer-member-id" }`
- **Report:** `POST /reports` with `{ "target": "peer-member-id", "reason": "Inappropriate behaviour" }`

---

## 7. Live RTC Calls (Audio / Video)

### 7.1 Fetch Active & Incoming Calls
- **Endpoint:** `GET /calls`

### 7.2 Initiate Call
- **Endpoint:** `POST /calls`
- **Request Body:** `{ "connectionId": "conn-999", "medium": "audio" }`

### 7.3 Answer / Decline / End Call
- **Endpoint:** `POST /calls/:id/action`
- **Request Body:** `{ "action": "accept" }` // "accept" | "decline" | "end"

### 7.4 Get LiveKit WebRTC Room Token
- **Endpoint:** `POST /calls/:id/token`
- **Response (`200 OK`):** `{ "token": "...", "room": "...", "serverUrl": "wss://..." }`

### 7.5 Demo Call Simulation
- **Endpoint:** `POST /calls/:id/demo-accept`

---

## 8. Explore, City Atmosphere & Events

### 8.1 Fetch City Atmospheric Zones (Map)
- **Endpoint:** `GET /map`

### 8.2 Map Tiles Proxy
- **Endpoint:** `GET /map/tiles/{z}/{x}/{y}.png`

### 8.3 Fetch Published Events
- **Endpoint:** `GET /events`

### 8.4 Submit Event RSVP
- **Endpoint:** `POST /events/:id/rsvp`
- **Request Body:** `{ "state": "confirmed" }` // "confirmed" | "cancelled"

---

## 9. Passport & Travel Mode

### 9.1 Fetch Cities & Destinations
- **Endpoint:** `GET /places`
- **Search Cities:** `GET /places/search?q={query}&country={countryCode}`

### 9.2 Fetch Own Travel Plans
- **Endpoint:** `GET /passport`

### 9.3 Create Travel Plan
- **Endpoint:** `POST /passport`
- **Request Body:** `{ "city": "city-dubai", "start": "2026-10-15", "end": "2026-10-22" }`

### 9.4 Change Plan Visibility
- **Endpoint:** `PATCH /passport/:id/visibility`
- **Request Body:** `{ "visibility": "city", "revision": 1, "consent": true }`

### 9.5 Delete Travel Plan
- **Endpoint:** `DELETE /passport/:id`

### 9.6 Discover Matches at Destination City
- **Endpoint:** `GET /passport/:id/discover`

### 9.7 Travel Invitations
- **List Invitations:** `GET /passport/invitations`
- **Send Invitation:** `POST /passport/invitations` with `{ "receiver": "peer-id", "cityId": "city-dubai", "targetDate": "2026-10-18", "note": "..." }`
- **Respond to Invitation:** `POST /passport/invitations/:id/action` with `{ "action": "accept", "consent": true }`

---

## 10. Membership, Billing & Store

### 10.1 Fetch Billing Overview & Catalog
- **Billing State:** `GET /billing`
- **Product Catalog & Prices:** `GET /billing/catalog`
- **Entitlements List:** `GET /entitlements`

### 10.2 Create Price Quote (Fixed 10-Minute Lock)
- **Endpoint:** `POST /billing/quote`
- **Request Body:** `{ "sku": "jm.plus.monthly", "currency": "USD" }`

### 10.3 Web Checkout Order (Razorpay / Stripe)
- **Endpoint:** `POST /billing/orders`
- **Request Body:** `{ "quoteId": "quote-9988", "clientId": "uuid-v4-order", "channel": "web" }`

### 10.4 Demo Simulated Purchase
- **Endpoint:** `POST /billing/demo-purchase`
- **Request Body:** `{ "sku": "jm.plus.monthly", "quoteId": "quote-9988", "currency": "USD", "clientId": "client-op-1" }`

### 10.5 Invoices & Receipts
- **Endpoint:** `GET /billing/documents`

### 10.6 Activate Profile Boost
- **Endpoint:** `POST /boosts/activate`

---

## 11. Privacy, Preferences & Notifications

### 11.1 Notification & Rhythm Preferences
- **Get Preferences:** `GET /preferences`
- **Update Preferences:** `POST /preferences`

### 11.2 GDPR / Privacy Data Requests
- **List Requests:** `GET /privacy/requests`
- **Submit Request:** `POST /privacy/requests` with `{ "kind": "access" }`

### 11.3 Notifications Inbox
- **Fetch Notifications:** `GET /notifications`
- **Mark Read:** `POST /notifications/:id/read`

---

## 12. AI Assistant & Guidance

### 12.1 Capabilities
- **Endpoint:** `GET /assist/capabilities`

### 12.2 Conversation Starter Assistance
- **Endpoint:** `POST /assist` with `{ "target": "peer-member-id" }`

### 12.3 Profile & Privacy Guidance Prompts
- **Profile Coach:** `POST /assist/profile-guide`
- **Preference Optimizer:** `POST /assist/preference-helper`
- **Privacy Audit:** `POST /assist/privacy-check`
- **Discovery Tips:** `POST /assist/discovery-tips`

---

## 13. SuperAdmin & Operations
- **Dashboard Overview:** `GET /admin/overview`
- **Members List:** `GET /admin/members`
- **Audit & Masters:** `GET /admin/masters`
- **Reports Queue:** `GET /admin/reports`, `POST /admin/reports/:id/resolve`
- **Events Management:** `POST /admin/events`, `PUT /admin/events/:id`, `GET /admin/events/:id/attendees`
- **Matching Simulator:** `POST /admin/simulate`
- **System Configs:** `POST /admin/configs/draft`, `POST /admin/configs/:id/publish`, `POST /admin/configs/:id/rollback`
