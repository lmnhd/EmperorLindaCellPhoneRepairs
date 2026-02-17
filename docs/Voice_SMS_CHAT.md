# Voice / SMS / Chat — Complete Build Guide & Agent Skill

> **Purpose**: Reusable skill document for building AI-powered Voice, SMS, and Web Chat
> systems using Twilio + OpenAI + Next.js. Covers architecture, exact build steps,
> every pitfall encountered, and production hosting decisions.
>
> **Origin**: USA Pawn Holdings PoC (Feb 2026)
> **Author**: Auto-generated from lived debugging session
> **Status**: Production-verified — all FOUR channels operational
> **Channels**: Text Chat, SMS/MMS, Phone Voice, Browser Voice (WebRTC)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Channel Overview](#3-channel-overview)
4. [Prerequisites & Accounts](#4-prerequisites--accounts)
5. [Step-by-Step Build Guide](#5-step-by-step-build-guide)
   - [5.1 Project Structure](#51-project-structure)
   - [5.2 Web Chat (Channel 1)](#52-web-chat-channel-1)
   - [5.3 SMS/MMS (Channel 2)](#53-smsmms-channel-2)
   - [5.4 Phone Voice (Channel 3)](#54-phone-voice-channel-3)
   - [5.5 Browser Voice Chat (Channel 4)](#55-browser-voice-chat-channel-4)
6. [Hosting & Deployment](#6-hosting--deployment)
7. [Issues Encountered & Solutions](#7-issues-encountered--solutions)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Twilio Configuration Checklist](#9-twilio-configuration-checklist)
10. [Testing Procedures](#10-testing-procedures)
11. [Cost Breakdown](#11-cost-breakdown)
12. [Reuse Template](#12-reuse-template)
13. [**MANDATORY: Decomposed Prompt Architecture & Agent Control Dashboard**](#13-mandatory-decomposed-prompt-architecture--agent-control-dashboard)

---

## Latest Updates (February 2026)

### Channel 4 Added: Browser Voice Chat (WebRTC)

This document now covers **FOUR independent channels** (previously three). The new browser-based voice chat feature provides a modern, cost-effective alternative to phone-based voice interactions.

**What's new:**
- **Direct WebRTC connection** from browser to OpenAI Realtime API (no relay server needed)
- **Zero infrastructure cost** — no Render.com, no Twilio Voice charges
- **Client-side tool execution** — function calls routed to Next.js APIs from browser
- **Full image support** — Tool responses display images inline in voice transcripts
- **Seamless mode switching** — Voice transcripts merge into text chat history
- **Production-ready** — Deployed on Vercel with ephemeral token authentication

**Key differences from phone voice:**
- **Infrastructure**: Browser → OpenAI (vs. Browser → Twilio → Render → OpenAI)
- **Cost**: $0 infra + OpenAI only (vs. $7-35/mo for phone voice setup)
- **UX**: Same chat widget, toggle voice mode (vs. separate phone call)
- **Features**: Images, transcript persistence, tool execution (vs. phone-only audio)

**New sections in this document:**
- Section 3: Channel 4 overview
- Section 5.5: Complete browser voice implementation guide (600+ lines)
- Section 7: Issues #7-8 (image display, transcript persistence)
- Section 10: Browser voice testing procedures
- Section 11: Updated cost comparison (browser vs phone voice)

**When to use browser voice vs phone voice:**
- **Browser voice**: Modern websites, mobile-first apps, cost-sensitive projects
- **Phone voice**: Customer service lines, accessibility requirements, legacy phone users

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER TOUCHPOINTS                                │
├──────────────┬──────────────────┬──────────────────┬──────────────────────┤
│  Web Chat    │   SMS / MMS      │  Phone Call      │  Web Voice Chat     │
│  (text)      │   (text/photo)   │  (Twilio number) │  (browser mic)      │
└──────┬───────┴────────┬─────────┴────────┬─────────┴──────────┬───────────┘
       │                │                  │                    │
       ▼                ▼                  ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js App)                            │
│                                                                          │
│  /api/chat               → GPT-5-mini (function tools)                 │
│  /api/twilio/message     → GPT-4o-mini (SMS) / GPT-4o (Vision/MMS)     │
│  /api/twilio/voice       → TwiML → Render relay                        │
│  /api/realtime-session   → OpenAI ephemeral token (WebRTC)             │
│                                                                          │
└────────────────────────────┬──────────────────────────────┬─────────────┘
                             │                              │
                   Twilio Phone/SMS                  Browser WebRTC
                             │                              │
                             ▼                              ▼
              ┌──────────────────────────┐    ┌──────────────────────────┐
              │  TWILIO PLATFORM         │    │  OPENAI REALTIME API     │
              │                          │    │  (gpt-4o-realtime)       │
              │  Phone # → Webhook       │    │                          │
              │  SMS # → Webhook         │    │  Direct WebRTC from      │
              │  Media Streams           │    │  browser via             │
              └────────────┬─────────────┘    │  RTCPeerConnection       │
                           │                   └──────────────────────────┘
                           │ WebSocket
                           ▼
              ┌──────────────────────────┐
              │  RENDER.COM              │
              │  (Phone Voice Relay)     │
              │                          │
              │  Twilio Media Stream     │
              │  ←→ OpenAI Realtime API  │
              └──────────────────────────┘
```

### Data Flow Per Channel

| Channel | Trigger | Handler | AI Model | Response Format |
|:--------|:--------|:--------|:---------|:----------------|
| **Web Chat** | User types in chat widget | `POST /api/chat` on Vercel | GPT-5-mini (with function tools) | Streamed text |
| **SMS** | Customer texts Twilio number | `POST /api/twilio/message` on Vercel | GPT-4o-mini | TwiML `<Message>` |
| **MMS** | Customer texts photo to Twilio number | `POST /api/twilio/message` on Vercel | GPT-4o (Vision) | TwiML `<Message>` |
| **Phone Voice** | Customer calls Twilio number | `POST /api/twilio/voice` → TwiML → WebSocket relay → OpenAI Realtime | GPT-4o Realtime | Bidirectional audio stream |
| **Browser Voice** | User clicks mic button in chat widget | Browser WebRTC → `POST /api/realtime-session` (ephemeral token) → OpenAI Realtime | GPT-4o Realtime (gpt-4o-realtime-preview-2024-12-17) | Bidirectional audio + transcripts |

---

## 2. Technology Stack

| Component | Technology | Role |
|:----------|:-----------|:-----|
| **Frontend** | Next.js 15 (App Router) | Web UI + API routes for chat/SMS/voice webhooks + WebRTC voice |
| **Browser Voice** | WebRTC (RTCPeerConnection, DataChannel) | Direct browser → OpenAI Realtime connection |
| **Frontend Hosting** | Vercel | Serves web app + all API routes |
| **Voice Relay Server** | Fastify + @fastify/websocket + ws | Bridges Twilio Media Streams ↔ OpenAI Realtime API |
| **Voice Hosting** | Render.com (free tier) | WebSocket-capable hosting for voice relay |
| **AI (Chat/SMS)** | OpenAI GPT-5-mini | Text conversations with function calling |
| **AI (Vision)** | OpenAI GPT-4o | Photo appraisals via MMS |
| **AI (Voice)** | OpenAI Realtime API (gpt-4o-realtime-preview) | Real-time bidirectional voice |
| **Telephony** | Twilio (Programmable Voice + Messaging) | Phone number, SMS, MMS, voice, media streams |
| **Database** | AWS DynamoDB | Conversations, leads, inventory |
| **SMS Library** | twilio (Node SDK) | Outbound SMS from API routes |

---

## 3. Channel Overview

### Channel 1: Web Chat
- Persistent widget on every page (bottom-right corner)
- Uses OpenAI function calling for tool use (inventory search, scheduling, appraisals)
- Supports single photo upload for quick appraisals
- Conversations logged to DynamoDB
- Dynamic system prompt loaded from database (owner-configurable)

### Channel 2: SMS / MMS
- Twilio webhook receives inbound messages at `/api/twilio/message`
- **Text-only SMS** → GPT-4o-mini for conversational responses
- **MMS with photo** → GPT-4o Vision for item appraisal
- Responses sent back via TwiML `<Message>` (synchronous reply)
- All exchanges logged as leads + conversations in DynamoDB

### Channel 3: Phone Voice (Real-time AI via Twilio)
- Customer calls Twilio phone number
- Twilio hits voice webhook at `/api/twilio/voice`
- Webhook returns TwiML with `<Connect><Stream>` pointing to voice relay server
- Voice relay server (Render.com) bridges:
  - **Twilio Media Stream** (g711_ulaw audio) ↔ **OpenAI Realtime API** (bidirectional)
- AI speaks first with a greeting
- Supports barge-in (caller can interrupt AI mid-speech)
- Dynamic voice/prompt config fetched from frontend API (cached 5 min)

### Channel 4: Browser Voice Chat (WebRTC Direct)
- User clicks microphone button in chat widget (same UI as text chat)
- Browser requests ephemeral token from `/api/realtime-session`
- Direct WebRTC connection: **Browser ↔ OpenAI Realtime API** (no intermediary server)
- Uses `RTCPeerConnection` for audio, `RTCDataChannel` for events/tool calls
- **Server-side VAD** (voice activity detection) — OpenAI detects when user stops speaking
- **Whisper-1** transcription of user speech appears in real-time
- **Client-side tool execution** — function calls routed to Next.js APIs from browser
- **Image support** — Tool responses with images (e.g., inventory searches) display inline
- **Conversation persistence** — Seamlessly merge voice transcripts into text chat history
- **Animated orb UI** — Visual feedback for listening/thinking/speaking states
- **Model**: `gpt-4o-realtime-preview-2024-12-17`

---

## 4. Prerequisites & Accounts

### Required Accounts
1. **OpenAI** — API key with access to GPT-5-mini, GPT-4o, and Realtime API
2. **Twilio** — Account with a phone number that has Voice + SMS capabilities
3. **Vercel** — For Next.js hosting (free Hobby tier works)
4. **Render.com** — For voice relay WebSocket server (free tier works)
5. **AWS** — For DynamoDB (free tier, optional if using a different DB)
6. **GitHub** — Repository for auto-deploy from Vercel and Render

### Required Software (Local Development)
- Node.js >= 20
- npm
- Git
- Docker (optional, for ECR image builds)
- AWS CLI v2 (optional, for DynamoDB management)

---

## 5. Step-by-Step Build Guide

### 5.1 Project Structure

```
project-root/
├── frontend/                    # Next.js app (Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── chat/
│   │   │   │   │   └── route.ts           # Web chat endpoint
│   │   │   │   ├── realtime-session/
│   │   │   │   │   └── route.ts           # WebRTC ephemeral token (Channel 4)
│   │   │   │   ├── inventory/
│   │   │   │   │   └── search/
│   │   │   │   │       └── route.ts       # Inventory search tool (voice+chat)
│   │   │   │   └── twilio/
│   │   │   │       ├── message/
│   │   │   │       │   └── route.ts       # SMS/MMS webhook
│   │   │   │       └── voice/
│   │   │   │           └── route.ts       # Phone voice webhook (returns TwiML)
│   │   │   └── ... (pages)
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx             # Persistent chat widget (text + voice modes)
│   │   │   └── VoiceChatOverlay.tsx       # Voice mode UI (animated orb, transcripts)
│   │   ├── hooks/
│   │   │   └── useVoiceChat.ts            # WebRTC lifecycle + tool execution
│   │   └── lib/
│   │       ├── openai.ts                  # OpenAI client + helpers
│   │       ├── twilio.ts                  # Twilio SMS client + helpers
│   │       ├── dynamodb.ts                # DynamoDB client
│   │       └── constants.ts               # System prompts, tools, config
│   ├── package.json
│   └── .env.local                         # Environment variables
│
├── backend/
│   ├── realtime_voice/          # Phone voice relay server (Render.com)
│   │   ├── server.js                      # Fastify + WebSocket relay (Twilio↔OpenAI)
│   │   ├── package.json                   # ⚠️ MUST have "type": "module"
│   │   ├── Dockerfile                     # Optional (for container deploys)
│   │   └── .env                           # OPENAI_API_KEY, PORT, FRONTEND_URL
│   └── schemas/
│       └── functions.json                 # AI function tool definitions
│
└── docs/
    └── Voice_SMS_CHAT.md                  # This document
```

### 5.2 Web Chat (Channel 1)

#### 5.2.1 Create the Chat API Route

**File**: `frontend/src/app/api/chat/route.ts`

This is a standard Next.js API route that:
1. Receives user messages (array of `{role, content}`)
2. Prepends a system prompt (configurable from DB or hardcoded fallback)
3. Calls OpenAI Chat Completions with function tools enabled
4. If the model requests tool calls, executes them and makes a second LLM call
5. Returns the final text response
6. Logs the conversation to DynamoDB

**Key design decisions:**
- Use `tool_choice: "auto"` so the model decides when to use tools
- Two-pass pattern: first call may return tool_calls, second call incorporates tool results
- Stream text response for perceived speed (even though it's a single chunk)

#### 5.2.2 Define Function Tools

**File**: `frontend/src/lib/constants.ts` or `backend/schemas/functions.json`

Define tools the AI can call during chat:
```typescript
const FUNCTION_TOOLS = [
  {
    name: "appraise_item",
    description: "Analyze an uploaded item image to estimate pawn value.",
    parameters: { /* ... */ }
  },
  {
    name: "schedule_visit",
    description: "Book an in-store appointment and send SMS confirmation.",
    parameters: { /* customer_name, phone, preferred_time */ }
  },
  {
    name: "check_inventory",
    description: "Search inventory by category and keyword.",
    parameters: { /* category, keyword */ }
  },
  {
    name: "get_gold_spot_price",
    description: "Fetch current precious metals spot prices.",
    parameters: { /* metals[] */ }
  },
  {
    name: "log_lead",
    description: "Log a customer lead for follow-up.",
    parameters: { /* source, customer_info, item_interest */ }
  },
  {
    name: "check_store_status",
    description: "Check if the store is currently open.",
    parameters: {}
  },
  {
    name: "escalate_to_staff",
    description: "Flag high-value items for staff review.",
    parameters: { /* reason, estimated_value */ }
  }
];
```

#### 5.2.3 Create the Chat Widget Component

**File**: `frontend/src/components/ChatWidget.tsx`

- Floating button (bottom-right) that expands into a chat panel
- Maintains conversation state (messages array) in React state
- Sends POST to `/api/chat` with full message history
- Supports single image upload (base64 or URL)
- Renders markdown in AI responses
- Persists across page navigation (mount in root layout)

### 5.3 SMS/MMS (Channel 2)

#### 5.3.1 Create the Twilio SMS Webhook

**File**: `frontend/src/app/api/twilio/message/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const From = formData.get("From") as string;      // Caller phone
  const Body = (formData.get("Body") as string) || "";
  const NumMedia = parseInt(formData.get("NumMedia") as string || "0");

  let responseText = "";

  if (NumMedia > 0) {
    // MMS: Photo appraisal via GPT-4o Vision
    const MediaUrl0 = formData.get("MediaUrl0") as string;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: APPRAISAL_PROMPT },
        { role: "user", content: [
          { type: "text", text: Body || "Photo for appraisal" },
          { type: "image_url", image_url: { url: MediaUrl0 } }
        ]}
      ],
      max_tokens: 300,
    });
    responseText = completion.choices[0].message.content;
  } else {
    // SMS: Text chat via GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SMS_CHAT_PROMPT },
        { role: "user", content: Body }
      ],
      max_tokens: 200,
    });
    responseText = completion.choices[0].message.content;
  }

  // Reply via TwiML
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(responseText);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}
```

**Key points:**
- Twilio sends webhooks as `application/x-www-form-urlencoded` — use `req.formData()`
- `NumMedia > 0` indicates MMS with attached images
- `MediaUrl0` is the first image URL (Twilio-hosted, publicly accessible to OpenAI)
- Response MUST be TwiML XML with `<Message>` — Twilio parses this to send the reply
- Keep responses short (SMS has 160 char segments, MMS is more lenient but still mobile)

#### 5.3.2 Create the Twilio SMS Helper

**File**: `frontend/src/lib/twilio.ts`

```typescript
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    to: formatPhoneNumber(to),
    from: process.env.TWILIO_PHONE_NUMBER,
    body,
  });
}
```

This is for **outbound** SMS (e.g., appointment confirmations). Inbound SMS
is handled by the webhook above.

#### 5.3.3 Configure Twilio Phone Number

In Twilio Console:
1. Go to **Phone Numbers > Manage > Active Numbers**
2. Select your number
3. Under **Messaging**:
   - **When a message comes in**: Webhook
   - **URL**: `https://your-vercel-app.vercel.app/api/twilio/message`
   - **Method**: POST

### 5.4 Voice (Channel 3)

This is the most complex channel. It requires a **separate WebSocket relay server**
because Twilio Media Streams use WebSocket and OpenAI Realtime API uses WebSocket,
and you need a server that bridges them in real time.

#### 5.4.1 Voice Webhook (Vercel)

**File**: `frontend/src/app/api/twilio/voice/route.ts`

This is simple — it just returns TwiML that tells Twilio to start a Media Stream
to your voice relay server:

```typescript
export async function POST(req: NextRequest) {
  const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL;

  const wsUrl = VOICE_SERVER_URL
    .replace("https://", "wss://")
    .replace("http://", "ws://");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/media-stream" />
  </Connect>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" }
  });
}
```

**Key points:**
- `VOICE_SERVER_URL` is the HTTPS URL of your voice relay server (Render.com)
- Convert `https://` → `wss://` for WebSocket
- The `<Stream>` element tells Twilio to open a bidirectional WebSocket
- The path `/media-stream` matches the route on your relay server

#### 5.4.2 Voice Relay Server (Render.com)

**File**: `backend/realtime_voice/server.js`

This is a Fastify server with three routes:

1. `GET /` — Health check (returns `{ status: "ok" }`)
2. `ALL /incoming-call` — Backup TwiML endpoint (optional)
3. `GET /media-stream` (WebSocket) — The actual Twilio ↔ OpenAI bridge

**The WebSocket bridge logic:**

```
Twilio Media Stream (g711_ulaw audio)
    │
    │  WebSocket connection opened
    ▼
┌───────────────────────────────────────┐
│         Voice Relay Server            │
│                                       │
│  1. On Twilio connect:                │
│     → Open WebSocket to OpenAI        │
│       Realtime API                    │
│     → Send session.update with        │
│       voice config + system prompt    │
│     → Send initial greeting prompt    │
│                                       │
│  2. Twilio → OpenAI:                  │
│     → Forward audio chunks as         │
│       input_audio_buffer.append       │
│                                       │
│  3. OpenAI → Twilio:                  │
│     → Forward response.audio.delta    │
│       as Twilio media events          │
│                                       │
│  4. Barge-in support:                 │
│     → On speech_started, truncate     │
│       AI response + clear Twilio      │
│       audio buffer                    │
└───────────────────────────────────────┘
```

**Critical configuration for OpenAI Realtime session:**
```javascript
const sessionUpdate = {
  type: "session.update",
  session: {
    turn_detection: { type: "server_vad" },  // Server-side voice activity detection
    input_audio_format: "g711_ulaw",          // Twilio's audio format
    output_audio_format: "g711_ulaw",         // Must match Twilio's expected format
    voice: "alloy",                           // OpenAI voice (alloy, echo, shimmer, etc.)
    instructions: systemPrompt,               // Your AI personality/rules
    modalities: ["text", "audio"],            // Enable both
    temperature: 0.8,
  },
};
```

#### 5.4.3 Package.json for Voice Server

**CRITICAL** — Must include `"type": "module"` for ES module imports:

```json
{
  "name": "your-voice-server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "fastify": "^5.2.1",
    "@fastify/websocket": "^11.0.2",
    "ws": "^8.18.0",
    "dotenv": "^16.4.7"
  },
  "engines": {
    "node": ">=20"
  }
}
```

#### 5.4.4 Dynamic Voice Config (Optional, Recommended)

The voice server fetches its system prompt and voice settings from the frontend API:

```javascript
const res = await fetch(`${FRONTEND_URL}/api/agent-config/voice`);
const data = await res.json();
// { system_prompt, voice, temperature }
```

This allows the business owner to change the AI's voice personality from a dashboard
without redeploying the voice server. Config is cached for 5 minutes to avoid
hitting the API on every call.

#### 5.4.5 Configure Twilio Phone Number for Voice

In Twilio Console:
1. Go to **Phone Numbers > Manage > Active Numbers**
2. Select your number
3. Under **Voice & Fax**:
   - **When a call comes in**: Webhook
   - **URL**: `https://your-vercel-app.vercel.app/api/twilio/voice`
   - **Method**: POST

### 5.5 Browser Voice Chat (Channel 4)

This channel provides **direct browser-to-OpenAI voice chat** without requiring Twilio or a relay server. It uses the browser's native WebRTC APIs to establish a peer connection with OpenAI's Realtime API.

**Key Architectural Differences from Phone Voice (Channel 3):**

| Aspect | Phone Voice (Ch 3) | Browser Voice (Ch 4) |
|:-------|:------------------|:--------------------|
| **Infrastructure** | Browser → Twilio → Render relay → OpenAI | Browser → OpenAI (direct) |
| **WebRTC Connection** | Twilio Media Stream format | Native RTCPeerConnection |
| **Tool Execution** | Server-side (relay server) | Client-side (browser routes to APIs) |
| **UI Integration** | Separate phone call | Same chat widget, voice mode toggle |
| **Conversation Continuity** | Separate conversation log | Merges into text chat history |
| **Image Support** | Not applicable | Images from tools display in transcripts |
| **Cost** | Twilio per-minute charges | Only OpenAI API costs |
| **Hosting** | Requires Render.com relay server | Zero additional hosting |

#### 5.5.1 Architecture Overview

```
User clicks mic button in ChatWidget
    │
    ├─► Request ephemeral token from /api/realtime-session
    │
    ├─► Establish WebRTC connection (RTCPeerConnection)
    │   ├─► Audio track: getUserMedia(audio: true)
    │   └─► Data channel: "oai-events" for control messages
    │
    ├─► OpenAI Realtime API processes:
    │   ├─► Server-side VAD (voice activity detection)
    │   ├─► Whisper-1 transcription of user speech
    │   ├─► GPT-4o-realtime generates response
    │   └─► Function calls sent via data channel
    │
    ├─► Client-side tool execution:
    │   ├─► Browser intercepts function_call events
    │   ├─► Routes to Next.js APIs (e.g., /api/inventory/search)
    │   ├─► Extracts images from tool responses
    │   └─► Sends function_call_output back to OpenAI
    │
    └─► Real-time transcripts + images displayed in VoiceChatOverlay
```

#### 5.5.2 Ephemeral Token API Route

**File**: `frontend/src/app/api/realtime-session/route.ts`

This generates a session-specific ephemeral token that allows the browser to connect to OpenAI's Realtime API without exposing your API key.

```typescript
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voice = "alloy", temperature = 0.7 } = body;

    // Generate ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice,
        temperature,
        // System instructions
        instructions: `You are a helpful AI assistant for USA Pawn Holdings pawn shop. 
        You help customers with:
        - Item appraisals (use appraise_item function)
        - Inventory searches (use check_inventory function)
        - Scheduling visits (use schedule_visit function)
        - Gold/silver prices (use get_gold_spot_price function)
        - Store hours (use check_store_status function)
        
        Be conversational, friendly, and professional. Keep responses concise for voice interaction.`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Realtime Session] OpenAI error:", errorText);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: response.status }
      );
    }

    const session = await response.json();
    // Returns: { client_secret: { value: "eph_..." }, expires_at: ... }
    
    return NextResponse.json({
      clientSecret: session.client_secret.value,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error("[Realtime Session] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Key points:**
- Token is **ephemeral** — valid for ~60 seconds, single-use
- System instructions embedded in session config (not sent from browser)
- Voice and temperature configurable via request body
- Returns `clientSecret` which browser uses to authenticate WebRTC connection

#### 5.5.3 useVoiceChat Hook

**File**: `frontend/src/hooks/useVoiceChat.ts`

This React hook manages the complete WebRTC lifecycle:

**Core Responsibilities:**
1. **Ephemeral token acquisition** — Fetch from API route
2. **WebRTC connection** — Establish `RTCPeerConnection` with OpenAI
3. **Audio routing** — getUserMedia → audio track → peer connection
4. **Data channel management** — "oai-events" channel for control messages
5. **Transcript accumulation** — User + AI messages with role, timestamp, imageUrl
6. **Tool execution** — Client-side routing of function calls to Next.js APIs
7. **Image extraction** — Parse tool responses, attach images to transcripts
8. **Connection state** — Track idle/connecting/connected/error states

**Key Code Segments:**

```typescript
interface VoiceTranscript {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  imageUrl?: string; // For tool responses with images
}

export function useVoiceChat() {
  const [isActive, setIsActive] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const pendingImageRef = useRef<string | null>(null);

  const startVoiceChat = async () => {
    try {
      setConnectionState("connecting");

      // Step 1: Get ephemeral token
      const tokenResponse = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: "alloy", temperature: 0.7 }),
      });
      const { clientSecret } = await tokenResponse.json();

      // Step 2: Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Step 3: Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Step 4: Add audio track
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Step 5: Create data channel for control messages
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log("[Voice] Data channel opened");
        setConnectionState("connected");
      };

      dc.onmessage = (event) => {
        handleDataChannelMessage(JSON.parse(event.data));
      };

      // Step 6: Handle incoming audio
      pc.ontrack = (event) => {
        const audioElement = new Audio();
        audioElement.srcObject = event.streams[0];
        audioElement.play();
      };

      // Step 7: Create offer and connect
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setIsActive(true);
    } catch (error) {
      console.error("[Voice] Connection error:", error);
      setConnectionState("error");
      stopVoiceChat();
    }
  };

  const handleDataChannelMessage = (message: any) => {
    const { type } = message;

    // User speech transcription
    if (type === "conversation.item.input_audio_transcription.completed") {
      const userText = message.transcript?.trim();
      if (userText) {
        setTranscripts((prev) => [
          ...prev,
          {
            id: message.item_id,
            role: "user",
            text: userText,
            timestamp: Date.now(),
          },
        ]);
      }
    }

    // AI response transcription
    if (type === "response.audio_transcript.done") {
      const aiText = message.transcript?.trim();
      if (aiText) {
        const newTranscript: VoiceTranscript = {
          id: message.response_id,
          role: "assistant",
          text: aiText,
          timestamp: Date.now(),
        };

        // Attach pending image if available
        if (pendingImageRef.current) {
          console.log("[Voice] Attaching image to transcript:", pendingImageRef.current.substring(0, 50) + "...");
          newTranscript.imageUrl = pendingImageRef.current;
          pendingImageRef.current = null;
        }

        setTranscripts((prev) => [...prev, newTranscript]);
      }
    }

    // Function call from AI
    if (type === "response.function_call_arguments.done") {
      executeToolCall(message.call_id, message.name, message.arguments);
    }
  };

  const executeToolCall = async (callId: string, name: string, args: string) => {
    console.log(`[Voice Tool] Executing: ${name}`, args);

    try {
      let result: any;

      // Route to appropriate API
      if (name === "check_inventory") {
        const params = JSON.parse(args);
        const response = await fetch("/api/inventory/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        result = await response.json();

        // Extract image from root level (not nested in top_matches)
        if (result.display_image) {
          console.log("[Voice Tool] Image queued from check_inventory:", result.display_image.substring(0, 50) + "...");
          pendingImageRef.current = result.display_image;
        }
      } else if (name === "schedule_visit") {
        const params = JSON.parse(args);
        const response = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        result = await response.json();
      } else if (name === "get_gold_spot_price") {
        const response = await fetch("/api/gold-price");
        result = await response.json();
      } else if (name === "check_store_status") {
        const response = await fetch("/api/store-status");
        result = await response.json();
      } else {
        result = { error: "Unknown function" };
      }

      // Send function result back to OpenAI
      dataChannelRef.current?.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify(result),
          },
        })
      );

      // Trigger response generation
      dataChannelRef.current?.send(
        JSON.stringify({ type: "response.create" })
      );
    } catch (error) {
      console.error("[Voice Tool] Execution error:", error);
      dataChannelRef.current?.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ error: String(error) }),
          },
        })
      );
    }
  };

  const stopVoiceChat = () => {
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    dataChannelRef.current?.close();
    peerConnectionRef.current?.close();
    
    audioStreamRef.current = null;
    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    pendingImageRef.current = null;
    
    setIsActive(false);
    setConnectionState("idle");
  };

  return {
    isActive,
    connectionState,
    transcripts,
    startVoiceChat,
    stopVoiceChat,
  };
}
```

**Critical implementation details:**
- **pendingImageRef** stores image URLs from tool responses until next AI transcript arrives
- **Image extraction** looks at root-level `display_image` field (not nested in arrays)
- **Tool routing** is synchronous — browser waits for API response before sending to OpenAI
- **Data channel events** use OpenAI's documented message types (see Realtime API docs)

#### 5.5.4 VoiceChatOverlay Component

**File**: `frontend/src/components/VoiceChatOverlay.tsx`

This replaces the text chat UI when voice mode is active.

**Key Features:**
- **Animated orb** — Visual states: idle (pulsing), listening (expanding), thinking (shimmer)
- **Real-time transcripts** — Scrollable list of user + AI messages
- **Image display** — Shows images from tool responses inline with AI text
- **Connection status** — "Connecting..." / "Connected" / error states
- **End call button** — Stops voice session, returns to text mode

**Key Code Segments:**

```typescript
export function VoiceChatOverlay({
  connectionState,
  transcripts,
  onEndCall,
}: {
  connectionState: "idle" | "connecting" | "connected" | "error";
  transcripts: VoiceTranscript[];
  onEndCall: () => void;
}) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  return (
    <div className="fixed inset-0 z-50 bg-vault-black/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-vault-border-accent flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === "connected" ? "bg-vault-success animate-pulse" :
            connectionState === "connecting" ? "bg-vault-warning animate-pulse" :
            "bg-vault-danger"
          }`} />
          <span className="text-vault-text-light font-medium">
            {connectionState === "connected" ? "Voice Chat Active" :
             connectionState === "connecting" ? "Connecting..." : "Disconnected"}
          </span>
        </div>
        <button
          onClick={onEndCall}
          className="px-4 py-2 bg-vault-danger hover:bg-vault-danger/80 rounded-lg text-white font-medium transition-colors"
        >
          End Call
        </button>
      </div>

      {/* Animated Orb */}
      <div className="flex-shrink-0 flex items-center justify-center py-12">
        <div className={`relative w-32 h-32 rounded-full ${
          connectionState === "connected" 
            ? "bg-gradient-to-br from-vault-gold to-vault-gold-light animate-pulse"
            : "bg-vault-surface animate-pulse"
        }`}>
          <div className="absolute inset-2 rounded-full bg-vault-black/30 backdrop-blur-sm flex items-center justify-center">
            <div className="text-4xl">🎤</div>
          </div>
        </div>
      </div>

      {/* Transcripts */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {transcripts.map((t) => (
            <div
              key={t.id}
              className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                t.role === "user"
                  ? "bg-vault-gold text-white"
                  : "bg-vault-surface text-vault-text-light"
              }`}>
                {/* Image Display */}
                {t.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={t.imageUrl}
                      alt="Result"
                      className="max-w-full h-auto max-h-48 rounded-lg border-2 border-vault-border-accent shadow-lg"
                    />
                  </div>
                )}
                
                {/* Text */}
                <p className="whitespace-pre-wrap">{t.text}</p>
                
                {/* Timestamp */}
                <p className="text-xs opacity-60 mt-1">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}
