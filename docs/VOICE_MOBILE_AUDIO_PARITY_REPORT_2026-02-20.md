# Voice Mobile Audio Parity Report (USA Pawn vs Emperor Linda)
Date: 2026-02-20
Scope: Frontend architecture differences affecting mobile voice playback ("I can’t hear the AI voice")

## Executive Summary
USA Pawn and Emperor Linda use different frontend voice architectures.

- Emperor Linda (working on mobile): STT + /api/chat + /api/tts MP3 playback, with explicit mobile audio unlock handling and fallback paths.
- USA Pawn (failing on mobile): OpenAI Realtime WebRTC remote audio track, but no robust mobile autoplay-unlock/retry path in the frontend.

Primary issue in USA Pawn: remote audio is attached to an Audio element, but playback is not explicitly unlocked/retried on mobile when autoplay is blocked.

---

## Confirmed Architecture Differences

### 1) Audio transport model is different

Emperor Linda:
- Uses chat completion + separate TTS endpoint.
- API chat: targets/Project_POC/EmperorLindaCellPhoneRepairs/frontend/src/app/api/chat/route.ts (openai.chat.completions.create at line ~423)
- API TTS: targets/Project_POC/EmperorLindaCellPhoneRepairs/frontend/src/app/api/tts/route.ts (openai.audio.speech.create at line ~44, audio/mpeg response at line ~56)
- Frontend voice playback is explicit in VoiceChat.tsx with custom play/error handling.

USA Pawn:
- Uses OpenAI Realtime session + browser WebRTC.
- Session API: targets/Project_POC/USAPawnHoldings/frontend/src/app/api/realtime-session/route.ts (voice at ~185, output_audio_format at ~190, modalities at ~200)
- Frontend hook: targets/Project_POC/USAPawnHoldings/frontend/src/hooks/useVoiceChat.ts

Impact:
- Emperor Linda can recover from playback blocks by replaying MP3 or browser TTS.
- USA Pawn depends on WebRTC remote audio autoplay success and currently lacks equivalent mobile recovery logic.

### 2) Emperor Linda has explicit mobile audio-unlock logic; USA Pawn does not

Emperor Linda (present):
- unlockAudioPlayback() helper: VoiceChat.tsx (~195)
- sets playsinline: VoiceChat.tsx (~208 and ~352)
- handles audio.play() rejection and sets audioUnlockNeeded: VoiceChat.tsx (~375, ~378)
- global touch/click unlock listeners: VoiceChat.tsx (~409, ~410)
- visible user prompt when unlock is needed: VoiceChat.tsx (~939, ~1130)
- browser speech synthesis fallback: VoiceChat.tsx (~161, ~372, ~382, ~389)

USA Pawn (missing):
- Creates Audio() and sets autoplay only: useVoiceChat.ts (~789-790)
- Assigns srcObject on remote track but never explicitly calls play() with rejection handling: useVoiceChat.ts (~793-794)
- No audio unlock state/UI/retry in hook or overlay.

Impact:
- On iOS/Safari and some Android conditions, autoplay may be blocked, resulting in silent assistant audio even though the session appears connected.

### 3) USA Pawn can auto-start voice via URL effect (not always direct gesture)

- Auto-start path in ChatWidget.tsx uses query params heroMode=voice + heroOpen=1 and triggers void toggleVoiceMode():
  - requested params read: ~1078-1079
  - guard check: ~1081
  - auto-trigger: ~1091

Impact:
- If connect() is initiated from effect timing rather than a direct user gesture, mobile browsers are more likely to block audio playback.

### 4) USA Pawn reports connected before audio is proven audible

- setStatus('connected') is set optimistically in multiple places: useVoiceChat.ts (~870, ~883, ~888)

Impact:
- UI can show “connected / ready” while audio remains blocked, making debugging harder for users.

---

## Root Cause (Most Likely)
The USA Pawn frontend does not implement a mobile autoplay recovery pipeline for WebRTC remote audio.

Specifically:
1) No explicit play() attempt after setting srcObject with NotAllowedError handling
2) No one-tap unlock flow (touch/click listener + replay/retry)
3) Auto-connect path can run outside strict user-gesture timing

This combination is consistent with “voice works in one project but not the other on mobile.”

---

## Required Changes for USA Pawn (Dev Agent Checklist)

Priority order is intentional.

### P0 — Add mobile-safe audio unlock + retry in useVoiceChat
File: targets/Project_POC/USAPawnHoldings/frontend/src/hooks/useVoiceChat.ts

Implement:
- Add state/ref for audioUnlockNeeded (or equivalent) and expose it from hook.
- When creating Audio element:
  - set playsinline (attribute/property)
  - keep autoplay=true
- In pc.ontrack:
  - set srcObject
  - call audioEl.play() explicitly
  - catch play() rejection and flag audioUnlockNeeded=true
- Add unlock helper called from a user gesture:
  - attempt tiny silent play or replay current srcObject
  - on success, clear audioUnlockNeeded and resume

### P0 — Add user-visible unlock action in VoiceChatOverlay
File: targets/Project_POC/USAPawnHoldings/frontend/src/components/VoiceChatOverlay.tsx

Implement:
- If audioUnlockNeeded is true, show a clear CTA:
  - “Tap to enable voice audio” button
- Button triggers hook’s unlock/retry function
- Keep this visible while status is connected but audio is blocked

### P0 — Prevent automatic voice connect from effect on mobile
File: targets/Project_POC/USAPawnHoldings/frontend/src/components/ChatWidget.tsx

Implement:
- Do not call voice.connect() automatically from the heroMode URL effect on mobile.
- Instead, open the widget and show a “Tap to start voice” button.
- Only call connect() from that tap handler.

Note:
- The current effect-triggered path at ~1091 is a likely autoplay blocker.

### P1 — Tighten connection state semantics
File: targets/Project_POC/USAPawnHoldings/frontend/src/hooks/useVoiceChat.ts

Implement:
- Avoid optimistic setStatus('connected') before audio path is established.
- Optionally add “awaiting-audio-unlock” or equivalent status.
- Improve user messaging when connected but muted by browser policy.

### P1 — Optional fallback strategy
If acceptable for product UX:
- Add a fallback spoken acknowledgment using browser speechSynthesis only when WebRTC audio is blocked.
- This mirrors Emperor Linda’s resilience pattern and gives audible proof to user.

---

## “What to Tell the Emperor Linda Dev Agent”
Use Emperor Linda’s mobile-audio resilience pattern as the reference design for USA Pawn:
- Explicit playsinline + explicit play() handling
- Detect and surface autoplay block state
- One-tap unlock/replay path
- Fallback speech path when needed

Emperor Linda already has these guardrails; USA Pawn needs parity in its WebRTC frontend flow.

---

## Quick Verification Plan (after fixes)

1) iPhone Safari test
- Open USA Pawn voice mode from homepage.
- Confirm first AI response is audible without refresh.
- If blocked, tap unlock CTA once and confirm immediate audio.

2) Android Chrome test
- Repeat same flow.
- Confirm no silent “connected” state.

3) URL auto-open test
- Visit /?heroMode=voice&heroOpen=1 on mobile.
- Confirm app requires explicit tap before connect/play starts.

4) Regression check
- Desktop still auto-connects and remains audible.
- Voice transcript and tool calls still function.

---

## Bottom Line
USA Pawn’s mobile silence is a frontend audio-policy handling gap, not a model-quality issue.
The fastest fix is to port Emperor Linda’s mobile audio unlock/retry architecture into USA Pawn’s WebRTC voice hook + overlay + connect trigger behavior.
