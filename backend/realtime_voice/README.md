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
- `FRONTEND_URL` (optional, used to fetch runtime state from `/api/state`)

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