```

**Styling notes:**
- Uses USA Pawn brand colors (`vault-gold`, `vault-black`, etc.)
- Images have max-height to prevent oversized display
- Auto-scrolls to latest message on update
- Full-screen overlay (z-50) covers entire chat widget

#### 5.5.5 ChatWidget Integration

**File**: `frontend/src/components/ChatWidget.tsx`

**Modifications Required:**

1. **Import voice components:**
```typescript
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { VoiceChatOverlay } from "./VoiceChatOverlay";
```

2. **Add voice state:**
```typescript
const [isVoiceMode, setIsVoiceMode] = useState(false);
const { isActive, connectionState, transcripts, startVoiceChat, stopVoiceChat } = useVoiceChat();
```

3. **Add microphone button in chat header:**
```typescript
<button
  onClick={toggleVoiceMode}
  className={`p-2 rounded-lg transition-colors ${
    isVoiceMode
      ? "bg-vault-gold text-white"
      : "bg-vault-surface hover:bg-vault-surface-elevated text-vault-text-light"
  }`}
  title={isVoiceMode ? "Switch to Text" : "Switch to Voice"}
>
  {isVoiceMode ? "💬" : "🎤"}
</button>
```

4. **Toggle function with conversation merging:**
```typescript
const toggleVoiceMode = async () => {
  if (isVoiceMode) {
    // Stop voice, merge transcripts into text messages
    stopVoiceChat();
    
    // Convert voice transcripts to text messages
    const voiceMessages = transcripts.map((t) => ({
      id: t.id,
      role: t.role,
      content: t.text,
      imageUrl: t.imageUrl, // Preserve images
    }));
    
    setMessages((prev) => [...prev, ...voiceMessages]);
    setIsVoiceMode(false);
  } else {
    // Start voice mode
    setIsVoiceMode(true);
    await startVoiceChat();
  }
};
```

5. **Conditional rendering:**
```typescript
return (
  <div className="fixed bottom-4 right-4 z-40">
    {isExpanded && (
      <div className="bg-vault-black border border-vault-border-accent rounded-lg shadow-2xl w-96 h-[600px] flex flex-col">
        {/* Render voice overlay OR text chat */}
        {isVoiceMode ? (
          <VoiceChatOverlay
            connectionState={connectionState}
            transcripts={transcripts}
            onEndCall={toggleVoiceMode}
          />
        ) : (
          <>
            {/* Normal text chat UI */}
            <div className="p-4 border-b">...</div>
            <div className="flex-1 overflow-y-auto">...</div>
            <div className="p-4 border-t">...</div>
          </>
        )}
      </div>
    )}
    
    {/* Toggle button */}
    <button onClick={() => setIsExpanded(!isExpanded)}>...</button>
  </div>
);
```

#### 5.5.6 Tool API Route (Inventory Search Example)

**File**: `frontend/src/app/api/inventory/search/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scanItems } from "@/lib/dynamodb";

