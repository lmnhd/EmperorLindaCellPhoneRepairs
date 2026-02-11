# EmperorLinda "Chief of Staff" System
## Features & Specifications — Sales Package

**Codename**: LINDA (Lifestyle-Integrated Network Dispatch Assistant)  
**Target Client**: EmperorLinda Cell Phone Repairs — Jacksonville, FL  
**System Type**: AI-Powered Business Automation Platform  
**Status**: Production-Ready PoC

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Customer-Facing Features](#3-customer-facing-features)
4. [Owner Admin Dashboard](#4-owner-admin-dashboard-brandons-cockpit)
5. [AI Engine & Intelligence](#5-ai-engine--intelligence)
6. [Voice System](#6-voice-system)
7. [Booking & Scheduling Engine](#7-booking--scheduling-engine)
8. [Data & Storage](#8-data--storage)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Technology Stack](#10-technology-stack)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Design System](#12-design-system)
13. [Security & Compliance](#13-security--compliance)
14. [Sales Value Propositions](#14-sales-value-propositions)

---

## 1. Executive Summary

LINDA is a fully autonomous AI receptionist system that handles **100% of customer communications** — phone calls, SMS, and website chat — on behalf of a solo mobile repair shop owner. The system:

- **Answers phone calls** with a natural-sounding AI voice, powered by OpenAI TTS
- **Chats with website visitors** via an embedded widget on the landing page
- **Books real appointments** directly into the owner's schedule (DynamoDB)
- **Adapts behavior in real-time** based on the owner's current status (at the gym, at the shop, sleeping, etc.)
- **Upsells automatically** after each booking (screen protectors, cases)
- **Authorizes discounts** up to a configurable threshold without owner involvement
- **Logs every conversation** for the owner to review later

The owner controls everything from a single **admin dashboard** ("Brandon's Cockpit") — including toggling between 6 status modes, choosing the AI's name and voice, writing bulletins that the AI weaves into conversations, and reviewing all leads and chat transcripts in real time.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER TOUCHPOINTS                     │
│                                                             │
│   📱 Phone Call        💬 Website Chat      🖥️ Voice Demo   │
│   (Twilio Number)      (Landing Page)       (Browser Mic)   │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS API LAYER                        │
│                                                             │
│  /api/twilio-voice   /api/chat   /api/tts   /api/tts/stream│
│  /api/state          /api/leads  /api/chat-logs             │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────────┐
│   OpenAI     │  │  AWS         │  │  Twilio         │
│  GPT-5 Mini  │  │  DynamoDB    │  │  Programmable   │
│   TTS-1      │  │  (2 Tables)  │  │  Voice + SMS    │
└──────────────┘  └──────────────┘  └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS LAMBDA (Backup / SMS Pipeline)             │
│                                                             │
│   dispatcher.py    state_manager.py    scheduler.py         │
└─────────────────────────────────────────────────────────────┘
```

**Two parallel execution paths:**
- **Primary (Next.js on Vercel)**: Handles web chat, voice demo, phone call webhooks, TTS generation, admin dashboard, and all DynamoDB operations directly
- **Secondary (AWS Lambda)**: Standalone SMS/voice pipeline via Twilio webhooks through API Gateway — same DynamoDB tables, same OpenAI function schemas

---

## 3. Customer-Facing Features

### 3.1 Landing Page (`/`)

A premium, dark-themed customer landing page with:

| Element | Description |
|---------|-------------|
| **Hero Section** | "Your phone, fixed *while you wait.*" — animated fade-up entrance |
| **Call-to-Action** | Two buttons: "Call Now" (direct dial to Twilio number) and "Chat with AI" (scrolls to chat widget) |
| **Trust Indicators** | 4.9/5 star rating, "Same-day service", "90-day warranty" badges |
| **Services Grid** | 4 cards: Screen Repair (from $79, ~45 min), Battery Swap (from $49, ~30 min), Charging Port (from $59, ~40 min), Diagnostics (Free, ~15 min) |
| **Customer Reviews** | 3 testimonial cards with star ratings |
| **Embedded Chat Widget** | Full AI chat embedded on the right column of the hero — no popups or modals |
| **Navigation** | Links to Live Demo, Voice Demo, and Admin Dashboard |
| **Footer** | Business name, location (Jacksonville, FL), and navigation links |

### 3.2 Live Chat Demo (`/demo`)

A full-page, interactive AI chat playground for sales demonstrations:

| Feature | Description |
|---------|-------------|
| **Real-Time Status Switcher** | 4 preset buttons (At Shop, At Gym, On Break, Closed) that **change the AI's behavior mid-conversation** |
| **3 AI Persona Modes** | Professional, Laid Back, Hustler — each with distinct personality and language style |
| **Suggested Prompts** | 5 clickable starter messages for first-time users |
| **Session Management** | Unique session ID per demo — full conversation history maintained |
| **Live Booking Capability** | Bookings made in the demo create real leads in DynamoDB |

### 3.3 Voice Demo (`/voicedemo`)

A Google Maps-style business listing page with integrated voice calling:

| Feature | Description |
|---------|-------------|
| **Business Listing UI** | Map hero, verified business badge, 4.9/5 rating, hours, address — mimics Google Maps |
| **"Call" Button** | Initiates browser-based voice call using device microphone |
| **AI Persona Selector** | 3 options (Chill 😎, Professional 💼, Hustler 🔥) with descriptions |
| **Voice Override** | Uses the owner's preferred voice from dashboard settings |
| **Microphone Permission** | Graceful handling with error messaging if denied |
| **How It Works Section** | Explanatory panel with "Things to try" conversation starters |
| **Sample Reviews** | 3 customer testimonial cards |

### 3.4 Embedded Chat Widget (Component)

Reusable chat widget embedded on the landing page:

| Feature | Description |
|---------|-------------|
| **Auto-Greeting** | Immediate welcome message from the AI on load |
| **Real OpenAI Integration** | Every message goes through GPT-5 Mini with function calling |
| **Phone Fallback** | Header displays click-to-call phone number |
| **Session Persistence** | Unique session ID for the browser tab lifecycle |
| **Chat Log Persistence** | Every conversation saved to DynamoDB automatically |

---

## 4. Owner Admin Dashboard ("Brandon's Cockpit")

**Route**: `/dashboard`

A comprehensive single-page control center for the business owner.

### 4.1 Status Management

| Feature | Description |
|---------|-------------|
| **6 Status Modes** | Working (At the Shop), Gym, Driving/Out, On Break, After Hours, Custom |
| **Icon + Color Coding** | Each status has a unique icon, color, and default message |
| **Custom Notes** | Free-text field for what the AI tells customers about current availability |
| **Location Field** | Owner's current location (used by AI for context) |
| **Instant Save** | One-click save to DynamoDB with visual confirmation |
| **Status Persistence** | Status loaded from DynamoDB on page load — survives browser closes |

### 4.2 Assistant Identity (Name + Voice)

| Feature | Description |
|---------|-------------|
| **6 Assistant Names** | Linda (F), Keisha (F), Marcus (M), Darius (M), Devon (N), Alex (N) |
| **Gender-Locked Voices** | Female names → female voices only; Male names → male voices only; Neutral → all voices |
| **6 OpenAI TTS Voices** | Onyx (deep/male), Echo (smooth/male), Fable (warm/male), Nova (bright/female), Shimmer (clear/female), Alloy (balanced/neutral) |
| **Auto-Voice Switch** | Changing the name auto-selects the default voice for that gender |
| **Dynamic AI Identity** | The AI introduces itself by the selected name in all conversations |
| **Consistent Across Channels** | Same name and voice for phone calls, web chat, and voice demo |

### 4.3 AI Behavior Controls

| Toggle/Control | Description |
|----------------|-------------|
| **AI Answers Calls** | On/Off toggle — enables/disables AI phone answering |
| **AI Answers SMS** | On/Off toggle — enables/disables AI text message responses |
| **Auto-Upsell** | On/Off toggle — AI offers screen protectors/cases after booking |
| **Max Auto-Discount** | Slider: 0%–25% (in 5% increments) — AI can approve discounts up to this threshold without owner |

### 4.4 Owner Bulletin Board

| Feature | Description |
|---------|-------------|
| **Special Info Field** | Free-text area for owner to post announcements, deals, closures |
| **AI Integration** | The AI reads this bulletin and naturally weaves it into conversations when relevant |
| **Example Uses** | "Running a 20% off deal today", "Closed this Thursday for family event", "Just got new Samsung parts in stock" |

### 4.5 Real-Time Lead Feed

| Feature | Description |
|---------|-------------|
| **Auto-Refresh** | Polls DynamoDB every 15 seconds for new leads |
| **Lead Cards** | Each lead shows: Lead ID, status badge, device, repair type, phone, date, time |
| **Status Badges** | Color-coded: Booked (blue), Completed (green), Pending (gray) |
| **Stats Row** | 3 KPI cards: Today's Leads, Tomorrow's Bookings, Total Booked |
| **Scrollable Feed** | Max height 600px with overflow scroll for large lead volumes |

### 4.6 Chat Transcript Viewer

| Feature | Description |
|---------|-------------|
| **Slide-In Overlay** | Opens from the right side of the dashboard |
| **All Conversations** | Pulls every chat session from DynamoDB (web, voice, demo, phone) |
| **Source Tags** | Color-coded: Landing Page (blue), Voice Demo (purple), Live Demo (gold), Phone (gray) |
| **Expandable Sessions** | Click to expand and see full message-by-message transcript |
| **Message Count** | Shows total messages per session |
| **Timestamp Display** | "Today 2:30 PM", "Yesterday 11:00 AM", or "Feb 10 3:45 PM" |
| **Manual Refresh** | Refresh button to pull latest logs on demand |

---

## 5. AI Engine & Intelligence

### 5.1 Core Model

| Parameter | Value |
|-----------|-------|
| **Model** | OpenAI GPT-5 Mini |
| **Temperature** | Default (auto) |
| **Max Iterations** | 5 function-call loops per conversation turn |
| **Context Window** | 42 messages max, auto-trimmed (keeps system + last 40) |
| **Session TTL** | 30 minutes in-memory, then auto-cleared |

### 5.2 System Prompt Architecture

The AI's behavior is dynamically constructed from:

1. **Identity**: Assistant name from dashboard settings (default: "LINDA")
2. **Personality**: Selected persona (Professional, Laid Back, or Hustler)
3. **Owner Context**: Real-time status, location, and custom notes from DynamoDB
4. **Owner Bulletin**: Special info field injected as a context block
5. **Service Catalog**: Full pricing and repair types with "starting at" language
6. **Behavior Rules**: 9 explicit rules governing conversation flow
7. **Date Awareness**: Current date injected for scheduling context

### 5.3 AI Personas

| Persona | Tone | Example Response |
|---------|------|-----------------|
| **Professional** | Warm, confident, polished | "We'd love to help with that! Screen repairs start at $79 and typically take about 45 minutes. Shall I check our availability?" |
| **Laid Back** | Chill, neighborhood, slang | "Aye, cracked screen? Say less, we got you. Brandon does those in like 45 minutes, no cap." |
| **Hustler** | High-energy, urgency | "Listen, Brandon's one of the best in Jax. 90-day warranty on everything. You won't find that at those mall kiosks. Let's get you on the books." |

### 5.4 Context-Aware Behavior

| Owner Status | AI Behavior |
|-------------|-------------|
| **At the Shop** | "Walk-ins welcome, we're open now!" |
| **At the Gym** | Creates scarcity: "Spots are limited today, I'd lock one in now" |
| **Driving** | "He's on the move, will be back shortly" |
| **On Break** | "Quick break, back in 30 min — let me get you booked" |
| **After Hours** | "We're closed for today, opens tomorrow at 9 AM" |
| **Custom** | Uses whatever the owner typed in the notes field |

### 5.5 Function Calling (Tool Use)

The AI has 4 callable functions that execute real business operations:

| Function | Parameters | Action |
|----------|-----------|--------|
| `check_availability(date)` | Date (YYYY-MM-DD) | Queries DynamoDB for open time slots on that date. Returns list of available slots from the 9 AM–4 PM window |
| `book_slot(date, time, phone, repair_type, device)` | Appointment details | Creates a real booking record in DynamoDB with a unique lead ID. Marks the time slot as taken |
| `authorize_discount(discount_percent, reason, phone)` | Discount details | Auto-approves discounts at or below the dashboard threshold (default 15%). Escalates larger requests to the owner |
| `log_upsell(upsell_item, accepted, phone)` | Upsell result | Logs whether the customer accepted/declined upsell (screen protector $15, phone case $25, warranty extension) |

### 5.6 Conversation Flow (Designed Booking Funnel)

```
Customer message received
    │
    ├─ AI identifies device model + repair type
    │
    ├─ AI provides quote ("starting at $XX")
    │
    ├─ AI asks about service preference (walk-in, on-site, remote)
    │
    ├─ AI checks availability → calls check_availability()
    │
    ├─ AI offers available slots → customer confirms
    │
    ├─ AI books appointment → calls book_slot()
    │
    ├─ AI offers upsell (screen protector / case) → calls log_upsell()
    │
    └─ Conversation ends / continues naturally
```

---

## 6. Voice System

### 6.1 Phone Calls (Twilio Integration)

| Component | Detail |
|-----------|--------|
| **Provider** | Twilio Programmable Voice |
| **Webhook** | `POST /api/twilio-voice` |
| **Speech Recognition** | Twilio `<Gather>` with `input="speech"`, `speechTimeout="auto"`, `language="en-US"` |
| **TTS Engine** | OpenAI TTS-1 model via `/api/tts/stream` (GET endpoint for Twilio `<Play>`) |
| **Voice Selection** | Uses owner's preferred voice from DynamoDB state |
| **Fallback** | Amazon Polly (Polly.Matthew) if OpenAI TTS fails |
| **Speed** | 1.05x (slightly faster for natural conversation feel) |
| **Session Tracking** | Uses Twilio `CallSid` as session identifier |

**Phone Call Flow:**
```
Customer dials Twilio number
    │
    ├─ Twilio POST → /api/twilio-voice (no SpeechResult)
    │     ├─ Fetch owner's preferred voice from DynamoDB
    │     ├─ Generate greeting via /api/chat
    │     ├─ Generate TTS audio URL via /api/tts/stream
    │     └─ Return TwiML: <Play> greeting + <Gather> for speech
    │
    ├─ Customer speaks → Twilio transcribes
    │
    ├─ Twilio POST → /api/twilio-voice (with SpeechResult)
    │     ├─ Send transcript to /api/chat for AI response
    │     ├─ Generate TTS audio for response
    │     └─ Return TwiML: <Play> response + <Gather> for next turn
    │
    └─ Loop continues until caller hangs up
```

### 6.2 Web Voice Demo (Browser-Based)

| Component | Detail |
|-----------|--------|
| **Speech Recognition** | Web Speech API (`webkitSpeechRecognition`) |
| **TTS Playback** | OpenAI TTS-1 → MP3 → HTML5 `<Audio>` playback |
| **Voice Selection** | Owner's dashboard preference OR persona-based default |
| **Visual Feedback** | 24-bar animated waveform: distinct patterns for AI speaking, user listening, processing, and idle states |
| **Call UI** | Full phone-call interface: call timer, mute/speaker toggles, transcript display, end-call button |
| **Persona Mapping** | Laid Back → Onyx, Professional → Nova, Hustler → Echo (overridden by dashboard voice setting) |

### 6.3 TTS Endpoints

| Endpoint | Method | Use Case |
|----------|--------|----------|
| `/api/tts` | POST | Web voice demo — returns MP3 audio buffer |
| `/api/tts/stream` | GET | Phone calls — Twilio `<Play>` fetches audio by URL |

Both use OpenAI TTS-1 at 1.05x speed for natural conversation pacing.

---

## 7. Booking & Scheduling Engine

### 7.1 Appointment Slot System

| Parameter | Value |
|-----------|-------|
| **Available Slots** | 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM, 4:00 PM |
| **Slot Duration** | 1 hour each (8 slots per day) |
| **Collision Prevention** | Checks existing bookings on the date before confirming |
| **Lead ID Format** | `LEAD-{YYYYMMDDHHMMSS}-{random6}` |

### 7.2 Service Types

| Service | Starting Price | Estimated Time |
|---------|---------------|----------------|
| Screen Replacement (iPhone) | $79 | ~45 min |
| Screen Replacement (Samsung) | $89 | ~45 min |
| Battery Replacement | $49 | ~30 min |
| Charging Port Repair | $59 | ~40 min |
| Water Damage Assessment | $39 diagnostic fee | Varies |
| Back Glass Replacement | $69 | ~45 min |
| On-Site Repair Surcharge | +$20 | — |
| Remote Diagnostic | Free | ~15 min |

### 7.3 Service Delivery Modes

| Mode | Description |
|------|-------------|
| **Walk-In** | Customer comes to the shop |
| **On-Site** | Brandon travels to customer (+$20 fee) |
| **Remote** | Diagnostic/consultation via phone or video (free) |

### 7.4 Post-Booking Upsells

| Item | Price | AI Behavior |
|------|-------|-------------|
| Screen Protector | $15 | Offered after every screen repair booking |
| Phone Case | $25 | Offered after booking |
| Warranty Extension | TBD | Tracked but not priced |

### 7.5 Discount Authorization

| Range | Action |
|-------|--------|
| 0%–15% (configurable) | Auto-approved by AI |
| >15% | AI tells customer "Brandon will follow up personally" |
| Dashboard slider | Owner sets max auto-discount threshold (0%–25% in 5% steps) |

---

## 8. Data & Storage

### 8.1 DynamoDB Tables

**Table 1: `Repairs_Lead_Log`**

| Attribute | Type | Description |
|-----------|------|-------------|
| `lead_id` (PK) | String | Unique lead identifier (`LEAD-...` or `CHATLOG-...`) |
| `timestamp` (SK) | Number | Unix epoch timestamp |
| `phone` | String | Customer phone number |
| `repair_type` | String | `screen`, `battery`, `charging_port`, `water_damage`, `back_glass`, `other` |
| `device` | String | Device model (e.g., "iPhone 15 Pro") |
| `appointment_date` | String | YYYY-MM-DD |
| `appointment_time` | String | e.g., "2:00 PM" |
| `status` | String | `booked`, `completed`, `pending` |
| `created_at` | Number | Unix epoch |

Chat logs are co-located in this table with `CHATLOG-{sessionId}` as the partition key and a fixed sort key of `0`:

| Attribute | Type | Description |
|-----------|------|-------------|
| `session_id` | String | Unique session identifier |
| `source` | String | `web-chat`, `voice-demo`, `demo`, or phone number |
| `messages` | List | Array of `{role, content, timestamp}` objects |
| `message_count` | Number | Total messages in session |
| `last_updated` | Number | Unix epoch of last message |
| `status` | String | `active` or `completed` |

**Table 2: `Brandon_State_Log`**

Single-row table (PK: `state_id = 'CURRENT'`):

| Attribute | Type | Description |
|-----------|------|-------------|
| `state_id` (PK) | String | Always `"CURRENT"` — single-row design |
| `status` | String | `working`, `gym`, `driving`, `break`, `sleeping`, `custom` |
| `location` | String | Current location text |
| `notes` | String | What the AI tells customers |
| `special_info` | String | Owner bulletin board content |
| `voice` | String | TTS voice name (`onyx`, `nova`, etc.) |
| `assistant_name` | String | AI's name (`Linda`, `Marcus`, etc.) |
| `greeting` | String | Custom greeting text |
| `max_discount` | Number | Maximum auto-approved discount percentage |
| `ai_answers_calls` | Boolean | Whether AI handles phone calls |
| `ai_answers_sms` | Boolean | Whether AI handles SMS |
| `auto_upsell` | Boolean | Whether AI offers upsells after booking |
| `updated_at` | Number | Unix epoch of last update |

### 8.2 Data Flow Patterns

| Action | Source → Storage |
|--------|-----------------|
| Customer books via chat | Chat API → `createLead()` → Repairs_Lead_Log |
| Customer books via phone | Twilio Voice → Chat API → `createLead()` → Repairs_Lead_Log |
| Chat conversation saved | Chat API → `saveChatLog()` → Repairs_Lead_Log (CHATLOG- prefix) |
| Owner updates status | Dashboard → State API → Brandon_State_Log |
| AI reads owner state | Chat API → `getBrandonState()` → Brandon_State_Log |
| Dashboard loads leads | Dashboard → Leads API → `getAllLeads()` → Repairs_Lead_Log |

---

## 9. API Endpoints Reference

### Next.js API Routes (Primary)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Core AI conversation endpoint (GPT-5 Mini). Accepts message, sessionId, phone, persona, and status overrides. Returns AI reply with function calling |
| `/api/state` | GET | Fetch owner's current state from DynamoDB |
| `/api/state` | POST | Update owner's state (status, location, notes, voice, name, all config) |
| `/api/leads` | GET | Retrieve all bookings from DynamoDB (newest first, deduplicated) |
| `/api/chat-logs` | GET | Retrieve all chat conversation logs (sorted by most recent) |
| `/api/tts` | POST | Generate OpenAI TTS audio (MP3) — used by web voice demo |
| `/api/tts/stream` | GET | Generate OpenAI TTS audio via URL params — used by Twilio `<Play>` |
| `/api/twilio-voice` | POST | Twilio voice webhook — handles initial call and speech result turns |
| `/api/twilio-voice` | GET | Health check / webhook validation |

### AWS Lambda Functions (Secondary — SMS Pipeline)

| Function | Trigger | Description |
|----------|---------|-------------|
| `dispatcher.py` | Twilio SMS Webhook → API Gateway | Receives customer SMS, fetches owner state, routes to OpenAI with function calling, returns TwiML response |
| `scheduler.py` | API Gateway (GET/POST) | GET: Check slot availability for a date. POST: Create a new booking with collision detection |
| `state_manager.py` | API Gateway (GET/POST/PUT/DELETE) | Full CRUD for owner state. DELETE resets to defaults |

---

## 10. Technology Stack

### Frontend

| Technology | Version/Detail | Purpose |
|------------|---------------|---------|
| **Next.js** | 16.1.6 (Turbopack) | React framework, server-side rendering, API routes |
| **React** | Latest | UI component library |
| **TypeScript** | Strict mode | Type-safe frontend code |
| **Tailwind CSS** | Latest | Utility-first styling |
| **Lucide React** | Latest | Icon library (40+ icons used) |
| **AWS SDK v3** | `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` | Direct DynamoDB access from API routes |
| **OpenAI SDK** | Latest | GPT-5 Mini chat completions + TTS-1 audio generation |
| **Web Speech API** | Browser native | Speech recognition in voice demo |

### Backend

| Technology | Detail | Purpose |
|------------|--------|---------|
| **Python 3.x** | Lambda runtime | Serverless function handlers |
| **boto3** | AWS SDK for Python | DynamoDB operations |
| **OpenAI Python SDK** | Latest | AI conversation pipeline |
| **Twilio Python SDK** | `twilio` package | TwiML response generation |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **AWS DynamoDB** | NoSQL database (2 tables, PAY_PER_REQUEST billing) |
| **AWS Lambda** | Serverless compute for SMS pipeline |
| **AWS API Gateway** | HTTP endpoints for Lambda functions |
| **AWS IAM** | Role-based access control |
| **Vercel** | Frontend hosting (Next.js optimized) |
| **Twilio** | Phone number, SMS, Programmable Voice |
| **OpenAI** | GPT-5 Mini (chat, $0.25/$2.00 per 1M tokens), TTS-1 (voice synthesis) |

---

## 11. Deployment & Infrastructure

### Frontend Deployment (Vercel)

| Parameter | Value |
|-----------|-------|
| **Platform** | Vercel |
| **Framework** | Next.js (auto-detected) |
| **Build Command** | `npm run build` |
| **Environment Variables** | `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `REPAIRS_LEAD_LOG_TABLE`, `BRANDON_STATE_LOG_TABLE`, `NEXT_PUBLIC_TWILIO_PHONE` |

### Backend Deployment (AWS)

| Component | Deployment Method |
|-----------|------------------|
| **DynamoDB Tables** | `backend/scripts/create_tables.py` (one-time setup) |
| **Lambda Functions** | AWS CLI / SAM / Console upload |
| **API Gateway** | HTTP API linked to Lambda functions |

### Twilio Configuration

| Setting | Value |
|---------|-------|
| **TwiML App** | Voice Request URL → `https://{vercel-domain}/api/twilio-voice` |
| **Phone Number** | Local Jacksonville area code |
| **Voice Webhook** | Points to TwiML App |

---

## 12. Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `emperor-gold` | `#D4A843` | Primary brand color, CTAs, highlights |
| `emperor-gold-light` | `#E8C96A` | Hover states |
| `emperor-gold-dark` | `#B88A2D` | Active states |
| `emperor-black` | `#0A0A0A` | Page background |
| `emperor-charcoal` | `#1A1A1E` | Card backgrounds |
| `emperor-slate` | `#2A2A30` | Input backgrounds |
| `emperor-cream` | `#F5F0E8` | Primary text |
| `accent-emerald` | `#2DD4A0` | Success, active, available |
| `accent-red` | `#EF4444` | Errors, map pin |
| `accent-amber` | `#F59E0B` | Warnings, break status |
| `accent-blue` | `#3B82F6` | Links, booked status, call buttons |

### Typography

| Font | Family | Usage |
|------|--------|-------|
| **Playfair Display** | Serif | Headlines, brand text, section titles |
| **DM Sans** | Sans-serif | Body text, UI elements |
| **JetBrains Mono** | Monospace | Lead IDs, badges, technical labels, timestamps |

### Component Library

| Component | CSS Class | Description |
|-----------|-----------|-------------|
| Glass Panel | `.glass-panel` | Frosted glass card with gold border + backdrop blur |
| Glass Panel Light | `.glass-panel-light` | Lighter variant with white tint |
| Primary Button | `.btn-emperor` | Gold background, black text, gold shadow |
| Ghost Button | `.btn-ghost` | Gold border, transparent background |
| Input Field | `.input-emperor` | Dark slate input with gold focus ring |
| Dot Pattern | `.dot-pattern` | Subtle gold dot grid texture overlay |

### Animations

| Animation | Description |
|-----------|-------------|
| `fade-up` | 0.8s ease-out entrance with 24px translate |
| `fade-in` | 0.6s opacity entrance |
| `slide-in-right` | 0.5s slide from right |
| `pulse-gold` | 2s gold glow pulse (infinite) |
| `glow` | 2s alternating gold shadow glow |
| `float` | 6s gentle vertical float |

---

## 13. Security & Compliance

| Concern | Implementation |
|---------|---------------|
| **API Keys** | Server-side only — `OPENAI_API_KEY` never exposed to browser |
| **Environment Variables** | Stored in `.env.local` (gitignored) / Vercel dashboard |
| **CORS** | Lambda responses include proper CORS headers |
| **Input Validation** | All API routes validate required fields |
| **Error Handling** | Graceful fallbacks — Polly TTS if OpenAI fails, default state if DynamoDB fails |
| **DynamoDB Access** | IAM role-based access with minimum required permissions |
| **No PII Storage** | Phone numbers stored but no names/addresses beyond what customer provides |
| **Credential Files** | `.env`, `.env.local`, AWS credentials all in `.gitignore` |

---

## 14. Sales Value Propositions

### For the Target Client (Brandon)

| Pain Point | LINDA Solution |
|-----------|----------------|
| "I miss calls when I'm at the gym" | AI answers every call 24/7 with context-aware responses — tells customers you're at the gym and creates urgency |
| "I lose leads when I can't respond fast enough" | AI responds instantly to website chat, phone calls, and SMS — never misses a lead |
| "I don't have a receptionist" | LINDA is your AI Chief of Staff — books appointments, quotes prices, handles objections |
| "I forget to upsell" | AI automatically offers screen protectors and cases after every booking |
| "I need to know what's happening when I'm away" | Dashboard shows real-time lead feed, chat transcripts, and booking stats |
| "I want to offer discounts but within limits" | Set your max discount threshold — AI auto-approves small discounts, escalates big ones |
| "I need a professional web presence" | Premium landing page with embedded chat and click-to-call |

### ROI Highlights

| Metric | Before LINDA | With LINDA |
|--------|-------------|------------|
| Missed calls during gym/breaks | ~40% of calls | 0% — AI answers all |
| Average lead response time | 15–60 min | < 3 seconds |
| After-hours lead capture | None | 24/7 automated |
| Upsell rate | Inconsistent/forgotten | 100% of bookings offered |
| Monthly receptionist cost | $2,000–3,000 | Fraction of cost |

### Competitive Differentiation

| Feature | Generic Chatbot | LINDA |
|---------|----------------|-------|
| Context-aware behavior | ❌ | ✅ Adapts to owner's real-time status |
| Real phone call handling | ❌ | ✅ Full voice conversation with natural TTS |
| Owner personality control | ❌ | ✅ Choose AI name, voice, persona, bulletin |
| Real booking system | ❌ | ✅ Creates real appointments in DynamoDB |
| Discount authorization | ❌ | ✅ Auto-approves within configurable threshold |
| Chat transcript archive | ❌ | ✅ Every conversation logged and reviewable |
| Multi-channel consistency | ❌ | ✅ Same AI, same voice across phone/web/SMS |

---

*Document generated from live production codebase — all features described are implemented and functional.*
