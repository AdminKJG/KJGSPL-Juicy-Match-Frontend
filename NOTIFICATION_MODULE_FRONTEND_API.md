# Juicy Match — Notification Module API Specification
**Target Audience:** Frontend Developers (Web, React, React Native, Mobile Apps)  
**Version:** 1.0.0 (Production Release)  
**Base URL:** `https://api.juicymatch.com` (Production) / `http://127.0.0.1:8100` (Local Dev)  
**Websocket URL:** `wss://api.juicymatch.com` / `ws://127.0.0.1:8100`  
**Authentication:** HTTP `Authorization: Bearer <accessToken>` / Socket.io `auth: { token: "<accessToken>" }`

---

## 1. Overview & Architecture

The Juicy Match Notification System is a **hybrid real-time & persistent notification engine**. It allows frontend clients to:
1. **Receive Instant Push Alerts** via WebSocket (`Socket.IO`) when new events occur (sparks, messages, billing, security alerts).
2. **Display Badge Counters** on navigation bars and bell icons that sync in real-time across multiple tabs and devices.
3. **Fetch Historical In-App Notifications** via REST with full pagination and category filtering.
4. **Deep-Link Seamlessly** to any feature screen (`/messages/:id`, `/connections`, `/membership`, `/album`, `/settings`, etc.).
5. **Manage Read States** individually (`POST /read`) or in bulk (`POST /read-all`).

---

## 2. Core Data Models & Schemas

### 2.1 Notification Item Object (`NotificationItem`)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `id` | `string` (UUID) | No | Unique identifier for the notification. |
| `category` | `string` (Enum) | No | Notification domain (used for icons, filters, and audio tags). |
| `title` | `string` | No | Short, bold notification headline (e.g., *"New Mutual Spark! 🔥"*). |
| `body` | `string` | No | Meaningful preview snippet or contextual description. |
| `route` | `string` | No | Relative navigation path (always starts with `/`). |
| `created_at` | `string` (ISO 8601) | No | Timestamp when the notification was dispatched. |
| `read_at` | `string` (ISO 8601) | Yes | `null` if unread; ISO timestamp when marked as read. |
| `metadata` | `object` | No | Optional key-value context (e.g., `connectionId`, `senderId`, `orderId`). |

#### Example Notification JSON:
```json
{
  "id": "20f63f49-c7bd-4552-a82e-e64d802c3e49",
  "category": "messages",
  "title": "New message from Sofia",
  "body": "Hey! Are you free for coffee this weekend?",
  "route": "/messages/0d3d777e-04b0-4cab-b0e6-386296be6815",
  "created_at": "2026-10-10T12:00:00.000Z",
  "read_at": null,
  "metadata": {
    "connectionId": "0d3d777e-04b0-4cab-b0e6-386296be6815",
    "senderId": "jm-member-2"
  }
}
```

---

## 3. Categories, Enums & Route Mapping

The frontend should map the `category` string to appropriate UI badges, icons, and navigation actions:

| `category` Enum | Suggested Icon | Example Title | Example Body Preview | Deep-Link `route` |
|---|:---:|---|---|---|
| **`messages`** | 💬 MessageSquare | `"New message from [Name]"` | *"Hey! Are you free for coffee?"* | `/messages/:connectionId` |
| **`connections`** | 🔥 Flame / Spark | `"New Mutual Spark! 🔥"` | *"You and Elena liked each other."* | `/messages/:connectionId` or `/connections` |
| **`connections`** | ✨ Sparkles | `"Someone is interested in you ✨"` | *"A new member sent you a spark interest."* | `/connections` |
| **`billing`** | 👑 Crown / CreditCard | `"Membership Activated 👑"` | *"Your Connect VIP tier is now active. Enjoy boosts!"* | `/membership` |
| **`billing`** | ⚠️ AlertTriangle | `"Low Feature Credits Notice ⚠️"` | *"Your balance is down to 10 credits. Top up now."* | `/membership` |
| **`security`** | 🔒 ShieldCheck | `"New Login Detected 🔒"` | *"Login from Chrome on Windows at 10:35 AM."* | `/settings` |
| **`profile`** | 📸 Camera | `"Album Access Requested 📸"` | *"[Name] requested access to your private photos."* | `/album` |
| **`profile`** | ✨ CheckCircle | `"Album Access Approved ✨"` | *"[Name] granted you access to their private album."* | `/album` |
| **`travel`** | ✈️ Plane | `"Passport Destination Match ✈️"` | *"3 active members are currently in Tokyo!"* | `/passport` |
| **`discover`** | 🧭 Compass | `"New daily sparks available ✨"` | *"Fresh recommendations matching your vibe."* | `/discover` |
| **`events`** | 🍸 GlassWater | `"Exclusive Mixer RSVP Open 🍸"` | *"Weekend Rooftop Social registration is live."* | `/events` |
| **`explore`** | 📖 BookOpen | `"Curated Stories for You 📖"` | *"Check out trending conversation starters."* | `/explore` |
| **`assist`** | 💡 Sparkle | `"AI Icebreaker Ready 💡"` | *"Juicy AI drafted a personalized opening prompt."* | `/assist` |