export async function POST(req: NextRequest) {
  try {
    const { category, keyword } = await req.json();
    
    // Search DynamoDB inventory
    const items = await scanItems("USA_Pawn_Inventory", {
      category,
      keyword,
      limit: 5,
    });

    // Return top match with image at root level
    const topMatch = items[0] || null;
    const displayImage = topMatch?.image_url || null;

    return NextResponse.json({
      success: true,
      count: items.length,
      top_matches: items,
      display_image: displayImage, // ⚠️ Root level, not nested
      display_summary: topMatch
        ? `Found ${items.length} ${category} items. Top result: ${topMatch.title} - $${topMatch.price}`
        : `No ${category} items found matching "${keyword}".`,
    });
  } catch (error) {
    console.error("[Inventory Search] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

**Critical API response format:**
- **display_image** must be at root level (not inside `top_matches` array)
- Return base64 data URI: `data:image/jpeg;base64,...`
- Include `display_summary` for voice-friendly text response
- OpenAI receives JSON string, client extracts `display_image` field

#### 5.5.7 Key Differences from Phone Voice (Channel 3)

| Feature | Phone Voice | Browser Voice |
|:--------|:-----------|:--------------|
| **Tool execution location** | Relay server (Render.com) | Client-side (browser) |
| **Image handling** | Not supported | Full support with inline display |
| **Transcript persistence** | Separate call log | Merges into text chat history |
| **Infrastructure** | Requires Render.com + Twilio | Zero additional services |
| **Cost per conversation** | Twilio + OpenAI | OpenAI only |
| **Browser requirements** | Any phone | Modern browser with WebRTC |
| **Authentication** | Twilio call SID | Ephemeral token per session |
| **Conversation context** | No carryover | Seamless mode switching |

#### 5.5.8 Testing Voice Chat

**Local Testing:**

1. Start dev server: `cd frontend && npm run dev`
2. Open chat widget in browser
3. Click microphone button (🎤)
4. Grant microphone permissions when prompted
5. Wait for "Voice Chat Active" status
6. Speak: "Do you have any gold jewelry?"
7. Verify:
   - User speech appears as transcript
   - AI responds with audio + text
   - Image appears above AI response
   - Console shows: `[Voice Tool] Image queued...` and `[Voice] Attaching image...`
8. Click "End Call" — transcripts should merge into text chat

**Debugging:**

- **No connection**: Check browser console for ephemeral token errors
- **No audio**: Verify getUserMedia permissions, check volume
- **No transcripts**: Enable `input_audio_transcription` in session config
- **No images**: Check API response structure (display_image at root, not nested)
- **Tool calls fail**: Check browser network tab for API route errors

**Production Deployment:**

- WebRTC requires **HTTPS** — Vercel provides this automatically
- No additional hosting beyond Next.js frontend
- Ephemeral tokens expire in ~60 seconds — safe for client-side use
- Rate limiting recommended on `/api/realtime-session` endpoint

#### 5.5.9 Browser Voice Quick Reference

**Complete file inventory:**

| File | Purpose | Lines | Key Responsibilities |
|:-----|:--------|:------|:--------------------|
| `app/api/realtime-session/route.ts` | Token generation | ~50 | Ephemeral tokens, system instructions |
| `hooks/useVoiceChat.ts` | WebRTC lifecycle | ~300 | Connection, transcripts, tool routing, image queueing |
| `components/VoiceChatOverlay.tsx` | Voice UI | ~120 | Animated orb, transcript display, image rendering |
| `components/ChatWidget.tsx` | Mode toggle | +50 | Voice/text switch, transcript merging |
| `app/api/inventory/search/route.ts` | Tool endpoint | ~80 | DynamoDB search, returns `display_image` at root |

**Key data flow:**

```
User clicks mic → /api/realtime-session → ephemeral token
                 ↓
Browser establishes WebRTC (RTCPeerConnection + DataChannel)
                 ↓
User speaks → Whisper-1 transcription → VoiceTranscript (user)
                 ↓
AI processes → function_call event → executeToolCall()
                 ↓
fetch(/api/inventory/search) → { display_image: "...", ... }
                 ↓
pendingImageRef.current = display_image
                 ↓
AI speaks → response.audio_transcript.done → VoiceTranscript (assistant + imageUrl)
                 ↓
VoiceChatOverlay renders: <img src={t.imageUrl} /> + <p>{t.text}</p>
                 ↓
User clicks "End Call" → transcripts.map() → merge into text messages
```

**Critical implementation details:**
- **Image path**: Always `result.display_image` at root (not nested in arrays)
- **Pending image**: Store in ref between tool response and AI transcript
- **Transcript types**: `VoiceTranscript` (voice mode) vs `Message` (text mode)
- **Mode switching**: Convert voice → text preserves `imageUrl` field
- **WebRTC requirements**: HTTPS, modern browser, microphone permissions

**Common mistakes to avoid:**
- ❌ Looking for images in `result.top_matches[0].display_image` (wrong path)
- ❌ Forgetting to render images in `VoiceChatOverlay` component
- ❌ Not merging transcripts on mode switch (conversation continuity breaks)
- ❌ Attaching image to wrong transcript (use pendingImageRef)
- ❌ Testing without HTTPS (WebRTC requires secure context)

---

## 6. Hosting & Deployment

### Frontend: Vercel

Standard Next.js deployment:
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Add all environment variables (see Section 8)
4. Deploy

### Voice Relay: Render.com

This is the critical piece. The voice relay server **requires WebSocket support**.

#### Why Render.com (Not AWS App Runner)

| Requirement | AWS App Runner | Render.com |
|:------------|:---------------|:-----------|
| HTTP | ✅ Works | ✅ Works |
| WebSocket | ❌ **403 Forbidden** (Envoy proxy blocks `Upgrade` headers) | ✅ Native support |
| Cost | ~$5-15/month | **$0** (free tier) |
| Deploy from GitHub | ✅ | ✅ |

**⚠️ AWS App Runner DOES NOT support WebSocket** despite documentation claims. This was
verified exhaustively — see Section 7 for full details.

#### Render.com Deployment Steps

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New +** > **Web Service**
3. Connect your repository
4. Configure:

| Setting | Value |
|:--------|:------|
| **Name** | `your-voice-server` |
| **Root Directory** | `backend/realtime_voice` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |
| **Region** | US East (Virginia) |

5. Add environment variables:
   - `OPENAI_API_KEY` = your key
   - `PORT` = `5050`
   - `FRONTEND_URL` = `https://your-vercel-app.vercel.app`
   - `VOICE` = `alloy` (optional)

6. Click **Deploy**

**⚠️ Common mistakes:**
- Do NOT use `yarn` commands unless your project has a `yarn.lock` file
- Build command is `npm install`, NOT `npm run build` (there is no build step)
- Start command is `node server.js`, NOT `npm start` (though both work if package.json is correct)

#### Free Tier Caveat

Render free instances spin down after 15 minutes of inactivity. First call after idle
will have ~50 second cold start. For production use, upgrade to Starter ($7/month)
for zero downtime.

**Workaround for free tier**: Set up a cron/uptime monitor to ping the health endpoint
every 14 minutes to prevent spin-down.

#### Wake-Up / Health Check Endpoint

The voice server exposes two health endpoints that can be used to wake the Render
instance before a demo and verify end-to-end connectivity:

| Endpoint | Purpose |
|:---|:---|
| `GET /` | Basic liveness probe. Returns `{ "status": "ok" }`. |
| `GET /health/store-status` | **Full warm-up probe**. Calls the Vercel store-status API, returns latency + live store hours. |

**How to trigger a wake-up before a demo:**

```bash
# Simple ping — wakes the Render instance (~30-50s on free tier cold start)
curl https://usapawn-voice.onrender.com/

# Full warm-up — also pre-warms the Vercel ↔ Render connection and validates store status
curl https://usapawn-voice.onrender.com/health/store-status
```

**Expected response from `/health/store-status`:**
```json
{
  "status": "ok",
  "service": "usapawn-voice",
  "frontend_url": "https://usapawn.vercel.app",
  "latency_ms": 245,
  "store_status": {
    "open": true,
    "timezone": "America/New_York",
    "weekday": "monday",
    "now_label": "Monday, 2:30 PM ET",
    "today_schedule": "9:00 AM - 6:00 PM",
    "message": "We are open now until 6:00 PM ET.",
    "generated_at": "2026-02-16T19:30:00.000Z"
  }
}
```

**Automated keep-alive** (prevents spin-down entirely):
- Use [UptimeRobot](https://uptimerobot.com/) (free) or [cron-job.org](https://cron-job.org/)
- Monitor URL: `https://usapawn-voice.onrender.com/health/store-status`
- Interval: **Every 14 minutes** (Render spins down after 15 min inactivity)
- Alert on: `status` field not equal to `"ok"`

**Pre-demo checklist:**
1. Hit the `/health/store-status` endpoint ~60 seconds before the demo call
2. Verify `store_status.open` matches expected (check if within business hours)
3. If `status` is `"error"`, check that `FRONTEND_URL` env var on Render points to the correct Vercel deployment
4. Make the demo phone call — the instance is now warm and will answer in <2 seconds

---

## 7. Issues Encountered & Solutions

### Issue 1: Missing `"type": "module"` in package.json

**Symptom**: Voice server container starts but immediately crashes with:
```
SyntaxError: Cannot use import statement in a module
```

**Root Cause**: `server.js` uses ES module syntax (`import Fastify from "fastify"`,
top-level `await`) but `package.json` didn't declare `"type": "module"`.

**Solution**: Add `"type": "module"` to `package.json`.

**Why this was hard to catch**: On platforms doing source-based builds (App Runner),
the build succeeds (npm install is fine) but the runtime crashes. Health checks using
TCP (port open) may still pass briefly before the process exits. The platform reports
"healthy" while the app is actually dead.

---

### Issue 2: AWS App Runner Blocks WebSocket Upgrades (403 from Envoy)

**Symptom**: All WebSocket connection attempts to App Runner return:
```
HTTP 403 Forbidden
server: envoy
content-length: 0
(no x-envoy-upstream-service-time header)
```

**Root Cause**: App Runner's managed Envoy reverse proxy rejects any HTTP request
carrying `Connection: Upgrade` and `Upgrade: websocket` headers. This is a platform
limitation, not a misconfiguration.

**Diagnostic methodology** (reproduce this for future debugging):

```javascript
// Test 1: Plain HTTP — reaches your app
// GET / → 200, has x-envoy-upstream-service-time
Invoke-WebRequest -Uri "https://your-service.awsapprunner.com/"

// Test 2: WebSocket upgrade — blocked by Envoy
// wss://your-service.awsapprunner.com/ → 403, server: envoy, NO upstream-time
const ws = new WebSocket('wss://your-service.awsapprunner.com/media-stream');

// Test 3: Manual HTTP with Upgrade header — blocked
// Proves it's the Upgrade header specifically, not the path
const options = {
  headers: {
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    'Sec-WebSocket-Version': '13',
    'Sec-WebSocket-Key': randomKey,
  }
};
```

**Key diagnostic indicator**: When Envoy blocks at the proxy level, the response
has `server: envoy` but NO `x-envoy-upstream-service-time` header. When the request
reaches your app, both headers are present.

**What was tried and failed**:
1. ❌ Source-based App Runner deployment — same 403
2. ❌ Image-based App Runner deployment (ECR) — same 403
3. ❌ Different WebSocket paths (/media-stream, /ws-test, /) — all 403
4. ❌ Various Origin/User-Agent headers — no effect
5. ❌ Twilio-specific headers — no effect

**Solution**: Use Render.com, Railway, or Fly.io instead — all support WebSocket natively.

**Cost comparison**:

| Platform | WebSocket Support | Monthly Cost |
|:---------|:------------------|:-------------|
| Render.com (free) | ✅ | $0 |
| Render.com (starter) | ✅ | $7 |
| Railway | ✅ | $5+ (usage-based) |
| Fly.io | ✅ | $0-5 |
| AWS App Runner | ❌ BLOCKED | $5-15 |
| AWS ECS Fargate + ALB | ✅ | $25-35 (ALB minimum $16) |

---

### Issue 3: AWS IAM Permission Denials

**Symptom**: CLI commands for ECR, App Runner, IAM all return `AccessDeniedException`.

**Root Cause**: The AWS CLI was configured with a narrow-scoped IAM user (`keyvex-app-user`)
that only had DynamoDB permissions.

**Solution**: Created a new IAM user (`cclem-dev-26`) with `AdministratorAccess` +
`PowerUserAccess` managed policies, then ran:

```powershell
aws configure set aws_access_key_id YOUR_NEW_KEY
aws configure set aws_secret_access_key YOUR_NEW_SECRET
aws configure set region us-east-1
aws configure set output json
```

**Lesson**: When setting up a dev machine, always verify `aws sts get-caller-identity`
shows the right user, and that user has sufficient permissions for the services you'll use.

**Recommended IAM setup for developer workstations**:
- One IAM user per developer
- `PowerUserAccess` managed policy (full access to everything except IAM user management)
- If you also need to create IAM roles (e.g., for App Runner ECR access), add `AdministratorAccess`
- Credentials stored in `~/.aws/credentials` via `aws configure`

---

### Issue 4: PowerShell JSON Escaping with AWS CLI

**Symptom**: `aws iam create-role --assume-role-policy-document '{...}'` silently
fails or produces malformed JSON in PowerShell.

**Root Cause**: PowerShell handles JSON string escaping differently than bash. Inline
JSON with curly braces gets mangled.

**Solution**: Write JSON to a temp file and use `file://` prefix:

```powershell
Set-Content -Path "$env:TEMP\policy.json" -Value '{"Version":"2012-10-17",...}'
aws iam create-role --assume-role-policy-document file://C:\Users\you\AppData\Local\Temp\policy.json
```

---

### Issue 5: Docker "Cannot connect" Error on Windows

**Symptom**: `docker build` fails with:
```
error during connect: Head "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/_ping": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Root Cause**: Docker Desktop is not running.

**Solution**: Start Docker Desktop before running Docker commands. On Windows, the
Docker daemon runs as a service under Docker Desktop — it's not a background daemon
like Linux.

---

### Issue 6: Render.com Default Build Commands

**Symptom**: Render auto-detects Yarn and uses `yarn` / `yarn start` as default
build and start commands.

**Root Cause**: Render tries to be smart about detecting the package manager, but
if there's no `yarn.lock`, Yarn may produce different dependency trees or fail.

**Solution**: Always explicitly set:
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

---

### Issue 7: Browser Voice Chat — Images Not Displaying

**Symptom**: Tool responses (e.g., `check_inventory`) successfully return images in API responses, but images don't appear in voice chat transcripts. Console shows no errors.

**Root Cause**: Two-part issue:
1. **Missing UI rendering** — `VoiceChatOverlay` component didn't include image display markup in transcript bubbles
2. **Incorrect image path extraction** — `useVoiceChat` hook was accessing `result.top_matches?.[0]?.display_image` (nested in array) instead of `result.display_image` (root-level field)

**Diagnostic methodology:**
```typescript
// Step 1: Check VoiceChatOverlay rendering
// Found: Only text was rendered, no {t.imageUrl && ...} block

// Step 2: Check API response structure
const response = await fetch("/api/inventory/search", {...});
const result = await response.json();
console.log(result);
// Returns: { success: true, display_image: "data:image/jpeg...", top_matches: [...] }

// Step 3: Check useVoiceChat extraction
if (result.top_matches?.[0]?.display_image) { ... } // ❌ Always undefined
if (result.display_image) { ... } // ✅ Correct
```

**Solution:**
1. Add image rendering to `VoiceChatOverlay.tsx`:
```typescript
{t.imageUrl && (
  <div className="mb-2">
    <img
      src={t.imageUrl}
      alt="Result"
      className="max-w-full h-auto max-h-48 rounded-lg border-2 border-vault-border-accent"
    />
  </div>
)}
```

2. Fix image extraction in `useVoiceChat.ts`:
```typescript
// Before (wrong):
if (inventoryResult.top_matches?.[0]?.display_image) {
  pendingImageRef.current = inventoryResult.top_matches[0].display_image;
}

// After (correct):
if (inventoryResult.display_image) {
  pendingImageRef.current = inventoryResult.display_image;
}
```

3. Add debug logging to track image flow:
```typescript
console.log("[Voice Tool] Image queued:", result.display_image.substring(0, 50) + "...");
console.log("[Voice] Attaching image to transcript:", pendingImageRef.current);
```

**Lesson**: API response structure must match client-side extraction paths exactly. When debugging data flow through async pipelines (tool call → API → image storage → transcript attachment), add logging at each stage to identify where data is lost.

---

### Issue 8: Browser Voice Chat — Transcripts Not Persisting Across Mode Switches

**Symptom**: Voice transcripts appear during voice mode, but disappear when switching back to text chat. Conversation history is lost.

**Root Cause**: `toggleVoiceMode()` function in `ChatWidget.tsx` wasn't merging voice transcripts into the text message history. The voice transcripts lived in separate state (`useVoiceChat().transcripts`) that wasn't being transferred.

**Solution**: Implement transcript merging when exiting voice mode:
```typescript
const toggleVoiceMode = async () => {
  if (isVoiceMode) {
    // Exit voice mode — merge transcripts
    stopVoiceChat();
    
    const voiceMessages = transcripts.map((t) => ({
      id: t.id,
      role: t.role,
      content: t.text,
      imageUrl: t.imageUrl, // ⚠️ Preserve images
    }));
    
    setMessages((prev) => [...prev, ...voiceMessages]);
    setIsVoiceMode(false);
  } else {
    // Enter voice mode
    setIsVoiceMode(true);
    await startVoiceChat();
  }
};
```

**Key details:**
- Map `VoiceTranscript[]` → `Message[]` (different types, same structure)
- Preserve `imageUrl` field so images persist in text mode
- Append to existing messages (don't replace — maintains conversation continuity)
- Clear voice transcripts only after successful merge (not before)

**Why this matters**: Seamless mode switching creates a unified conversation experience. Users can start in text, switch to voice for quick Q&A, then return to text without losing context.

---

## 8. Environment Variables Reference

### Frontend (Vercel) — `.env.local`

```bash
# OpenAI (used for text chat, SMS/MMS, AND browser voice WebRTC)
OPENAI_API_KEY=sk-proj-...

# AWS DynamoDB
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Phone voice relay server URL (Render.com) — NOT needed for browser voice
VOICE_SERVER_URL=https://your-voice-server.onrender.com

# Auth
DEMO_AUTH_PASSWORD=12345

# App URL
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

**Note**: Browser voice chat (Channel 4) uses the **same OPENAI_API_KEY** as text chat. No additional environment variables required. The `/api/realtime-session` route generates ephemeral tokens from this key.

### Voice Server (Render.com) — Environment Variables

```bash
OPENAI_API_KEY=sk-proj-...
PORT=5050
VOICE=alloy
FRONTEND_URL=https://your-app.vercel.app
```

### AWS CLI — `~/.aws/credentials`

```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

### AWS CLI — `~/.aws/config`

```ini
[default]
region = us-east-1
output = json
```

---

## 9. Twilio Configuration Checklist

### Phone Number Setup

Go to **Twilio Console > Phone Numbers > Manage > Active Numbers > [Your Number]**

| Section | Setting | Value |
|:--------|:--------|:------|
| **Voice** | "A call comes in" | Webhook |
| | URL | `https://your-app.vercel.app/api/twilio/voice` |
| | Method | POST |
| **Messaging** | "A message comes in" | Webhook |
| | URL | `https://your-app.vercel.app/api/twilio/message` |
| | Method | POST |

### Phone Number Requirements

- Must have **Voice** capability (for calls)
- Must have **SMS** capability (for text)
- Must have **MMS** capability (for photo appraisals) — most US numbers support this
- Recommend a **local** number in the business's area code for caller trust

### Webhook Security (Optional but Recommended)

Twilio signs every webhook request. Validate signatures in production:

```typescript
import twilio from "twilio";

const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  req.headers.get("x-twilio-signature"),
  webhookUrl,
  formData
);
```

---

## 10. Testing Procedures

### Test Web Chat
1. Open your deployed site
2. Click the chat widget
3. Type a message — should get AI response
4. Try asking about inventory, store hours, scheduling
5. Upload a photo for appraisal
6. Check DynamoDB `Conversations` table for logged data

### Test Browser Voice Chat (WebRTC)
1. Open the chat widget
2. Click the microphone button (🎤)
3. Grant microphone permissions when prompted
4. Wait for "Voice Chat Active" status (green dot)
5. Say: "Do you have any gold jewelry?" or "Show me a 9mm handgun"
6. Verify:
   - Your speech appears as user transcript
   - AI responds with both audio and text
   - If inventory found, image appears above AI's text response
   - Console shows: `[Voice Tool] Image queued...` and `[Voice] Attaching image...`
7. Click "End Call" button
8. Verify voice transcripts (including images) merge into text chat history

**Common issues:**
- **No connection**: Check browser console for ephemeral token errors, verify OPENAI_API_KEY in Vercel
- **No audio output**: Check browser volume, verify speakers/headphones
- **No microphone input**: Check permissions in browser (chrome://settings/content/microphone)
- **No transcripts**: Check that `input_audio_transcription` is enabled in session config
- **Images missing**: Verify API route returns `display_image` at root level (not nested)
- **"Connecting..." forever**: Check network tab for 401/403 on OpenAI Realtime endpoint

### Test SMS
```bash
# Send a test text to your Twilio number from your phone
# Check Twilio Console > Monitor > Messaging for delivery status
# Check DynamoDB for logged conversation
```

### Test MMS (Photo Appraisal)
1. Text a photo to your Twilio number
2. Should receive an AI appraisal response within 5-10 seconds
3. Check DynamoDB for logged lead + conversation

### Test Phone Voice — WebSocket Handshake
```javascript
// Run from a machine with the ws package installed
const WebSocket = require('ws');
const ws = new WebSocket('wss://your-voice-server.onrender.com/media-stream');
ws.on('open', () => { console.log('OPEN - WebSocket works!'); ws.close(); });
ws.on('unexpected-response', (req, res) => { console.log('FAIL:', res.statusCode); });
ws.on('error', (e) => console.log('ERROR:', e.message));
setTimeout(() => process.exit(0), 10000);
```

Expected output: `OPEN - WebSocket works!`

If you get `UNEXPECTED 403` — the hosting platform doesn't support WebSocket.

### Test Phone Voice — Live Call
1. Call your Twilio number from any phone
2. Should hear AI greeting within 2-3 seconds
3. Have a conversation — test barge-in (interrupt the AI)
4. Hang up and check Render.com logs for connection/disconnection events

### Test Phone Voice — Health Check
```bash
curl https://your-voice-server.onrender.com/
# Expected: {"status":"ok","service":"your-voice-server"}
```

---

## 11. Cost Breakdown

### Monthly Costs (Typical Small Business)

| Service | Tier | Cost | Notes |
|:--------|:-----|:-----|:------|
| Vercel | Hobby | $0 | 100GB bandwidth, serverless functions |
| Render.com (phone voice) | Free | $0 | 750 hrs/month, 50s cold start (NOT needed for browser voice) |
| Render.com (phone voice) | Starter | $7 | No cold start, always on (NOT needed for browser voice) |
| OpenAI (Text Chat) | Pay-per-use | ~$5-15 | GPT-5-mini, ~1000 conversations |
| OpenAI (Vision/MMS) | Pay-per-use | ~$2-5 | GPT-4o, ~100 photo appraisals |
| OpenAI (Browser Voice) | Pay-per-use | ~$8-20 | Realtime API, ~100 sessions, $0.06/min input + $0.24/min output |
| OpenAI (Phone Voice) | Pay-per-use | ~$10-30 | Realtime API + Twilio relay, ~100 calls |
| Twilio Phone | Monthly | $1.15 | One US local number |
| Twilio SMS | Per-message | ~$3-10 | $0.0079/msg, ~500 messages |
| Twilio Voice | Per-minute | ~$5-15 | $0.014/min inbound, ~500 minutes |
| AWS DynamoDB | Free tier | $0 | 25 WCU/RCU, 25GB storage |
| **TOTAL (all 4 channels)** | | **~$34-103/mo** | Scales with usage |
| **TOTAL (no phone voice)** | | **~$15-50/mo** | Browser voice only, no Twilio calls |

**Cost comparison — Voice options:**
- **Browser Voice (WebRTC)**: $0 infrastructure + OpenAI Realtime API only
- **Phone Voice (Twilio)**: $7/mo Render + $1.15/mo number + $0.014/min + OpenAI Realtime API
- **Savings**: Browser voice eliminates ~$20-35/mo in telephony costs

### What NOT to Use

| Service | Why Not | Cost If You Did |
|:--------|:--------|:----------------|
| AWS App Runner | WebSocket blocked by Envoy proxy | $5-15/mo wasted |
| AWS ECS Fargate + ALB | ALB has $16/mo minimum just for the load balancer | $25-35/mo |
| AWS API Gateway (WebSocket) | Doesn't fit Twilio Media Stream protocol | $3-10/mo |

---

## 12. Reuse Template

### To build a new Voice/SMS/Chat system for a different client:

**Choose your channels:**
- ✅ **Text Chat** (always recommended — lowest cost, highest engagement)
- ✅ **SMS/MMS** (recommended if you want mobile reach)
- ⚠️ **Phone Voice** (Twilio + Render relay) — adds $20-35/mo infrastructure
- ✅ **Browser Voice** (WebRTC direct) — zero infrastructure cost, modern UX

**Recommendation**: Start with **Text Chat + Browser Voice** only. Add SMS/Phone later if customer demand justifies the cost.

#### Step 1: Clone the Structure
Copy the project structure from Section 5.1. The architecture is client-agnostic.

#### Step 2: Customize System Prompts
Update these files with the new business identity:
- `frontend/src/lib/constants.ts` → `VAULT_SYSTEM_PROMPT` (web chat)
- `frontend/src/app/api/realtime-session/route.ts` → `instructions` field (browser voice)
- `frontend/src/app/api/twilio/message/route.ts` → `SMS_CHAT_PROMPT` + `SMS_APPRAISAL_PROMPT` (if using SMS)
- `backend/realtime_voice/server.js` → `FALLBACK_SYSTEM_MESSAGE` (if using phone voice)

Replace all instances of:
- Business name, address, phone, hours
- Pawn terms / pricing / policies (or whatever the business does)
- AI personality name (e.g., "Vault" → something else)

#### Step 3: Set Up Accounts
**Required for all:**
1. **OpenAI**: Use your existing API key (or create a project-specific one)
2. **Vercel**: Connect the new repo
3. **AWS DynamoDB** (or different DB): For conversation/lead tracking

**Optional (only if using SMS/Phone):**
4. **Twilio**: Buy a phone number in the client's area code
5. **Render.com**: Create web service pointing to `backend/realtime_voice` (only if using phone voice)

#### Step 4: Configure Twilio Webhooks (if using SMS/Phone)
- Voice: `POST https://new-app.vercel.app/api/twilio/voice`
- Messaging: `POST https://new-app.vercel.app/api/twilio/message`

#### Step 5: Set Environment Variables
**Vercel (required):**
```bash
OPENAI_API_KEY=sk-proj-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
NEXT_PUBLIC_SITE_URL=https://new-app.vercel.app
```

**Vercel (optional — if using SMS/Phone):**
```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
VOICE_SERVER_URL=https://new-voice-server.onrender.com
```

**Render.com (only if using phone voice):**
```bash
OPENAI_API_KEY=sk-proj-...
PORT=5050
VOICE=alloy
FRONTEND_URL=https://new-app.vercel.app
```

#### Step 6: Deploy & Test
1. Push to GitHub → Vercel auto-deploys
2. Test text chat: Type in widget
3. Test browser voice: Click mic button in widget
4. (If using SMS) Send a test SMS
5. (If using phone voice) Render.com auto-deploys → WebSocket handshake test → place test call

#### Step 7: Customize Function Tools (Optional)
Modify `functions.json` / `constants.ts` to add business-specific tools:
- Different inventory categories
- Business-specific scheduling logic
- Custom lead scoring
- Industry-specific appraisal prompts

---

## 13. MANDATORY: Decomposed Prompt Architecture & Agent Control Dashboard

> **⚠️ NON-NEGOTIABLE REQUIREMENT**: Every system built with this skill **MUST** decompose
> AI system prompts into independently configurable fragments stored in a database, exposed
> through an owner-facing dashboard, and dynamically assembled at runtime. The business owner
> must be able to tune all AI behavior **without code changes or redeployments**.

### 13.1 The Core Problem

A monolithic system prompt is a liability:
- **Untunable** — changing one sentence requires a developer and a redeploy
- **Opaque** — the owner can't see or understand what the AI is told to do
- **Rigid** — seasonal changes, promotions, rule additions all require code edits
- **Fragile** — one bad edit to a 2000-char prompt can break the entire agent

The solution is **prompt decomposition**: break every system prompt into named, typed fragments
that are stored in a key-value database, edited through a UI, and assembled at request time.

### 13.2 Prompt Fragment Taxonomy

Every AI agent's final prompt is assembled from these fragment categories. Not every project
needs all of them, but the **pattern** must be followed for each agent in the system.

| Fragment Type | Behavior | Dashboard Control | Example |
|:---|:---|:---|:---|
| **Base Prompt** | Hardcoded default with full override | Read-only viewer + expert override textarea | The core identity, rules, and capabilities |
| **Tone Directive** | Enum selector → injected as instruction | Card grid (casual / professional / friendly / firm) | `"Speak in a {tone} manner."` |
| **Response Length** | Enum → sets verbosity instruction | Card grid (short / medium / detailed) | `"Keep responses to 1-2 sentences."` |
| **Custom Greeting** | String → replaces default opening | Text input | First message the AI sends |
| **Additional Rules** | String → **appended** to base rules | Monospace textarea | Business-specific constraints |
| **Contextual Info** | String → **appended** as context | Monospace textarea | Promotions, hours changes, seasonal notes |
| **Escalation Threshold** | Number → injected as rule | Number input | Dollar/severity amount that triggers handoff |
| **Channel Addendum** | String → layered for channel-specific behavior | Textarea | Phone-specific, SMS-specific instructions |
| **Channel-Specific Rules** | String → appended after addendum | Monospace textarea | Rules that only apply to one channel |
| **Model Parameters** | Float/enum → passed to API call, not prompt | Slider / selector | Temperature, voice selection, max tokens |
| **Full Override** | String → **replaces entire assembled prompt** | ⚠️ Expert textarea with warning | Emergency escape hatch |

### 13.3 Assembly Rules (Critical)

The fragments are not just concatenated. They follow strict assembly rules:

#### Rule 1: Append, Don't Replace (by default)
Custom rules and contextual info are **appended** to the base prompt. This prevents the owner
from accidentally deleting core instructions. Only the explicit "Full Override" replaces.

#### Rule 2: Inheritance Between Agents
When multiple agents share a brain (e.g., voice inherits from chat), changing shared fragments
(tone, rules, contextual info) must flow to all inheriting agents automatically. Only a
per-agent "Full Override" should break this chain — and the UI must **warn explicitly** when
this happens.

```
Assembly order for an inheriting agent (e.g. voice inherits from chat):

1. Primary agent's base prompt (chat custom override OR hardcoded default)
2. Inheriting agent's channel addendum (voice addendum OR default)
3. Primary agent's tone directive (if non-default)
4. Primary agent's additional rules (if set)
5. Primary agent's contextual info (if set)
6. Inheriting agent's channel-specific rules (if set)
7. Primary agent's escalation threshold

If inheriting agent's full_override is set → skip ALL above, use only that.
```

#### Rule 3: Model Parameters Are Separate from Prompt
Temperature, voice selection, max tokens — these are NOT injected into the prompt text. They're
returned alongside the assembled prompt as separate fields and passed to the AI API call directly.

```typescript
// API response shape for any config endpoint:
{
  system_prompt: string,       // The assembled text
  temperature: number,         // Model parameter
  voice?: string,              // Model parameter (voice agents)
  max_tokens?: number,         // Model parameter
  source: "assembled" | "full_override" | "fallback"
}
```

#### Rule 4: Graceful Fallback
If the database is unreachable, every route MUST fall back to hardcoded defaults. The system
**never fails silently** — it degrades to safe, pre-tested defaults. The `source` field in
the response tells the consumer what happened.

### 13.4 Database Pattern

Use a key-value table with a **prefix convention** per agent:

```
Table: {Project}_Store_Config
Partition key: config_key (string)

Key naming: agent_{agentName}_{fragmentType}

Examples:
  agent_chat_tone             → "casual"
  agent_chat_rules            → "- Never discuss competitors\n- Always mention free estimates"
  agent_chat_system_prompt    → ""  (empty = use default)
  agent_vision_conservatism   → "moderate"
  agent_voice_voice           → "alloy"
  agent_voice_temperature     → "0.8"
```

Each record also stores:
- `value` (string) — the fragment content
- `updated_at` (ISO timestamp) — when it was last changed
- `updated_by` (string, optional) — who changed it

The API route defines a `KNOWN_KEYS` constant with all valid keys and their defaults.
PUT requests are validated against this list — unknown keys are silently dropped.
GET requests merge DB values with defaults so every known key is always present in the response.

### 13.5 API Route Pattern

Three routes per system:

#### GET /api/agent-config
Returns all config entries merged with defaults. Every known key is always present.

```typescript
const KNOWN_KEYS = {
  agent_chat_system_prompt: "",
  agent_chat_tone: "casual",
  agent_chat_rules: "",
  // ... all keys with defaults
};

// On GET: scan DB for prefix "agent_", merge with KNOWN_KEYS
// On PUT: validate keys against KNOWN_KEYS, write each to DB with timestamp
```

#### PUT /api/agent-config
Batch-updates config entries. Body: `{ updates: { [key]: value } }`. Only known keys accepted.

#### GET /api/agent-config/{channel}
Assembles the final prompt for a specific channel using the inheritance + assembly rules above.
Returns `{ system_prompt, temperature, voice?, source }`.

**This is the critical route** — it's where the decomposed fragments become one prompt.

### 13.6 Prompt Assembly Implementation

```typescript
// Pseudocode — adapt per project

async function assemblePrompt(primaryPrefix: string, channelPrefix?: string) {
  const primary = await getConfigBatch(primaryPrefix);      // e.g. "agent_chat_"
  const channel = channelPrefix 
    ? await getConfigBatch(channelPrefix)                    // e.g. "agent_voice_"
    : {};

  // Full override escape hatch
  const fullOverride = channel[`${channelPrefix}system_prompt`]?.trim();
  if (fullOverride) return { prompt: fullOverride, source: "full_override" };

  // Assemble from fragments
  const parts: string[] = [];

  // 1. Base prompt
  parts.push(primary[`${primaryPrefix}system_prompt`]?.trim() || HARDCODED_DEFAULT);

  // 2. Channel addendum (if inheriting agent)
  if (channelPrefix) {
    parts.push(channel[`${channelPrefix}addendum`]?.trim() || DEFAULT_ADDENDUM);
  }

  // 3. Tone directive
  const tone = primary[`${primaryPrefix}tone`];
  if (tone && tone !== DEFAULT_TONE) {
    parts.push(`\nTONE: Speak in a ${tone} manner.`);
  }

  // 4. Additional rules (APPEND, don't replace)
  const rules = primary[`${primaryPrefix}rules`]?.trim();
  if (rules) parts.push(`\nADDITIONAL RULES:\n${rules}`);

  // 5. Contextual info (APPEND)
  const info = primary[`${primaryPrefix}special_info`]?.trim();
  if (info) parts.push(`\nCURRENT INFO:\n${info}`);

  // 6. Channel-specific rules (APPEND)
  if (channelPrefix) {
    const chRules = channel[`${channelPrefix}rules`]?.trim();
    if (chRules) parts.push(`\nCHANNEL RULES:\n${chRules}`);
  }

  // 7. Escalation threshold
  const threshold = primary[`${primaryPrefix}escalation_threshold`] || "500";
  parts.push(`\nESCALATION: Flag items/issues over $${threshold} for human review.`);

  return { prompt: parts.join("\n"), source: "assembled" };
}
```

### 13.7 Dashboard UI Pattern

The dashboard component follows this structure for **each agent**:

```
┌─────────────────────────────────────────────────────────┐
│  [Tab: Agent 1]  [Tab: Agent 2]  [Tab: Agent 3]  ...   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌ Info Banner ────────────────────────────────────┐    │
│  │ Explains what this agent does and how config    │    │
│  │ affects its behavior.                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Default Prompt Viewer (collapsible, read-only) ─┐    │
│  │ Shows the hardcoded default prompt so the owner │    │
│  │ understands the baseline. Badge: "Overridden"   │    │
│  │ if custom override is set.                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: Tone & Behavior ──────────────────────────┐    │
│  │  Tone:    [Casual] [Professional] [Friendly]    │    │
│  │  Length:  [Short]  [Medium]  [Detailed]          │    │
│  │  Greeting: [________________________]            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: Rules & Restrictions ─────────────────────┐    │
│  │  Additional rules: [monospace textarea]          │    │
│  │  Escalation threshold: [$________]               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: Contextual Info / Announcements ──────────┐    │
│  │  [monospace textarea — promotions, hours, etc]   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: ⚠️ Full Prompt Override (red border) ─────┐    │
│  │  WARNING: This replaces the entire base prompt.  │    │
│  │  [monospace textarea — expert only]              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Sticky Save Bar — appears when unsaved changes]       │
│  Unsaved changes (3 fields)  [Discard] [Save All]       │
└─────────────────────────────────────────────────────────┘
```

#### Required UI Behaviors
- **Sticky save bar** — only visible when edits exist; shows count of changed fields
- **Discard / Save All** — discard resets local state; save does batch PUT
- **Success/error feedback** — animated toast with timestamp on save
- **Character count** per textarea
- **"Overridden" badge** on the default prompt viewer when a custom override is set
- **Enum selectors as card grids** — not dropdowns; each option shows label + short description
- **Model parameter controls** — sliders for temperature, card grids for voice/model selection
- **Channel inheritance explanation** — for agents that inherit, show the assembly order clearly

### 13.8 How Channels Consume Config at Runtime

| Channel | When Config is Read | Latency of Changes |
|:---|:---|:---|
| Web Chat API | Every message (inline DB read) | **Instant** |
| Vision/Appraisal API | Every submission (inline DB read) | **Instant** |
| SMS Webhook | Every inbound message (inline DB read) | **Instant** |
| Voice Relay Server | HTTP fetch to `/api/agent-config/{channel}` with TTL cache | **Up to cache TTL** (recommend 5 min) |

Voice servers are typically separate processes — they can't read the DB directly. Instead,
they fetch the assembled prompt from the frontend API with a time-based cache. This means
voice config changes are slightly delayed but require **zero redeployment**.

### 13.9 Implementation Checklist

For every project built with this skill:

- [ ] **Define all agents** the system has (chat, voice, vision, SMS, etc.)
- [ ] **Identify shared vs. channel-specific fragments** — which agents inherit from which
- [ ] **Create the KNOWN_KEYS constant** with every config key and its default value
- [ ] **Database table** with `config_key` as partition key (DynamoDB, Postgres, etc.)
- [ ] **GET /api/agent-config** — returns all keys merged with defaults
- [ ] **PUT /api/agent-config** — batch update with known-key validation
- [ ] **GET /api/agent-config/{channel}** — per-channel prompt assembly endpoint
- [ ] **Prompt assembly function** — implements the fragment ordering + inheritance rules
- [ ] **Every API route reads config dynamically** — no hardcoded prompts in route handlers
- [ ] **Dashboard component** — tabbed UI with one tab per agent
- [ ] **Default prompt viewers** — collapsible read-only view with "Overridden" badge
- [ ] **Full Override with warning** — red-bordered expert card that explains the consequences
- [ ] **Auth gate** — dashboard behind authentication (owner/admin role only)
- [ ] **Fallback to defaults** — if DB read fails, use hardcoded defaults (never crash)

### 13.10 Design Principles

1. **Append, don't replace** — Custom rules and contextual info are layered ON TOP of defaults.
   Only the explicit Full Override replaces. This prevents owners from accidentally gutting
   critical base instructions.

2. **Inheritance flows down** — Secondary agents inherit primary agent config automatically.
   Changing tone on the primary agent changes it everywhere. Full Override on a secondary
   agent intentionally breaks this chain — and the UI must warn about it.

3. **Fragments are typed** — Enums get card grids, strings get textareas, numbers get inputs
   or sliders. Never give a freeform textarea for something that should be a constrained choice.

4. **Known-key validation** — The API only accepts predefined config keys. This prevents
   injection of arbitrary data and keeps frontend/backend in sync. Unknown keys are silently
   dropped, not errored — forward compatibility.

5. **Zero-config works** — The system must function perfectly with an empty database. Every
   key has a hardcoded default. The dashboard is for refinement, not bootstrapping.

6. **Source transparency** — Every prompt assembly response includes a `source` field
   (`assembled`, `full_override`, `fallback`) so consumers know what happened. This is
   invaluable for debugging.

---

## Appendix A: OpenAI Realtime API Audio Formats

| Format | Use Case |
|:-------|:---------|
| `g711_ulaw` | Twilio Media Streams (US telephony standard) |
| `g711_alaw` | European telephony |
| `pcm16` | Raw audio (browser-based WebRTC) |

Always match `input_audio_format` and `output_audio_format` to what your telephony
provider sends/expects. Twilio uses `g711_ulaw`.

## Appendix B: Fastify WebSocket Plugin Registration Pattern

The `@fastify/websocket` plugin requires WebSocket routes to be registered
inside an `async` plugin function:

```javascript
// ✅ CORRECT — register inside async plugin
fastify.register(async (app) => {
  app.get("/ws-path", { websocket: true }, async (socket, req) => {
    // handle WebSocket
  });
});

// ❌ WRONG — directly on fastify instance
fastify.get("/ws-path", { websocket: true }, handler);
```

## Appendix C: Twilio Media Stream Event Types

| Event | Direction | Meaning |
|:------|:----------|:--------|
| `start` | Twilio → Server | Stream started, contains `streamSid` |
| `media` | Twilio → Server | Audio chunk (base64 encoded g711_ulaw) |
| `mark` | Twilio → Server | Acknowledgement of a mark event you sent |
| `stop` | Twilio → Server | Stream ended (call hung up) |
| `media` | Server → Twilio | Audio to play to caller |
| `mark` | Server → Twilio | Insert a mark in the audio queue |
| `clear` | Server → Twilio | Clear queued audio (for barge-in) |

## Appendix D: Barge-In (Interruption) Logic

When the caller speaks while the AI is talking:

1. OpenAI sends `input_audio_buffer.speech_started`
2. Calculate elapsed audio time: `latestMediaTimestamp - responseStartTimestampTwilio`
3. Send `conversation.item.truncate` to OpenAI (stop generating audio)
4. Send `clear` event to Twilio (stop playing queued audio)
5. Reset mark queue and timestamp trackers

Without this, the AI will keep talking over the caller.

## Appendix E: Quick Diagnostic Commands

```powershell
# Check AWS identity
aws sts get-caller-identity

# Check Render health
Invoke-WebRequest -Uri "https://your-voice.onrender.com/" -UseBasicParsing

# Test WebSocket (from a folder with ws installed)
node -e "const W=require('ws');const w=new W('wss://your-voice.onrender.com/media-stream');w.on('open',()=>{console.log('OK');w.close()});w.on('unexpected-response',(r,s)=>console.log('FAIL',s.statusCode));w.on('error',e=>console.log('ERR',e.message));setTimeout(()=>process.exit(),8000)"

# Check Twilio webhook config (manual — go to Twilio Console)
# Phone Numbers > Active Numbers > [number] > Voice/Messaging sections

# Tail Render.com logs
# Dashboard > your service > Logs tab (or use Render CLI)
```

---

*Document generated: February 16, 2026*
*Verified against production deployment: USA Pawn Holdings*
*Architecture version: 1.0*
