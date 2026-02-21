# Realtime Voice Relay (Render.com)

This service bridges Twilio Media Streams to OpenAI Realtime API.

## Why this exists
- Twilio Voice Media Streams require a bidirectional WebSocket endpoint.
- The Next.js Twilio webhook now returns `<Connect><Stream>` to this relay.
- Relay handles low-latency audio in/out, barge-in interruption, and runtime prompt loading.

## Endpoints
- `GET /` → basic liveness check
- `GET /health/store-status` → checks frontend state API connectivity
- `GET /media-stream` (WebSocket) → Twilio stream bridge

## Environment Variables
- `OPENAI_API_KEY` (required)
- `PORT` (default `5050`)
- `VOICE` (default `alloy`)
- `OPENAI_REALTIME_MODEL` (default `gpt-4o-realtime-preview-2024-12-17`)
- `AGENT_CONFIG_PHONE_URL` (optional, full URL to shared phone config endpoint, e.g. `https://<frontend>/api/agent-config/phone`)
- `FRONTEND_URL` (optional fallback; relay will call `${FRONTEND_URL}/api/agent-config/phone` when `AGENT_CONFIG_PHONE_URL` is not set)
- `CHAT_LOGS_URL` (optional, full URL to transcript persistence endpoint; defaults to `${FRONTEND_URL}/api/chat-logs`)

The relay resolves runtime voice/prompt from the same phone config source used by web chat channel assembly so all channels follow one control source.

## Local run
```bash
cd backend/realtime_voice
npm install
npm start
```

## Render deployment settings
- Runtime: Node
- Root Directory: `backend/realtime_voice`
- Build Command: `npm install`
- Start Command: `node server.js`

## Twilio setup
Set your Twilio Voice webhook URL to your frontend endpoint:
- `POST https://<your-frontend-domain>/api/twilio-voice`

Set frontend environment variable:
- `VOICE_SERVER_URL=https://<your-render-service>.onrender.com`

The webhook converts that URL to `wss://.../media-stream` automatically.