> **Frontend Filter Recommendation (`NotificationsView`):**  
> Direct chat messages (`category: "messages"`) can optionally be hidden from the general notification bell if your app already provides an unread badge on the bottom navigation Chat icon.

---

## 4. REST API Endpoints

### 4.1 Get Notification Inbox
Retrieves paginated notifications for the authenticated member with the current unread count.

- **Method:** `GET`
- **Path:** `/v1/notifications`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `limit` *(number, optional, default: `50`, max: `100`)*: Number of items to return.
  - `category` *(string, optional)*: Filter by category (e.g., `?category=connections`).

#### Response: `200 OK`
```json
{
  "items": [
    {
      "id": "20f63f49-c7bd-4552-a82e-e64d802c3e49",
      "category": "messages",
      "title": "New message from Sofia",
      "body": "Hey! Are you free for coffee this weekend?",
      "route": "/messages/0d3d777e-04b0-4cab-b0e6-386296be6815",
      "created_at": "2026-10-10T12:00:00.000Z",
      "read_at": null,
      "metadata": {
        "connectionId": "0d3d777e-04b0-4cab-b0e6-386296be6815"
      }
    },
    {
      "id": "31a74e50-d8be-4663-b93e-f75e813d4e50",
      "category": "connections",
      "title": "New Mutual Spark! 🔥",
      "body": "You and Elena mutually liked each other. Say hello!",
      "route": "/connections",
      "created_at": "2026-10-10T11:45:00.000Z",
      "read_at": "2026-10-10T11:50:00.000Z",
      "metadata": {}
    }
  ],
  "unreadCount": 1
}
```

---

### 4.2 Get Unread Badge Counter
Lightweight polling endpoint to retrieve the current unread notification count.

- **Method:** `GET`
- **Path:** `/v1/notifications/unread-count`
- **Headers:** `Authorization: Bearer <token>`

#### Response: `200 OK`
```json
{
  "unreadCount": 3
}
```

---

### 4.3 Mark Single Notification as Read
Marks an individual notification as read. Automatically updates the unread badge counter in real-time.

- **Method:** `POST`
- **Path:** `/v1/notifications/:id/read`
- **Headers:** `Authorization: Bearer <token>`

#### Response: `200 OK`
```json
{
  "ok": true,
  "unreadCount": 2
}
```

#### Errors:
- `404 Not Found`: `{ "error": "Notification not found" }`

---

### 4.4 Mark All Notifications as Read
Batch marks all unread in-app notifications as read in a single request. Resets the unread badge to 0 across all active sessions.

- **Method:** `POST`
- **Path:** `/v1/notifications/read-all`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{}` (empty object)

#### Response: `200 OK`
```json
{
  "ok": true,
  "unreadCount": 0
}
```

---

### 4.5 Dismiss / Delete Notification
Deletes an in-app notification from the user's inbox.

- **Method:** `DELETE`
- **Path:** `/v1/notifications/:id`
- **Headers:** `Authorization: Bearer <token>`

#### Response: `200 OK`
```json
{
  "ok": true,
  "unreadCount": 2
}
```

---

### 4.6 Send Test Email (Debug & QA)
Dispatches a rendered email template to the user's email address to verify SMTP delivery and design layout.

- **Method:** `POST`
- **Path:** `/v1/notifications/test-email`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "template": "welcome",
  "recipientEmail": "user@example.com"
}
```
*Allowed `template` values:* `"verification"`, `"welcome"`, `"spark"`, `"billing"`, `"low_credit"`, `"security"`.

#### Response: `200 OK`
```json
{
  "ok": true,
  "sentTo": "user@example.com",
  "template": "welcome",
  "result": {
    "success": true,
    "messageId": "smtp-1760000000",
    "provider": "smtp"
  }
}
```

