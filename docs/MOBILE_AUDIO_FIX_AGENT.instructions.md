# Emperor Linda Voice Parity Instructions (Mirror USA Pawn)

## Objective
Make Emperor Linda browser voice chat use the same Realtime WebRTC voice architecture as USA Pawn.

Critical intent:
- Do not modify USA Pawn.
- Implement parity inside Emperor Linda only.
- Final behavior should match USA Pawn voice flow when talking in browser on mobile/desktop.

## Source of Truth (Reference Implementation)
Mirror these USA Pawn files/patterns into Emperor Linda equivalents:
- `targets/Project_POC/USAPawnHoldings/frontend/src/hooks/useVoiceChat.ts`
- `targets/Project_POC/USAPawnHoldings/frontend/src/app/api/realtime-session/route.ts`
- `targets/Project_POC/USAPawnHoldings/frontend/src/components/VoiceChatOverlay.tsx`
- voice entry/toggle pattern in `targets/Project_POC/USAPawnHoldings/frontend/src/components/ChatWidget.tsx`

## Emperor Linda Target Scope
Primary files to create/update in Emperor Linda:
- `targets/Project_POC/EmperorLindaCellPhoneRepairs/frontend/src/hooks/useVoiceChat.ts` (new)
- `targets/Project_POC/EmperorLindaCellPhoneRepairs/frontend/src/app/api/realtime-session/route.ts` (new)
- `targets/Project_POC/EmperorLindaCellPhoneRepairs/frontend/src/components/VoiceChat.tsx` (refactor to Realtime hook integration)
- Any local parent component that starts voice mode (if needed)

Keep these legacy paths untouched unless required by compile/runtime:
- `frontend/src/app/api/chat/route.ts`
- `frontend/src/app/api/tts/route.ts`

They can remain for non-browser channels/fallback compatibility.

## Required Implementation Work

### 1) Replace Emperor Linda browser voice transport
Current Emperor Linda browser flow is Web Speech STT + `/api/chat` + `/api/tts` playback.

Replace browser voice mode with USA Pawn-style flow:
1. `POST /api/realtime-session` for ephemeral token
2. Browser mic capture via `getUserMedia`
3. `RTCPeerConnection` SDP offer/answer to OpenAI Realtime endpoint
4. Data channel event handling for transcript/speaking state
5. Remote audio track playback via `<audio>` element

### 2) Add Emperor Linda realtime session endpoint
Create `frontend/src/app/api/realtime-session/route.ts` using USA Pawn structure:
- Calls `https://api.openai.com/v1/realtime/sessions`
- Returns `client_secret`
- Sets model/voice/modalities/audio config for browser voice session
- Includes Emperor Linda system instructions (not USA Pawn business text)

### 3) Refactor VoiceChat UI to consume hook state
In Emperor Linda `VoiceChat.tsx`:
- Remove dependency on browser `SpeechRecognition` loop for primary voice mode
- Remove dependency on `/api/tts` for primary playback path
- Bind UI state to Realtime hook:
  - connection status
  - assistant speaking state
  - user speaking/listening state
  - transcript stream
- Preserve current Emperor Linda visual design (no redesign)

### 4) Ensure start/connect is user-gesture driven on mobile
Voice connect must be initiated by a tap/click action in Emperor Linda UI.

No effect-only auto-connect path on mobile for initial voice start.

### 5) Preserve existing business/channel behavior
- Keep Emperor Linda persona/brand messaging
- Keep existing non-browser phone/SMS routes unchanged
- Do not import USA Pawn inventory/tool business logic into Emperor Linda

## Non-Goals
- Do not edit any files in `targets/Project_POC/USAPawnHoldings/`
- Do not rewrite dashboard, Twilio, or unrelated features
- Do not add new dependencies unless strictly required

## Acceptance Criteria
1. Emperor Linda mobile browser (iPhone Safari + Android Chrome):
  - Start voice chat by tapping voice control
  - AI audio is audible
  - User speech is transcribed and assistant replies in voice
2. Emperor Linda desktop browser:
  - Voice session connects and behaves like USA Pawn realtime flow
3. No USA Pawn file changes
4. Emperor Linda app builds without TypeScript/runtime errors from the migration

## Delivery Checklist for Agent
- [ ] Realtime hook added in Emperor Linda
- [ ] `/api/realtime-session` added in Emperor Linda
- [ ] `VoiceChat.tsx` migrated to hook-based realtime flow
- [ ] Mobile start path is user gesture initiated
- [ ] Verified on mobile and desktop
