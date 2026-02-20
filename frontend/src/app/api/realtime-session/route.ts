import { NextResponse } from 'next/server'
import { getBrandonState } from '@/lib/dynamodb'
import { assembleAgentChannelConfig } from '@/lib/agentConfig'

/* ──────────────────────────────────────────────────────
   POST /api/realtime-session

   Issues an ephemeral OpenAI Realtime API client_secret
   for browser-based WebRTC voice chat. The browser uses
   this token to negotiate a WebRTC connection directly
   with OpenAI — no Twilio relay needed for the web demo.

   Session is pre-configured with:
   - LINDA's assembled phone prompt (from DynamoDB state)
   - Server VAD turn detection
   - Whisper transcription
   ────────────────────────────────────────────────────── */

const BROWSER_VOICE_ADDENDUM = `

BROWSER VOICE CHAT INSTRUCTIONS:
- The user is speaking through their browser microphone — this is the in-app demo experience.
- Keep EVERY response SHORT: 1-2 sentences maximum.
- Be warm, natural, and conversational — this is a phone-style interaction.
- If you cannot resolve something directly, collect their name and phone number and let them know a technician will follow up.
- Do NOT read out long lists or menus. Offer one clear option at a time.

GREETING (use this exact text on your first turn):
"Hey, you've reached EmperorLinda Repairs — I'm LINDA, your AI assistant. What can I help you fix today?"`

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  try {
    const state = await getBrandonState()
    const assembled = assembleAgentChannelConfig(state, 'phone')

    const systemPrompt = assembled.systemPrompt + BROWSER_VOICE_ADDENDUM

    const openAiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: assembled.voice ?? 'alloy',
        instructions: systemPrompt,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
        },
        modalities: ['text', 'audio'],
        temperature: assembled.temperature ?? 0.7,
      }),
    })

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text()
      console.error('OpenAI realtime session creation failed:', openAiResponse.status, errorText)
      return NextResponse.json(
        { error: 'Failed to create voice session', detail: errorText },
        { status: openAiResponse.status },
      )
    }

    const session = await openAiResponse.json()

    return NextResponse.json({
      client_secret: session.client_secret?.value,
      session_id: session.id,
      expires_at: session.client_secret?.expires_at,
    })
  } catch (err) {
    console.error('[realtime-session] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