---

## 5. Real-Time Socket.IO Events

The frontend connects to the Socket.IO server at `/` using the member JWT token in the handshake.

### 5.1 Connection Setup (Frontend Example)
```javascript
import { io } from "socket.io-client";

const socket = io("https://api.juicymatch.com", {
  auth: {
    token: userToken, // or Authorization: `Bearer ${userToken}` in extraHeaders
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Connected to notification gateway");
});
```

---

### 5.2 Server-to-Client Inbound Events

#### 1. `notification:received`
Emitted immediately whenever a new in-app notification is dispatched for the authenticated user.

**Payload:**
```typescript
interface NotificationReceivedPayload {
  id: string;
  category: "messages" | "connections" | "billing" | "security" | "profile" | "travel" | "discover" | "events" | "explore" | "assist";
  title: string;
  body: string;
  route: string;
  created_at: string; // ISO 8601
  read_at: null;
  metadata: Record<string, any>;
}
```

**Frontend Handling Example:**
```javascript
socket.on("notification:received", (notification) => {
  // 1. Play subtle audio ping or trigger haptic feedback
  playSound("notification_chime");

  // 2. Prepend to in-memory notification list
  setNotifications((prev) => [notification, ...prev]);

  // 3. Display in-app toast / banner preview
  showInAppToast({
    title: notification.title,
    body: notification.body,
    onClick: () => navigate(notification.route),
  });
});
```

---

#### 2. `notification:badge_update`
Emitted whenever the total unread notification count changes (e.g., when a new notification arrives or when an item is marked as read).

**Payload:**
```json
{
  "unreadCount": 4
}
```

**Frontend Handling Example:**
```javascript
socket.on("notification:badge_update", ({ unreadCount }) => {
  // Update bell badge icon in navbar
  setUnreadCount(unreadCount);
});
```

---

## 6. Notification Preferences Management

Members can control which channels and categories they want to receive notifications for.

### 6.1 Get Preferences
- **Method:** `GET`
- **Path:** `/v1/preferences`

#### Response: `200 OK`
```json
{
  "preferences": {
    "frequency": "instant",
    "channels": {
      "inApp": true,
      "email": true,
      "push": false,
      "whatsapp": false
    },
    "categories": {
      "connections": true,
      "messages": true,
      "billing": true,
      "security": true,
      "travel": true,
      "marketing": false
    }
  }
}
```

### 6.2 Update Preferences
- **Method:** `POST`
- **Path:** `/v1/preferences`
- **Request Body:** (Partial or complete preference object)

```json
{
  "channels": {
    "inApp": true,
    "email": false
  },
  "categories": {
    "marketing": false
  }
}
```

---

## 7. Frontend Deep-Link Router Integration

When a user taps a notification card in the Notification Center or in an In-App Toast, pass `notification.route` directly into your router:

```javascript
import { useNavigate } from "react-router-dom";

function handleNotificationClick(notification) {
  // 1. Mark as read on backend (non-blocking)
  if (!notification.read_at) {
    api.post(`/v1/notifications/${notification.id}/read`);
  }

  // 2. Route to destination screen
  if (notification.route) {
    navigate(notification.route);
  }
}
```

### Supported Routes Summary:
- `/messages/:connectionId` ➔ Opens active conversation thread.
- `/connections` ➔ Opens Mutual Matches and Sparks tab.
- `/membership` ➔ Opens VIP tier upgrade & credit boost screen.
- `/album` ➔ Opens Private Media Vault & Access Requests tab.
- `/settings` ➔ Opens Security & Account Preferences.
- `/passport` ➔ Opens Travel destination mode.
- `/discover` ➔ Opens Daily Radar matching screen.

---

## 8. Summary Checklist for Frontend Developers

1. **Listen to WebSocket Events**: Register `notification:received` and `notification:badge_update` in your root layout or notification context.
2. **Display `body` Snippet**: Render `notification.body` on all notification cards so users get meaningful previews.
3. **Handle Mark All as Read**: Connect your UI *"Mark all as read"* button to `POST /v1/notifications/read-all`.
4. **Use Category Icons**: Map `notification.category` to domain-specific icons (Flame for Sparks, Crown for VIP Billing, Lock for Security, etc.).
5. **Direct Deep Links**: Always use `notification.route` to navigate directly without hardcoded path concatenation.
