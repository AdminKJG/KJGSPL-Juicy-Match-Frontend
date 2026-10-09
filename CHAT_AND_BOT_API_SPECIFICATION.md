# Juicy Match & AI Marriage — Chat & Chatbot API Specification

> **Document Version**: 2.5.0  
> **Target Audience**: Frontend Engineering Team (Web, iOS, Android, React Native, Flutter)  
> **Server Base URL**: `http://<HOST>:<PORT>` (e.g., `http://localhost:8080` / `http://localhost:8100`)  
> **WebSocket Transport**: Socket.io v4 (`transports: ["websocket", "polling"]`)  
> **Authentication**: Bearer JWT (`Authorization: Bearer <token>` or Socket `auth: { token: "<token>" }`)  
> **Status**: Production Ready & Fully Verified against NodeJS Backend Engine

---

## Table of Contents

1. [Architectural Overview & `is_bot` Condition Flow](#1-architectural-overview--is_bot-condition-flow)
2. [Data Enums & Status Codes](#2-data-enums--status-codes)
3. [TypeScript Interfaces & Schemas](#3-typescript-interfaces--schemas)
4. [REST API Endpoints (Complete Reference)](#4-rest-api-endpoints-complete-reference)
   - [4.1 GET /v1/connections (Inbox & Matches)](#41-get-v1connections-inbox--matches)
   - [4.2 POST /v1/connections/:id/consent (Open Chat Consent)](#42-post-v1connectionsidconsent-open-chat-consent)
   - [4.3 GET /v1/connections/:id/messages (Fetch Message History)](#43-get-v1connectionsidmessages-fetch-message-history)
   - [4.4 POST /v1/connections/:id/messages (Send Text Message & Trigger Bot Turn)](#44-post-v1connectionsidmessages-send-text-message--trigger-bot-turn)
   - [4.5 POST /v1/connections/:id/voice (Send Voice Note)](#45-post-v1connectionsidvoice-send-voice-note)
   - [4.6 PATCH /v1/connections/:id/messages/:messageId (Edit Message)](#46-patch-v1connectionsidmessagesmessageid-edit-message)
   - [4.7 DELETE /v1/connections/:id/messages/:messageId (Delete Message)](#47-delete-v1connectionsidmessagesmessageid-delete-message)
   - [4.8 DELETE /v1/connections/:id/messages (Clear Chat History)](#48-delete-v1connectionsidmessages-clear-chat-history)
   - [4.9 POST /v1/connections/:id/read (Mark Messages as Read)](#49-post-v1connectionsidread-mark-messages-as-read)
   - [4.10 POST /v1/connections/:id/messages/:messageId/reaction (Message Reactions)](#410-post-v1connectionsidmessagesmessageidreaction-message-reactions)
   - [4.11 POST /v1/assist (AI Icebreakers & Discussion Starters)](#411-post-v1assist-ai-icebreakers--discussion-starters)
   - [4.12 GET /v1/profiles/:id (Profile Details with `isBot`)](#412-get-v1profilesid-profile-details-with-isbot)
   - [4.13 POST /v1/media (Upload Voice / Media Asset)](#413-post-v1media-upload-voice--media-asset)
   - [4.14 Internal Bot Engine API (POST /internal/v1/bot-chat/respond)](#414-internal-bot-engine-api-post-internalv1bot-chatrespond)
5. [Socket.io Real-Time Protocol Specification](#5-socketio-real-time-protocol-specification)
   - [5.1 Socket Handshake & Rooms](#51-socket-handshake--rooms)
   - [5.2 Client-to-Server Events](#52-client-to-server-events)
   - [5.3 Server-to-Client Events](#53-server-to-client-events)
6. [Frontend Implementation Blueprint for `is_bot: true`](#6-frontend-implementation-blueprint-for-is_bot-true)
   - [6.1 Detection & UI Conditioning](#61-detection--ui-conditioning)
   - [6.2 Complete Frontend Chat Flow (React / TypeScript Example)](#62-complete-frontend-chat-flow-react--typescript-example)
7. [Error Handling & Edge Cases](#7-error-handling--edge-cases)

---

## 1. Architectural Overview & `is_bot` Condition Flow

The chat system supports **dual-transport communication** (REST HTTP + Real-Time WebSockets) and seamlessly routes messages between **Human-to-Human** and **Human-to-Bot** profiles based on the `is_bot` / `isBot` condition.

### How the `is_bot` Condition Works:

```
                      +-----------------------------+
                      |   User Sends Message        |
                      | (REST or Socket.io)         |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Backend Saves User Message  |
                      | & Broadcasts to Room        |
                      +--------------+--------------+
                                     |
                                     v
                       /---------------------------\
                      <  Is Peer 'is_bot: true'?    >
                       \---------------------------/
                               /            \
                       NO     /              \   YES
                             v                v
            +--------------------+    +----------------------------------+
            | Standard P2P Flow  |    | Asynchronous Bot Engine Pipeline |
            | Recipient notified |    | 1. Auto-reply validation         |
            +--------------------+    | 2. Fetch history (max 16 msgs)   |
                                      | 3. Query Hybrid Bot / LLM Engine |
                                      | 4. Simulate Reading Pause        |
                                      | 5. Emit 'bot_typing: true'       |
                                      | 6. Simulate Typing Duration      |
                                      | 7. Emit 'bot_typing: false'      |
                                      | 8. Save & Emit 'bot_message'     |
                                      +----------------------------------+
```

### Condition Criteria (`shouldAutoReply`):
1. **Target Account Condition**: `peer.is_bot === true` OR `peer.profile.isBot === true`.
2. **Auto-Reply Enabled**: `peer.auto_reply !== false` AND `peer.profile.autoReply !== false`.
3. **Loop Prevention**: Sender must NOT be a bot (`sender.is_bot !== true`).
4. **Connection State**: Connection state must be `"active"`.

---

## 2. Data Enums & Status Codes

### 2.1 `MessageKind`
Type of message content sent or received.
```typescript
export type MessageKind = 'text' | 'voice' | 'photo' | 'system';
```

### 2.2 `DeleteMode`
Deletion scope when removing a message.
```typescript
export type DeleteMode = 'everyone' | 'me';
```
- `"everyone"`: Recalls message for all participants (Allowed within 60 minutes of sending by message author). Sets `deleted_for_all: true` and `body: null`.
- `"me"`: Deletes message only from current user's view (Appends user ID to `deleted_by` array).

### 2.3 `ConnectionState`
State of the connection thread between two members.
```typescript
export type ConnectionState = 'pending' | 'active' | 'blocked' | 'ended';
```

### 2.4 `BotResponseClass`
Engine classification for how a bot response was generated.
```typescript
export type BotResponseClass =
  | 'deterministic'      // Matched high-speed rule/template (<10ms)
  | 'llm_assisted'       // Generated via local LLM (ibm/granite-4-h-tiny)
  | 'recovery'           // Clarification or recovery fallback
  | 'crisis'             // Safety boundary response
  | 'answer_direct'      // Direct answer template
  | 'question_followup'; // Conversational follow-up question
```

### 2.5 `BotPersonaId`
Persona traits governing bot tone, response length, and typing speed.
```typescript
export type BotPersonaId =
  | 'warm_expressive'
  | 'warm_creative'
  | 'playful_witty'
  | 'intellectual'
  | 'calm_supportive';
```

### 2.6 `PhotoAccessStatus`
Access level to peer's private photo gallery.
```typescript
export type PhotoAccessStatus = 'none' | 'pending' | 'granted' | 'revoked';
```

---

## 3. TypeScript Interfaces & Schemas

```typescript
// ==========================================
// User & Peer Profile Schema
// ==========================================
export interface PeerProfile {
  id: string;
  pseudonym?: string;
  age?: number;
  zone?: string;
  city?: string;
  occupation?: string;
  bio?: string;
  aboutMe?: string;
  interests?: string[];
  portrait?: number;
  avatarUrl?: string | null;
  profilePhoto?: string | null;
  photos?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    createdAt: string;
  }>;
  channels?: {
    text?: boolean;
    voice?: boolean;
    video?: boolean;
  };
  isBot: boolean; // PRIMARY CONDITION FLAG: true if account is bot
  hasPhotoAccess?: boolean;
  photoAccessStatus?: PhotoAccessStatus;
}

// ==========================================
// Chat Message Data Structure
// ==========================================
export interface MessageReplySummary {
  id: string;
  sender?: string;
  body?: string | null;
  kind?: MessageKind;
}

export interface MessageReactionItem {
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  connectionId: string;
  sender: string;
  kind: MessageKind;
  body: string | null;
  clientId?: string;
  replyToId?: string | null;
  replyTo?: MessageReplySummary | null;
  isEdited?: boolean;
  editedAt?: string | null;
  deletedForAll?: boolean;
  deleted_for_all?: boolean;
  readAt?: string | null;
  read_at?: string | null;
  reactions?: Record<string, string> | MessageReactionItem[];
  mediaId?: string | null;
  mediaUrl?: string | null;
  url?: string | null;
  duration?: number | null; // For voice messages (seconds)
  renderedFrom?: string | null; // Anti-repetition template tag
  createdAt: string;
  created_at: string;
}

// ==========================================
// Connection Item Structure (Inbox)
// ==========================================
export interface ConnectionItem {
  id: string;
  a: string;
  b: string;
  state: ConnectionState;
  created_at: string;
  last_message_at: string | null;
  peer: PeerProfile;
  profilePhoto?: string | null;
  avatarUrl?: string | null;
  photos?: Array<any>;
  channels?: {
    text?: boolean;
    voice?: boolean;
    video?: boolean;
  };
  unreadCount: number;
  lastMessage: ChatMessage | null;
  liveUntil?: string | null;
  myConsent: boolean;
  peerConsent: boolean;
}

export interface ConnectionsResponse {
  items: ConnectionItem[];
  inbound: Array<{
    swipe_id: string;
    created_at: string;
    peer: PeerProfile;
  }>;
  outbound: Array<{
    swipe_id: string;
    created_at: string;
    peer: PeerProfile;
  }>;
  counts: {
    mutual: number;
    inbound: number;
    outbound: number;
  };
  interests: string[];
}
```

---

## 4. REST API Endpoints (Complete Reference)

### 4.1 GET `/v1/connections` (Inbox & Matches)
Retrieves all mutual active connections, inbound likes, and outbound likes with full unread counters and peer `isBot` indicators.

- **Method**: `GET`
- **Path**: `/v1/connections`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "items": [
    {
      "id": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
      "a": "usr_99812480-1a0e-4342-8356-653a9e334df1",
      "b": "usr_bot_ananya_01",
      "state": "active",
      "created_at": "2026-10-08T10:00:00.000Z",
      "last_message_at": "2026-10-09T11:45:00.000Z",
      "peer": {
        "id": "usr_bot_ananya_01",
        "pseudonym": "Ananya Sharma",
        "age": 26,
        "zone": "Mumbai",
        "interests": ["coffee", "travel", "indie music"],
        "bio": "Architect who loves cozy cafes and weekend treks.",
        "avatarUrl": "https://cdn.juicymatch.com/avatars/ananya.jpg",
        "profilePhoto": "https://cdn.juicymatch.com/avatars/ananya.jpg",
        "isBot": true,
        "hasPhotoAccess": false,
        "photoAccessStatus": "none"
      },
      "unreadCount": 1,
      "lastMessage": {
        "id": "msg_00192837",
        "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
        "sender": "usr_bot_ananya_01",
        "kind": "text",
        "body": "I love discovering new cafes! Have you been to Subko recently?",
        "mediaId": null,
        "mediaUrl": null,
        "createdAt": "2026-10-09T11:45:00.000Z"
      },
      "myConsent": true,
      "peerConsent": true
    }
  ],
  "inbound": [],
  "outbound": [],
  "counts": {
    "mutual": 1,
    "inbound": 0,
    "outbound": 0
  },
  "interests": []
}
```

---

### 4.2 POST `/v1/connections/:id/consent` (Open Chat Consent)
Agrees to activate full two-way messaging for this connection. Both participants must consent (for bot peers, consent is automatically active).

- **Method**: `POST`
- **Path**: `/v1/connections/:id/consent`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "accept": true
}
```

#### Success Response (`200 OK`):
```json
{
  "state": "active",
  "active": true
}
```

---

### 4.3 GET `/v1/connections/:id/messages` (Fetch Message History)
Fetches chronological conversation message history including parent reply quotes, reactions, audio metadata, and anti-repetition tags.

- **Method**: `GET`
- **Path**: `/v1/connections/:id/messages`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "items": [
    {
      "id": "msg_90123847-1a0e-4342-8356-653a9e334df1",
      "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
      "sender": "usr_99812480-1a0e-4342-8356-653a9e334df1",
      "kind": "text",
      "body": "Hey Ananya! What kind of coffee do you usually order?",
      "clientId": "client_uuid_001",
      "replyToId": null,
      "replyTo": null,
      "isEdited": false,
      "editedAt": null,
      "deletedForAll": false,
      "readAt": "2026-10-09T11:44:30.000Z",
      "reactions": {},
      "mediaId": null,
      "mediaUrl": null,
      "duration": null,
      "renderedFrom": null,
      "createdAt": "2026-10-09T11:44:00.000Z",
      "created_at": "2026-10-09T11:44:00.000Z"
    },
    {
      "id": "msg_90123848-1a0e-4342-8356-653a9e334df2",
      "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
      "sender": "usr_bot_ananya_01",
      "kind": "text",
      "body": "A flat white with oat milk is my absolute favorite ☕ What's your go-to spot?",
      "clientId": "client_uuid_bot_reply_001",
      "replyToId": null,
      "replyTo": null,
      "isEdited": false,
      "editedAt": null,
      "deletedForAll": false,
      "readAt": null,
      "reactions": {
        "usr_99812480-1a0e-4342-8356-653a9e334df1": "❤️"
      },
      "mediaId": null,
      "mediaUrl": null,
      "duration": null,
      "renderedFrom": "template_interest_coffee_01",
      "createdAt": "2026-10-09T11:44:05.000Z",
      "created_at": "2026-10-09T11:44:05.000Z"
    }
  ]
}
```

---

### 4.4 POST `/v1/connections/:id/messages` (Send Text Message & Trigger Bot Turn)
Sends a text message. If recipient peer is a Bot (`isBot === true`), the backend automatically starts the async bot response sequence (reading pause ➔ typing simulation ➔ bot reply delivery).

- **Method**: `POST`
- **Path**: `/v1/connections/:id/messages`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "body": "Do you enjoy indie rock or acoustic sets more?",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "replyToId": "msg_90123848-1a0e-4342-8356-653a9e334df2"
}
```

#### Success Response (`201 Created`):
```json
{
  "ok": true,
  "id": "msg_90123849-1a0e-4342-8356-653a9e334df3",
  "body": "Do you enjoy indie rock or acoustic sets more?",
  "replyTo": {
    "id": "msg_90123848-1a0e-4342-8356-653a9e334df2",
    "sender": "usr_bot_ananya_01",
    "body": "A flat white with oat milk is my absolute favorite ☕ What's your go-to spot?",
    "kind": "text"
  },
  "message": {
    "id": "msg_90123849-1a0e-4342-8356-653a9e334df3",
    "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
    "sender": "usr_99812480-1a0e-4342-8356-653a9e334df1",
    "kind": "text",
    "body": "Do you enjoy indie rock or acoustic sets more?",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "replyToId": "msg_90123848-1a0e-4342-8356-653a9e334df2",
    "replyTo": {
      "id": "msg_90123848-1a0e-4342-8356-653a9e334df2",
      "sender": "usr_bot_ananya_01",
      "body": "A flat white with oat milk is my absolute favorite ☕ What's your go-to spot?",
      "kind": "text"
    },
    "isEdited": false,
    "editedAt": null,
    "deletedForAll": false,
    "readAt": null,
    "reactions": {},
    "renderedFrom": null,
    "createdAt": "2026-10-09T11:46:00.000Z",
    "created_at": "2026-10-09T11:46:00.000Z"
  }
}
```

> [!NOTE]
> **Asynchronous Bot Trigger**: If recipient is a bot, the HTTP response returns immediately (201 Created). The bot's reply will arrive shortly via Socket.io events (`typing:status` / `bot_typing` ➔ `message:received` / `bot_message`).

---

### 4.5 POST `/v1/connections/:id/voice` (Send Voice Note)
Sends an uploaded voice recording to the connection.

- **Method**: `POST`
- **Path**: `/v1/connections/:id/voice`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "mediaId": "media_uuid_789",
  "clientId": "client_uuid_voice_001"
}
```

#### Success Response (`200 OK`):
```json
{
  "ok": true,
  "message": {
    "id": "msg_uuid_voice_123",
    "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
    "sender": "usr_99812480-1a0e-4342-8356-653a9e334df1",
    "kind": "voice",
    "mediaId": "media_uuid_789",
    "mediaUrl": "/v1/media/media_uuid_789",
    "url": "/v1/media/media_uuid_789",
    "duration": 12.4,
    "clientId": "client_uuid_voice_001",
    "createdAt": "2026-10-09T11:47:00.000Z"
  }
}
```

---

### 4.6 PATCH `/v1/connections/:id/messages/:messageId` (Edit Message)
Edits a previously sent text message within **10 minutes** of creation.

- **Method**: `PATCH`
- **Path**: `/v1/connections/:id/messages/:messageId`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "body": "Do you enjoy indie rock or acoustic gigs more?"
}
```

#### Success Response (`200 OK`):
```json
{
  "id": "msg_90123849-1a0e-4342-8356-653a9e334df3",
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "sender": "usr_99812480-1a0e-4342-8356-653a9e334df1",
  "kind": "text",
  "body": "Do you enjoy indie rock or acoustic gigs more?",
  "isEdited": true,
  "editedAt": "2026-10-09T11:48:00.000Z",
  "createdAt": "2026-10-09T11:46:00.000Z",
  "created_at": "2026-10-09T11:46:00.000Z"
}
```

#### Error Response (`403 Forbidden`):
```json
{
  "error": "Messages can only be edited within 10 minutes of sending."
}
```

---

### 4.7 DELETE `/v1/connections/:id/messages/:messageId` (Delete Message)
Deletes a message either for everyone or for the current user.

- **Method**: `DELETE`
- **Path**: `/v1/connections/:id/messages/:messageId`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "mode": "everyone"
}
```

#### Success Response (`200 OK`):
```json
{
  "id": "msg_90123849-1a0e-4342-8356-653a9e334df3",
  "deletedForAll": true,
  "message": "Message deleted"
}
```

---

### 4.8 DELETE `/v1/connections/:id/messages` (Clear Chat History)
Clears all message history in the thread for the current authenticated user.

- **Method**: `DELETE`
- **Path**: `/v1/connections/:id/messages`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "ok": true,
  "message": "Chat history cleared for your account"
}
```

---

### 4.9 POST `/v1/connections/:id/read` (Mark Messages as Read)
Marks unread messages as read up to a specific message ID or entire thread.

- **Method**: `POST`
- **Path**: `/v1/connections/:id/read`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "lastReadMessageId": "msg_90123848-1a0e-4342-8356-653a9e334df2"
}
```

#### Success Response (`200 OK`):
```json
{
  "ok": true,
  "readCount": 2
}
```

---

### 4.10 POST `/v1/connections/:id/messages/:messageId/reaction` (Message Reactions)
Adds, updates, or removes an emoji reaction on a message.

- **Method**: `POST`
- **Path**: `/v1/connections/:id/messages/:messageId/reaction`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body (To Add / Update):
```json
{
  "emoji": "❤️"
}
```

#### Request Body (To Remove):
```json
{
  "emoji": null
}
```

#### Success Response (`200 OK`):
```json
{
  "id": "msg_90123848-1a0e-4342-8356-653a9e334df2",
  "reactions": {
    "usr_99812480-1a0e-4342-8356-653a9e334df1": "❤️"
  }
}
```

---

### 4.11 POST `/v1/assist` (AI Icebreakers & Discussion Starters)
Generates intelligent, deterministic conversation starters and compatibility discussion topics based on shared profile interests.

- **Method**: `POST`
- **Path**: `/v1/assist`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "target": "usr_bot_ananya_01"
}
```

#### Success Response (`200 OK`):
```json
{
  "mode": "rules",
  "llmCalls": 0,
  "reasons": [
    "You both enjoy coffee culture and exploring local cafes.",
    "Shared interest in weekend travel and music."
  ],
  "discussion": [
    "Ask about their favorite cafes in Mumbai.",
    "Discuss dream travel destinations for a quick weekend getaway."
  ],
  "icebreaker": "I noticed we both enjoy coffee. What is a recent favourite cafe of yours?"
}
```

---

### 4.12 GET `/v1/profiles/:id` (Profile Details with `isBot`)
Fetches complete profile metadata for a target member or bot.

- **Method**: `GET`
- **Path**: `/v1/profiles/:id`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "id": "usr_bot_ananya_01",
  "pseudonym": "Ananya Sharma",
  "age": 26,
  "zone": "Mumbai",
  "interests": ["coffee", "travel", "design"],
  "bio": "Architect who loves cozy cafes and weekend treks.",
  "avatarUrl": "https://cdn.juicymatch.com/avatars/ananya.jpg",
  "profilePhoto": "https://cdn.juicymatch.com/avatars/ananya.jpg",
  "photos": [],
  "isBot": true,
  "hasPhotoAccess": false,
  "photoAccessStatus": "none"
}
```

---

### 4.13 POST `/v1/media` (Upload Voice / Media Asset)
Uploads base64 encoded media (voice note or photo). Returns the `mediaId` to use in `POST /v1/connections/:id/voice`.

- **Method**: `POST`
- **Path**: `/v1/media`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "kind": "voice",
  "base64": "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH..."
}
```

#### Success Response (`201 Created`):
```json
{
  "id": "media_99182301-3a9d-42ef-9f5b-98f5b40cfd69",
  "kind": "voice",
  "url": "/v1/media/media_99182301-3a9d-42ef-9f5b-98f5b40cfd69",
  "duration": 5.2
}
```

---

### 4.14 Internal Bot Engine API (`POST /internal/v1/bot-chat/respond`)
Internal direct contract with the Python Bot Chat Engine (`Granite-4-h-tiny` + Fast Deterministic matcher).

- **Method**: `POST`
- **Path**: `/internal/v1/bot-chat/respond`
- **Headers**: `x-internal-key: <INTERNAL_KEY>`, `Content-Type: application/json`

#### Request Payload:
```json
{
  "product": "juicy-match",
  "botProfile": {
    "botId": "usr_bot_ananya_01",
    "name": "Ananya Sharma",
    "age": 26,
    "city": "Mumbai",
    "occupation": "Architect",
    "interests": ["coffee", "travel", "design"],
    "personaId": "warm_expressive"
  },
  "peerProfile": {
    "userId": "usr_99812480",
    "name": "Mahendra",
    "age": 28,
    "city": "Mumbai",
    "interests": ["coffee", "photography"]
  },
  "turnCount": 2,
  "recentMessages": [
    {
      "sender": "user",
      "content": "Hey Ananya! Have you checked out any good cafes in Bandra?"
    }
  ],
  "matchProfileSnippet": {
    "shared_interests": ["coffee"]
  }
}
```

#### Response Payload (`200 OK`):
```json
{
  "requestId": "req_bot_9812039",
  "modelVersion": "ibm/granite-4-h-tiny",
  "result": {
    "reply": "Yes! Subko and Veronica's are my go-to spots in Bandra. Do you prefer specialty pour-overs or classic lattes?",
    "intent": "interest_coffee",
    "responseClass": "deterministic",
    "personaId": "warm_expressive",
    "renderedFrom": "template_interest_coffee_02",
    "replyDelayMs": 1800,
    "typingDurationMs": 2200,
    "conversationState": {
      "topic": "lifestyle_coffee",
      "stage": "exploring"
    },
    "suggestedTopics": ["favorite cafes", "specialty beans"]
  },
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0
  }
}
```

---

## 5. Socket.io Real-Time Protocol Specification

### 5.1 Socket Handshake & Rooms

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:8080', {
  auth: {
    token: '<USER_JWT_TOKEN>',
  },
  transports: ['websocket', 'polling'],
});
```

#### Room Lifecycle:
1. **User Room (`user:<userId>`)**: Joined automatically upon authentication. Receives `notification:new_message`, calls, and badge updates.
2. **Connection Room (`connection:<connectionId>`)**: Must be joined when user opens a chat screen via `connection:join`.

---

### 5.2 Client-to-Server Events

| Event Name | Alias | Payload | Description |
|---|---|---|---|
| `connection:join` | `join_connection`, `join_room` | `{ connectionId: string }` | Join room for live thread updates. |
| `connection:leave` | `leave_connection`, `leave_room` | `{ connectionId: string }` | Leave room when exiting screen. |
| `message:send` | `send_message`, `send_user_message` | `{ connectionId: string, body: string, clientId?: string, replyToId?: string }` | Send text message. Automatically triggers bot turn if peer is bot. |
| `typing:start` | `user_typing` (isTyping: true) | `{ connectionId: string }` | Notify peer user has started typing. |
| `typing:stop` | `user_typing` (isTyping: false) | `{ connectionId: string }` | Notify peer user has stopped typing. |
| `message:edit` | `edit_message` | `{ connectionId: string, messageId: string, body: string }` | Edit message body (within 10m). |
| `message:delete` | `delete_message` | `{ connectionId: string, messageId: string, target: "everyone" \| "me" }` | Delete message. |
| `message:reaction`| `react_message` | `{ connectionId: string, messageId: string, emoji: string }` | Toggle emoji reaction. |
| `message:read` | `message_seen` | `{ connectionId: string }` | Send read receipt for thread. |

---

### 5.3 Server-to-Client Events

#### 1. Live Typing Indicators (Bot & Human)
- **Event**: `typing:status` (Also aliased as `bot_typing`)
- **Payload**:
```json
{
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "userId": "usr_bot_ananya_01",
  "isTyping": true
}
```
- **Bot Typing Alias (`bot_typing`)**:
```json
{
  "conversationId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "isTyping": true
}
```

#### 2. Message Received (`message:received` / `new_message` / `bot_message`)
- **Event**: `message:received`
- **Payload**:
```json
{
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "message": {
    "id": "msg_90123850",
    "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
    "sender": "usr_bot_ananya_01",
    "kind": "text",
    "body": "Subko's cold brew is incredible! What's your usual coffee order?",
    "clientId": "client_uuid_bot_456",
    "replyToId": null,
    "replyTo": null,
    "isEdited": false,
    "editedAt": null,
    "deletedForAll": false,
    "readAt": null,
    "reactions": {},
    "renderedFrom": "template_interest_coffee_02",
    "createdAt": "2026-10-09T11:46:04.000Z",
    "created_at": "2026-10-09T11:46:04.000Z"
  }
}
```

#### 3. Message Edited (`message:updated` / `message_edited`)
- **Event**: `message:updated`
- **Payload**:
```json
{
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "message": {
    "id": "msg_90123849",
    "body": "Do you enjoy indie rock or acoustic gigs more?",
    "isEdited": true,
    "editedAt": "2026-10-09T11:48:00.000Z"
  }
}
```

#### 4. Message Deleted (`message:deleted` / `message_deleted`)
- **Event**: `message:deleted`
- **Payload**:
```json
{
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "messageId": "msg_90123849",
  "target": "everyone"
}
```

#### 5. Reactions Updated (`message:reaction_updated` / `message_reacted`)
- **Event**: `message:reaction_updated`
- **Payload**:
```json
{
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "messageId": "msg_90123850",
  "reactions": {
    "usr_99812480": "🔥"
  }
}
```

#### 6. Read Receipts (`message:seen` / `messages_read`)
- **Event**: `message:seen`
- **Payload**:
```json
{
  "connectionId": "conn_c4889508-3a9d-42ef-9f5b-98f5b40cfd69",
  "readBy": "usr_bot_ananya_01",
  "readCount": 1,
  "timestamp": "2026-10-09T11:46:05.000Z"
}
```

---

## 6. Frontend Implementation Blueprint for `is_bot: true`

### 6.1 Detection & UI Conditioning

When rendering the chat view, inspect the `peer.isBot` flag:

```typescript
const isBot = Boolean(connection.peer.isBot);

if (isBot) {
  // 1. Show AI Assistant / Bot Badge in header (e.g. "🤖 AI Match" or Verified Badge)
  // 2. Hide voice/video call button if bot doesn't support live RTC
  // 3. Display AI Icebreakers bar using POST /v1/assist
  // 4. Ensure typing indicator renders during 'typing:status' or 'bot_typing'
}
```

---

### 6.2 Complete Frontend Chat Flow (React / TypeScript Example)

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatProps {
  connectionId: string;
  peer: {
    id: string;
    pseudonym: string;
    avatarUrl?: string;
    isBot: boolean; // Flag to indicate if peer is a bot
  };
  currentUserToken: string;
}

export const ChatScreen: React.FC<ChatProps> = ({ connectionId, peer, currentUserToken }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [icebreaker, setIcebreaker] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Initialize Socket.io Connection & Room
  useEffect(() => {
    const socket = io('http://localhost:8080', {
      auth: { token: currentUserToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join conversation room
      socket.emit('connection:join', { connectionId });
    });

    // Handle Incoming Messages (Bot & Human)
    socket.on('message:received', (data: { connectionId: string; message: any }) => {
      if (data.connectionId === connectionId) {
        setMessages((prev) => [...prev, data.message]);
        setIsPeerTyping(false); // Typing completed
      }
    });

    // Handle Real-Time Typing Indicator
    socket.on('typing:status', (data: { connectionId: string; userId: string; isTyping: boolean }) => {
      if (data.connectionId === connectionId && data.userId === peer.id) {
        setIsPeerTyping(data.isTyping);
      }
    });

    // Handle Bot Specific Typing Indicator
    socket.on('bot_typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === connectionId) {
        setIsPeerTyping(data.isTyping);
      }
    });

    // Fetch Message History via REST API
    fetch(`/v1/connections/${connectionId}/messages`, {
      headers: { Authorization: `Bearer ${currentUserToken}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data.items || []));

    // If Peer is a Bot, fetch AI Icebreaker suggestions
    if (peer.isBot) {
      fetch('/v1/assist', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentUserToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target: peer.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.icebreaker) setIcebreaker(data.icebreaker);
        })
        .catch(() => {});
    }

    return () => {
      socket.emit('connection:leave', { connectionId });
      socket.disconnect();
    };
  }, [connectionId, peer.id, peer.isBot, currentUserToken]);

  // 2. Send Message Handler
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const clientId = crypto.randomUUID();

    // Option A: Send via Real-Time Socket
    if (socketRef.current?.connected) {
      socketRef.current.emit(
        'message:send',
        {
          connectionId,
          body: text,
          clientId,
        },
        (ack: any) => {
          if (ack?.ok) {
            setInputText('');
          }
        }
      );
    } else {
      // Option B: Fallback to REST API
      fetch(`/v1/connections/${connectionId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentUserToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: text,
          clientId,
        }),
      }).then(() => setInputText(''));
    }
  };

  return (
    <div className="chat-container">
      {/* Header with Bot Badge */}
      <div className="chat-header">
        <img src={peer.avatarUrl || '/default-avatar.png'} alt={peer.pseudonym} className="avatar" />
        <div className="peer-info">
          <h3>{peer.pseudonym}</h3>
          {peer.isBot && <span className="badge-bot">🤖 Verified AI Persona</span>}
        </div>
      </div>

      {/* Optional Icebreaker for Bot Conversations */}
      {peer.isBot && icebreaker && (
        <div className="icebreaker-banner" onClick={() => handleSendMessage(icebreaker)}>
          <span>💡 Suggested Starter: "{icebreaker}"</span>
          <button type="button">Send</button>
        </div>
      )}

      {/* Messages List */}
      <div className="messages-list">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender === peer.id ? 'incoming' : 'outgoing'}`}>
            <p>{msg.body}</p>
            <span className="timestamp">
              {new Date(msg.createdAt || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Live Typing Indicator */}
        {isPeerTyping && (
          <div className="typing-indicator">
            <span>{peer.pseudonym} is typing...</span>
            <div className="dots-animation">•••</div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={() => handleSendMessage()}>Send</button>
      </div>
    </div>
  );
};
```

---

## 7. Error Handling & Edge Cases

| Status Code | Error Scenario | Resolution Strategy |
|---|---|---|
| `400 Bad Request` | Body empty or exceeds 2,000 characters | Validate input client-side before sending. |
| `401 Unauthorized` | Invalid or expired JWT token | Redirect to login or call token refresh endpoint. |
| `403 Forbidden` | Edit window expired (> 10 mins) or delete for everyone window expired (> 60 mins) | Disable edit/delete buttons dynamically after timestamps expire. |
| `404 Not Found` | Connection or quoted message not found | Refresh connection inbox state. |
| `409 Conflict` | Reused `clientId` with altered payload | Always generate unique UUID v4 for each new send attempt. |
| `422 Unprocessable` | Invalid base64 or unsupported media format | Ensure audio recordings are base64 WebM/AAC with valid headers. |
| `500 Server Error` | Python Engine offline or fallback triggered | Server automatically generates deterministic fallback replies (`generateFallbackBotReply`). Frontend displays reply smoothly. |

---

> **End of Specification**  
> For questions or backend schema updates, contact the Backend & AI Engineering Team.
